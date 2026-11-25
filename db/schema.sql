-- -----------------------------------------------------------------------------
-- schema.sql: the lab's project dashboard. Projects, each with its todos.
--
-- The browser cannot speak the Postgres wire protocol, so the page talks to
-- PostgREST (see db/README.md), which turns these tables into a REST API.
-- PostgREST logs in as `authenticator` and switches to `web_anon` for every
-- request. web_anon may read and write lab.projects and lab.todos and nothing
-- else, so the website never holds a database password.
--
-- Safe to run again: it only creates what is missing, and only seeds empty
-- tables. Todos from before projects existed are moved into one.
--
--   psql -h 192.168.137.1 -U postgres -f db/schema.sql
--
-- On first install, also set the password PostgREST logs in with (passed in,
-- not stored here, because this repo is public):
--
--   psql -h 192.168.137.1 -U postgres -v authpw='choose-one' -f db/schema.sql
-- -----------------------------------------------------------------------------

\set ON_ERROR_STOP on
begin;

create schema if not exists lab;

create or replace function lab.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- projects --------------------------------------------------------------------
create table if not exists lab.projects (
  id          bigint generated always as identity primary key,
  name        text        not null check (length(name) between 1 and 120),
  description text        not null default '',
  color       text        not null default '#4f7d93' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- the order of the blocks on the dashboard, set by dragging them around
alter table lab.projects add column if not exists position integer not null default 0;

drop trigger if exists projects_touch on lab.projects;
create trigger projects_touch before update on lab.projects
  for each row execute function lab.touch_updated_at();

-- todos -----------------------------------------------------------------------
create table if not exists lab.todos (
  id          bigint generated always as identity primary key,
  title       text        not null check (length(title) between 1 and 200),
  notes       text        not null default '',
  status      text        not null default 'todo'
                          check (status in ('todo', 'doing', 'done')),
  owner       text        not null default '',
  due         date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table lab.todos
  add column if not exists project_id bigint references lab.projects(id) on delete cascade;
create index if not exists todos_project_idx on lab.todos (project_id);

drop trigger if exists todos_touch on lab.todos;
create trigger todos_touch before update on lab.todos
  for each row execute function lab.touch_updated_at();

-- example data, only into an empty database ----------------------------------
-- (checked once, up front, so re-running this never brings back a deleted example)
select not exists (select 1 from lab.projects) as fresh \gset
\if :fresh
insert into lab.projects (name, description, color)
select * from (values
  ('ZEPHYR',          'Navigation for drones in cluttered, moving environments.', '#4f7d93'),
  ('ATLAS',           'Ranking passes in football from event data.',              '#b4547e'),
  ('DAEDALUS',        'Generating artwork from poems.',                           '#8a5aa0'),
  ('Lab & equipment', 'Keeping the room, the rigs and the stock in order.',       '#5e8a6a'),
  ('General',         'Everything that does not belong to a project yet.',        '#c9822f')
) as seed(name, description, color)
where not exists (select 1 from lab.projects);
\endif

-- projects that have never been placed go to the end, in the order they were made
update lab.projects p set position = sub.pos
from (
  select id, (select coalesce(max(position), 0) from lab.projects)
             + row_number() over (order by id) as pos
  from lab.projects where position = 0
) sub
where p.id = sub.id;

-- Put todos from before projects existed where they belong. Anything that
-- matches nothing goes to General.
update lab.todos t set project_id = p.id
from lab.projects p
where t.project_id is null
  and p.name = case
    when t.title ilike '%zephyr%' or t.title ilike '%drone%' or t.title ilike '%propeller%' then 'ZEPHYR'
    when t.title ilike '%atlas%'    then 'ATLAS'
    when t.title ilike '%daedalus%' then 'DAEDALUS'
    when t.title ilike '%bench%'    then 'Lab & equipment'
    else 'General'
  end;
-- and if General was renamed or removed, anything left goes to the first project
update lab.todos set project_id = (select min(id) from lab.projects) where project_id is null;

alter table lab.todos alter column project_id set not null;

\if :fresh
-- a few more examples, so the progress bars have something to show
insert into lab.todos (project_id, title, notes, status, due)
select p.id, seed.title, seed.notes, seed.status, seed.due
from (values
  ('ZEPHYR',          'Write up the escape-policy ablation',    'Section 5 of the ICRA draft.',  'doing', current_date + 7),
  ('ZEPHYR',          'Field test in the sports hall',          '',                              'done',  null::date),
  ('ATLAS',           'Compare against the xT baseline',        '',                              'done',  null::date),
  ('ATLAS',           'Pass-ranking figure for the paper',      'One match, all four penalties.', 'doing', current_date + 5),
  ('DAEDALUS',        'Run the CLIP colour scoring on batch 3', '',                              'done',  null::date),
  ('DAEDALUS',        'Pick twelve poems for the exhibition',   '',                              'todo',  current_date + 21),
  ('Lab & equipment', 'Restock soldering supplies',             'Flux, wick, 0.5 mm solder.',    'done',  null::date)
) as seed(project, title, notes, status, due)
join lab.projects p on p.name = seed.project
where not exists (select 1 from lab.todos where title = seed.title);
\endif

-- roles for PostgREST ---------------------------------------------------------
select not exists (select 1 from pg_roles where rolname = 'web_anon') as need_anon \gset
\if :need_anon
  create role web_anon nologin;
\endif
select not exists (select 1 from pg_roles where rolname = 'authenticator') as need_auth \gset
\if :need_auth
  create role authenticator noinherit login;
\endif
\if :{?authpw}
  alter role authenticator password :'authpw';
\endif

grant web_anon to authenticator;
grant usage on schema lab to web_anon;
grant select, insert, update, delete on lab.projects, lab.todos to web_anon;

commit;

-- tell the running PostgREST about the new table and the relationship
notify pgrst, 'reload schema';
