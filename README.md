# Magnifica Humanitas

A bilingual, source-cited static publication on the work of Pope Leo XIV, served at
`https://magnifica.catholic.work`.

- **Content lives in Postgres** (`magnifica_humanitas` on chroma-server).
- **Payload 3** (MIT, Postgres adapter) is the authoring UI at
  `cms.magnifica.catholic.work` (noindex, auth required).
- **Astro** reads the same database directly through the read-only role `magnifica_web`
  at build time.
- A **cron worker on chroma-server** polls a Postgres event table, rebuilds the site in a
  Node container, and uploads the result to a **Cloudflare Pages** project with
  `wrangler pages deploy`.

Mathesar (`https://data.schoedel.tech/db/5/`) is retained as the query/bulk-edit layer over
the same tables.

## Layout

```
cms/           Payload 3 admin + API (Next.js app)
site/          Astro static site
bibliography/  Exhaustive Bibliography — research references + tag index (repo-canonical YAML;
               nothing here is published until an essay cites it)
ops/           chroma-server compose/build files, SQL, DNS script
docs/          architecture decisions
```

Architecture decisions D1–D11 and open questions Q1–Q5 are recorded in
[`docs/decisions.md`](docs/decisions.md).
