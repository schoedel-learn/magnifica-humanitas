# ops/sql — database SQL for Magnifica Humanitas

## Throwaway local development DSN

The local development database is a disposable Docker container (`mh-dev-pg`,
`postgres:16`) and the DSN below is a **throwaway local dev DSN, not a secret**.

```
postgres://mh_admin:devonly@127.0.0.1:55433/magnifica_humanitas_dev
```

This is the **only** DSN allowed in the repository. Every real credential lives outside
the repo — on chroma-server in `/root/.magnifica-pg-credentials` and
`/opt/magnifica-humanitas/config.env` (mode 600), and in the Obsidian vault's
`80 ⚡ System/Secrets.md`. `.env` files are gitignored.

### Local port note

`55432` is already published on this workstation by the unrelated `barry-ai-postgres`
container (a Proset/barry-ai service, healthy and in use), so `mh-dev-pg` is published
on **55433** instead. Ports are host-side only; inside the container Postgres still
listens on the standard `5432`. Recreate the container at any time with:

```sh
docker run -d --name mh-dev-pg \
  -e POSTGRES_USER=mh_admin -e POSTGRES_PASSWORD=devonly \
  -e POSTGRES_DB=magnifica_humanitas_dev \
  -p 127.0.0.1:55433:5432 postgres:16
```

## Files

- `001_web_role.sql` — create the read-only `magnifica_web` role used by the Astro build.
- `010_events.sql` — `content_events` plus the statement-level triggers that queue a rebuild.
  Run as **`magnifica_app`**, because the trigger inserts as the role that fires it. It is
  idempotent (tables `if not exists`, triggers dropped and recreated), so re-running it is how a
  newly added content table — e.g. the `site_settings` global — gets its trigger in production.
- `020_verify.sql` — foundation verification queries (databases, roles, default ACLs).
