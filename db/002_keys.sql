-- -----------------------------------------------------------------------------
-- 002_keys.sql: short, speakable identifiers.
--
--   project   a key of 2-6 letters          LAB
--   todo      project key, dash, a number   LAB-3
--
-- Letters only in the key so "LAB-3" can't be misheard as "LAB3-..." when read
-- aloud. Todo numbers count up per project and are never reused, so a number
-- said once always means the same todo, even after others are deleted.
-- Renaming a project's key renames all its todos with it: a todo's key is not
-- stored, it is worked out on request (PostgREST: select=*,key, or filter
-- ?key=eq.LAB-3).
--
-- Additive only: adds columns, fills them in, adds triggers. Existing rows keep
-- every value they had, including updated_at. Safe to run again.
--
--   psql -h 192.168.137.1 -U postgres -f db/002_keys.sql
-- -----------------------------------------------------------------------------

\set ON_ERROR_STOP on
begin;

-- don't let the backfill below count as an edit
alter table lab.projects disable trigger projects_touch;
alter table lab.todos    disable trigger todos_touch;

-- project keys ----------------------------------------------------------------

/** A free key for a project name: first three letters of the first word, else
    the initials, else four or five letters, else two letters and A..Z. */
create or replace function lab.suggest_key(name text, self bigint default null) returns text
language plpgsql volatile as $$
declare
  w text[];
  initials text := '';
  cand text;
  i int;
begin
  select array_agg(x) into w
  from unnest(regexp_split_to_array(upper(regexp_replace(coalesce(name, ''), '[^A-Za-z]+', ' ', 'g')), ' ')) x
  where x <> '';
  if w is null then w := array['PRJ']; end if;
  if length(w[1]) < 2 then w[1] := rpad(w[1], 2, 'X'); end if;   -- pad only, never cut
  select string_agg(left(x, 1), '') into initials from unnest(w) x;

  foreach cand in array array[left(w[1], 3), left(initials, 4), left(w[1], 4), left(w[1], 5), left(w[1], 6)] loop
    if length(cand) >= 2 and not exists (select 1 from lab.projects where key = cand and id is distinct from self) then
      return cand;
    end if;
  end loop;
  for i in 0..25 loop
    cand := left(w[1], 2) || chr(65 + i);
    if not exists (select 1 from lab.projects where key = cand and id is distinct from self) then
      return cand;
    end if;
  end loop;
  raise exception 'no free key for project "%"', name;
end $$;

alter table lab.projects add column if not exists key text;

do $$
declare r record;
begin
  for r in select id, name from lab.projects where key is null order by position, id loop
    update lab.projects set key = lab.suggest_key(r.name, r.id) where id = r.id;
  end loop;
end $$;

alter table lab.projects alter column key set not null;
alter table lab.projects drop constraint if exists projects_key_format;
alter table lab.projects add constraint projects_key_format check (key ~ '^[A-Z]{2,6}$');
create unique index if not exists projects_key_unique on lab.projects (key);

/** New projects get a key if none was given; keys are always stored upper case. */
create or replace function lab.project_key() returns trigger
language plpgsql as $$
begin
  if new.key is null or btrim(new.key) = '' then
    new.key := lab.suggest_key(new.name, new.id);
  else
    new.key := upper(btrim(new.key));
  end if;
  return new;
end $$;

drop trigger if exists projects_key on lab.projects;
create trigger projects_key before insert or update of key on lab.projects
  for each row execute function lab.project_key();

-- todo numbers ----------------------------------------------------------------

alter table lab.projects add column if not exists next_todo integer not null default 1;
alter table lab.todos    add column if not exists number integer;

-- existing todos are numbered per project in the order they were made
update lab.todos t set number = s.n
from (
  select id, row_number() over (partition by project_id order by created_at, id) as n
  from lab.todos
) s
where t.id = s.id and t.number is null;

update lab.projects p
set next_todo = greatest(p.next_todo, coalesce((select max(number) from lab.todos where project_id = p.id), 0) + 1);

alter table lab.todos alter column number set not null;
create unique index if not exists todos_project_number_unique on lab.todos (project_id, number);

/** Give a new todo the project's next number. A todo keeps its number for life. */
create or replace function lab.number_todo() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.project_id is distinct from old.project_id then
    update lab.projects set next_todo = next_todo + 1
    where id = new.project_id
    returning next_todo - 1 into new.number;
  else
    new.number := old.number;
  end if;
  return new;
end $$;

drop trigger if exists todos_number on lab.todos;
create trigger todos_number before insert or update on lab.todos
  for each row execute function lab.number_todo();

-- Taking a number bumps the project's counter, which is not an edit of the
-- project. Only touch updated_at when something people see has changed.
create or replace function lab.touch_updated_at() returns trigger
language plpgsql as $$
begin
  if to_jsonb(new) - 'updated_at' - 'next_todo' is distinct from to_jsonb(old) - 'updated_at' - 'next_todo' then
    new.updated_at := now();
  end if;
  return new;
end $$;

/** "LAB-3". PostgREST exposes this as a computed column: select=*,key */
create or replace function lab.key(lab.todos) returns text
language sql stable as $$
  select p.key || '-' || $1.number from lab.projects p where p.id = $1.project_id
$$;

grant execute on function lab.key(lab.todos) to web_anon;

alter table lab.projects enable trigger projects_touch;
alter table lab.todos    enable trigger todos_touch;

commit;

notify pgrst, 'reload schema';
