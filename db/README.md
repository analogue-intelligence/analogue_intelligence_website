# Lab todo board

The unlisted page at `?mode=todos` reads and writes `lab.projects`, `lab.todos`, `lab.people` and `lab.todo_assignees` directly from the
browser. A browser cannot open a Postgres connection, so
[PostgREST](https://postgrest.org) runs beside Postgres on the lab machine and
serves the tables over HTTP on port 3000. No code of ours runs there.

```
browser ──HTTPS─▶ tailscale serve ──▶ PostgREST :3000 ──▶ Postgres :5432
   https://desktop-d7ungo1.tail30fcd7.ts.net   (any https page, on Tailscale)
   http://192.168.137.1:3000                   (only from an http page, e.g. a local copy)
```

The page probes both addresses at once and uses whichever answers first.
They are set in `ENDPOINTS` at the top of `src/todos/TodoBoard.js`.

## Setup (once, on the lab machine)

1. Create the tables, roles and example projects and todos (safe to re-run):

   ```
   psql -h 192.168.137.1 -U postgres -v authpw="<pick a password>" -f db/schema.sql
   ```

   Then the migrations, in order:

   ```
   psql -h 192.168.137.1 -U postgres -f db/002_keys.sql
   psql -h 192.168.137.1 -U postgres -f db/003_people.sql
   psql -h 192.168.137.1 -U postgres -f db/004_live.sql
   ```

2. Download `postgrest-vX.Y.Z-windows-x64.zip` from
   https://github.com/PostgREST/postgrest/releases and unzip it.

3. Next to `postgrest.exe`, create `postgrest.conf`:

   ```ini
   db-uri       = "postgres://authenticator:<that password>@localhost:5432/postgres"
   db-schemas   = "lab"
   db-anon-role = "web_anon"
   server-host  = "*"
   server-port  = 3000
   ```

4. Run `postgrest.exe postgrest.conf` and allow port 3000 through Windows
   Firewall for the private and Tailscale networks. To keep it running after a
   reboot, register it as a service, for example with NSSM.

5. Put https in front of it so the public (https) site may call it. Enable
   MagicDNS and HTTPS certificates in the Tailscale admin console, then:

   ```
   tailscale serve --bg 3000
   ```

Check it: `curl https://desktop-d7ungo1.tail30fcd7.ts.net/todos`.

## Security

`web_anon` can read, add, edit and delete projects, todos and people, and do nothing else. Anyone who
can reach port 3000 can do the same. Keep the port off the public internet.

## Identifiers

Every project has a short key (`LAB`) and every todo a number within its
project, so todos read as `LAB-3`: short enough to say out loud. Numbers are
never reused. A todo's key is computed, not stored, so renaming a project's key
renames its todos too.

```
curl 'https://desktop-d7ungo1.tail30fcd7.ts.net/todos?key=eq.LAB-3&select=*,key'
curl 'https://desktop-d7ungo1.tail30fcd7.ts.net/projects?key=eq.LAB&select=*,todos(*,key)'
```
