# Magnifica Humanitas — Architecture Decisions and Open Questions

Locked decisions (D) and unanswered questions (Q) for the `magnifica.catholic.work`
publication. Recorded `2026-10-06`. Sourced verbatim from section 1.4 and 1.5 of the
implementation plan `~/.hermes/plans/2026-10-06_013454-magnifica-humanitas-build.md`
so later sessions do not relitigate them.

---

## Decisions

### D1 — The build/deploy worker runs on chroma-server, not the workstation
Date: 2026-10-06

Barry's laptop sleeps; scheduled work on it is unreliable. chroma-server also has the only
private path to Postgres.
Evidence: `ssh chroma-server 'docker ps'` shows `postgresql-db-db-1` and the Traefik
container co-located; D1 is the reason no cron job is placed on the workstation.

### D2 — Astro queries Postgres directly with a new read-only role
Date: 2026-10-06

The published site queries the database through the read-only role `magnifica_web` rather
than calling the Payload API. The site then does not depend on the CMS container being up,
and a build cannot write to the database.
Evidence: the `pg_default_acl` query in `ops/sql/020_verify.sql` returns
`magnifica_app | public | {magnifica_mathesar=arwd/magnifica_app}` and
`{magnifica_mathesar=rU/magnifica_app}`, confirming the grants that make a read-only
build role possible without disturbing Mathesar's access.

### D3 — No Astro Content Layer loader in v1
Date: 2026-10-06

A loader buys schema validation we do not need; direct `pg` queries in
`site/src/lib/db.ts` are version-stable across Astro majors. Recorded as a deliberate
tradeoff, revisit if Astro's live collections land and simplify things.
Evidence: n/a (design tradeoff, no command).

### D4 — Payload's tables stay in schema `public`
Date: 2026-10-06

Do not set `schemaName`. Verified: the pre-existing default privileges (`magnifica_app` in
`public`) give Mathesar SELECT/INSERT/UPDATE/DELETE on every table Payload creates. Using a
separate schema would require another grant round and Mathesar would not see the tables.
Evidence: `ops/sql/020_verify.sql` default-privileges query shows `magnifica_app` in `public`
grants `magnifica_mathesar=arwd` on tables and `rU` on sequences.

### D5 — Media on a bind-mounted host directory `/srv/magnifica/media` on chroma-server
Date: 2026-10-06

Not R2 — the current token is forbidden from R2. The worker copies media into the Astro
build so the published site is self-contained and does not hotlink the CMS.
Evidence: the Cloudflare token probe returns HTTP 403 on `/accounts/{id}/r2/buckets`
(recorded in the plan, section 1.3), which is why a local bind mount is the v1 default.

### D6 — CMS hostname is `cms.magnifica.catholic.work`
Date: 2026-10-06

The CMS is served noindex (Traefik `X-Robots-Tag: noindex, nofollow`) and requires Payload
authentication.
Evidence: n/a (configuration decision, verified at deploy in phase 4).

### D7 — The static site is deployed by direct upload (`wrangler pages deploy`)
Date: 2026-10-06

Cloudflare's own build infrastructure can never see the private database, so a Pages git
build would be wrong here. A deploy hook is therefore unnecessary.
Evidence: `site.Dockerfile` runs `npx wrangler pages deploy dist` from the worker container.

### D8 — Repo: `github.com/schoedel-learn/magnifica-humanitas`, private
Date: 2026-10-06

Follows Barry's site-repo convention under the `schoedel-learn` org.
Evidence: `gh repo view schoedel-learn/magnifica-humanitas --json visibility,url` returns
`"visibility": "PRIVATE"`.

### D9 — Copyright posture
Date: 2026-10-06

The Holy See's texts are copyrighted. `doc_paragraphs` stores paragraph numbers and short
quoted extracts only (≤ 400 characters), each with a locator; we never republish a full
document. Enforce in the CMS field description and in code review; do not add automated
text policing (YAGNI).
Evidence: n/a (policy decision, enforced in collection field `maxLength`).

---

## Open Questions

### Q1 — Media storage
Date: 2026-10-06

R2 is unreachable with the current token (403). Default in this plan is a local bind mount.
If Barry wants R2: he must create an R2-scoped API token (S3 access key + secret) and add
`R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT` to Secrets.md, then swap
`@payloadcms/storage-s3` in. Cost of staying local: media is served from chroma-server and
must ride along in backups.

### Q2 — Bilingual scope
Date: 2026-10-06

Plan assumes EN + ES fields on all prose, with ES allowed to be empty at launch (Astro falls
back to EN). Confirm Barry does not want ES hidden until translated.

### Q3 — Domain authority
Date: 2026-10-06

The subdomain inherits nothing from the WordPress apex. Anything needed to cross-link the two
(menu link on the apex, canonical hints)?

### Q4 — Analytics property
Date: 2026-10-06

Confirm the publication should get its own Plausible property (task 7.1) rather than feeding
an existing one.

### Q5 — chroma-server backups
Date: 2026-10-06

The nightly restic backup covers the workstation home directory. Confirm whether
chroma-server has any backup of its own; if not, task 4.6 adds a local `pg_dump` + media
archive and task 7.6 recommends an off-box target.
