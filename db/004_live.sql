-- -----------------------------------------------------------------------------
-- 004_live.sql: a change counter, so open pages can follow edits live.
--
-- Any insert, update, delete or truncate on the dashboard's tables bumps one
-- number. The page asks for it every couple of seconds (GET /changes, a few
-- bytes) and only reloads when it has moved. That catches everything, also
-- edits made outside the page (psql, scripts, voice), and deletes, which a
-- "latest updated_at" check would miss.
--
-- Adds a table and triggers only; no existing row is touched. Safe to run again.
--
--   psql -h 192.168.137.1 -U postgres -f db/004_live.sql
-- -----------------------------------------------------------------------------

\set ON_ERROR_STOP on
begin;

create table if not exists lab.changes (
  one      boolean primary key default true check (one),   -- exactly one row
  version  bigint  not null default 0
);
insert into lab.changes default values on conflict do nothing;

-- Runs as the table owner, so the page can read the counter without being
-- allowed to write it.
create or replace function lab.bump_version() returns trigger
language plpgsql security definer set search_path = lab, pg_temp as $$
begin
  update lab.changes set version = version + 1;
  return null;
end $$;
revoke all on function lab.bump_version() from public;

do $$
declare t text;
begin
  foreach t in array array['projects', 'todos', 'people', 'todo_assignees'] loop
    execute format('drop trigger if exists %I on lab.%I', t || '_changed', t);
    execute format('create trigger %I after insert or update or delete on lab.%I
                    for each statement execute function lab.bump_version()', t || '_changed', t);
    execute format('drop trigger if exists %I on lab.%I', t || '_truncated', t);
    execute format('create trigger %I after truncate on lab.%I
                    for each statement execute function lab.bump_version()', t || '_truncated', t);
  end loop;
end $$;

grant select on lab.changes to web_anon;

commit;

notify pgrst, 'reload schema';
