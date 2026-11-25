-- -----------------------------------------------------------------------------
-- 003_people.sql: people, and who is on which todo.
--
--   lab.people           everyone in the lab who can be given a todo
--   lab.todo_assignees   todo <-> person, so a todo can have several people
--
-- The free-text todos.owner from before is read once to fill these in
-- ("Ahmad & Ioana" becomes two people on one todo). The column itself is left
-- in place, untouched, so nothing is lost; the page no longer reads or writes
-- it and it can be dropped once nobody misses it.
--
-- Additive only, one transaction, safe to run again.
--
--   psql -h 192.168.137.1 -U postgres -f db/003_people.sql
-- -----------------------------------------------------------------------------

\set ON_ERROR_STOP on
begin;

create table if not exists lab.people (
  id          bigint generated always as identity primary key,
  name        text        not null check (length(btrim(name)) between 1 and 60),
  color       text        not null default '#4f7d93' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- one "Ahmad", whatever the capitals: names are what people say to assign
create unique index if not exists people_name_unique on lab.people (lower(btrim(name)));

drop trigger if exists people_touch on lab.people;
create trigger people_touch before update on lab.people
  for each row execute function lab.touch_updated_at();

create table if not exists lab.todo_assignees (
  todo_id    bigint not null references lab.todos(id)  on delete cascade,
  person_id  bigint not null references lab.people(id) on delete cascade,
  primary key (todo_id, person_id)
);
create index if not exists todo_assignees_person_idx on lab.todo_assignees (person_id);

-- people from the old owner text -----------------------------------------------
-- split on "&", ",", "/", "+" and " and "; colours go round the site palette
with names as (
  select distinct btrim(n) as name
  from lab.todos t,
       regexp_split_to_table(t.owner, '\s*(&|,|/|\+|\sand\s)\s*') as n
  where btrim(t.owner) <> '' and btrim(n) <> ''
),
fresh as (
  select name, row_number() over (order by name) as i
  from names
  where not exists (select 1 from lab.people p where lower(p.name) = lower(names.name))
)
insert into lab.people (name, color)
select name, (array['#4f7d93','#b4547e','#8a5aa0','#5e8a6a','#c9822f','#a8432d','#5d5346'])
             [1 + ((i - 1 + (select count(*) from lab.people)) % 7)]
from fresh;

insert into lab.todo_assignees (todo_id, person_id)
select distinct t.id, p.id
from lab.todos t,
     regexp_split_to_table(t.owner, '\s*(&|,|/|\+|\sand\s)\s*') as n
join lab.people p on lower(p.name) = lower(btrim(n))
where btrim(t.owner) <> ''
on conflict do nothing;

comment on column lab.todos.owner is
  'Old free-text owner, kept only as a record. Use lab.todo_assignees.';

-- access for the page ------------------------------------------------------------
grant select, insert, update, delete on lab.people, lab.todo_assignees to web_anon;

commit;

notify pgrst, 'reload schema';
