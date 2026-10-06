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

**Outcome recorded 2026-10-06 (task 2.11, production):** the two Payload migrations
(`20261006_065956_initial`, `20261006_071134_unify_publish_flag`) were applied to the
production database `magnifica_humanitas` on chroma-server. All **29** tables were created
and are owned by `magnifica_app`, and **no grant was issued by hand** — the pre-existing
default privileges did all of it. `information_schema.role_table_grants` shows
`magnifica_mathesar` holds `SELECT,INSERT,UPDATE,DELETE` on every one of the 29 tables.
Proved beyond the catalog with a real round-trip as the `magnifica_mathesar` role:
INSERT into `topics` + `topics_locales`, UPDATE, SELECT, DELETE (probe row removed).
Evidence commands: `docker exec postgresql-db-db-1 psql -U myadmin -d magnifica_humanitas -Atc
"select tablename, tableowner from pg_tables where schemaname='public' order by 1"` (29 rows,
owner `magnifica_app`); the same catalog query filtered on `grantee='magnifica_mathesar' and
privilege_type='INSERT'` (29 public tables present).

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
Evidence: **verified live 2026-10-06 (task 4.5).** `cms.magnifica.catholic.work` A →
`31.97.65.164` (both authoritative NS agree). Let's Encrypt certificate issued with SAN
`cms.magnifica.catholic.work`; `/admin` returns HTTP 200 with
`x-robots-tag: noindex, nofollow`; port 80 returns `301 → https://…/admin`.

**Production admin account (2026-10-06):** the first admin is **`schoedelb@gmail.com`**
(users.id = 1, created 11:08:49Z) — NOT the `barry@schoedel.design` placeholder the plan
and task 4.6 mention. It is the only row in `users`, so the open first-registration window
was closed before anyone else could use it.

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

### D10 — One publish flag: Payload's native `_status`
Date: 2026-10-06

The content model originally carried TWO publish columns on `documents` and `posts`: a
custom `status` field and Payload's own `_status` (added automatically by
`versions: { drafts: true }`). They could diverge — an admin Publish-button press writes
`_status` while a raw SQL/Mathesar edit could write `status` — so whichever flag the site
ignored would silently fail to publish. Task 2.10b removed the custom `status` field
(collection config + migration `20261006_071134_unify_publish_flag`) and repointed the
access rules at `_status`. **The single publish flag is `_status`.** In the admin the
Publish button writes `_status`; in Mathesar (or any SQL) publishing a document or post
means setting `_status = 'published'`. The static site filters every content query with
`_status = 'published'` (`ops/sql` and `site/src/lib/content.ts`).
Evidence: `payload migrate:status` lists `20261006_065956_initial` and
`20261006_071134_unify_publish_flag` both `Ran: Yes`; the leak test returns unauthenticated
`totalDocs = 0` for children of a draft parent and `1` once the parent's `_status` is
`published`, for BOTH `doc_paragraphs` and `post_sources`.

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

---

## Implementation notes

### N1 — Publishing through the Payload Local API needs `_status`, not `draft: false`
Date: 2026-10-06

A seed script that creates `documents`/`posts` with `draft: false` still lands as
`_status = 'draft'`, and the row is then invisible to the public API. Cause, read out of
`payload/dist/collections/operations/create.js`: `versions: { drafts: true }` is a **boolean**,
so `hasLocalizeStatusEnabled()` is false and `publishAllLocales` resolves via
`!hasLocalizeStatusEnabled()` — which is true — but `getAllLocalesPublicationStatus()` returns
`undefined` when `hasLocalizedStatus` is false, so nothing ever assigns `_status` and the
column default `'draft'` (from `versions/baseFields.ts`) wins.

**Rule: to publish from the Local API, send `_status: 'published'` in `data`** — exactly what
the admin's Publish button does. `draft: false` is necessary but not sufficient.
Evidence: `cms/src/seed.ts`; verified on the dev database first, then in production where both
rows read `_status = 'published'` and `GET /api/posts` (unauthenticated) returns them.

### N2 — `language_of_original` is NULL for Magnifica humanitas, deliberately
Date: 2026-10-06

The field's schema default is `la`. There is no official Latin text of this encyclical —
it was first published in Arabic, English, French, German, Italian, Polish, Portuguese and
Spanish, and as of July 2026 no Latin edition had appeared. Rather than let the record inherit
a default that asserts something we cannot support, the seed writes an explicit NULL.
**If a Latin text is later published, set the field then — not before.**

### N3 — Initial content (2026-10-06)
Date: 2026-10-06

`cms/src/seed.ts` (idempotent, upsert by slug) created: topic `leo-xiv`; document
`magnifica-humanitas` (MH, encyclical, signed 2026-05-15, published 2026-05-25); nine
`doc_paragraphs` with short verbatim extracts (max 313 chars, cap is 400) each carrying a
paragraph-number locator; five APA 7 `sources` (every URL fetched HTTP 200 before
`verified_on` was set); one essay `introduction-to-magnifica-humanitas` with a 23-node Lexical
body; and ten `post_sources` claim→source links. Copyright posture (D9) holds throughout:
quotations only, full texts linked at vatican.va and never reproduced.

### N4 — The publish loop is live (phase 5, 2026-10-06)
Date: 2026-10-06

`ops/sql/010_events.sql` was applied to dev and then to production **as `magnifica_app`**.
Rationale (this is the load-bearing detail): a trigger function executes with the privileges
of the role that fired it, and it INSERTs into `content_events`. Creating that table as
`magnifica_app` lets the pre-existing default privileges (D4) hand `magnifica_mathesar` INSERT
on it with no hand-grant; created as `myadmin` instead, every Mathesar edit would have failed
with `permission denied for table content_events`. Verified live: a write issued **as the
`magnifica_mathesar` role** queued events and the site updated.

Proofs recorded at build time:
- 16 triggers installed; **zero** on version tables (`_documents_v`, `_posts_v`), which churn
  on every draft save.
- Statement-level semantics: one `UPDATE` touching **10** `doc_paragraphs` rows produced
  **1** event, not 10 — so a bulk Mathesar save queues one rebuild.
- End-to-end: a `documents_locales` edit made as the Mathesar role appeared at
  `magnifica-humanitas-bm3.pages.dev/documents/magnifica-humanitas` **36 s** later, driven by
  cron alone (an unforced tick, confirmed in `/var/log/magnifica-publish.log`).
- Both directions: removing the marker took effect too, so the loop is not one-way.
- **Failure path:** with a deliberately bogus `CLOUDFLARE_API_TOKEN` the worker exited **1**
  and the pending count stayed at **1** — the publish was retried, not lost. Restoring the
  token and forcing a run drained the queue to 0. The marker was then removed and the site
  returned to its exact previous text.

**Phase 6 note:** the Cloudflare project was created as `magnifica-humanitas`, but Cloudflare
assigned it the pages.dev hostname **`magnifica-humanitas-bm3.pages.dev`** (a suffix is now
appended), not the bare `magnifica-humanitas.pages.dev` the plan assumed. The Phase 6 CNAME
for `magnifica.catholic.work` must therefore target `magnifica-humanitas-bm3.pages.dev`.

### N5 — "Ink Wash" design system (2026-10-06)
Date: 2026-10-06

A grayscale editorial system, mapped to Tailwind 4 `@theme` tokens in
`site/src/styles/global.css`. Colour carries hierarchy, never decoration — there is
deliberately no accent hue.

| Token | Hex | Role |
|---|---|---|
| `ink` | `#252525` | primary text; the dark nav and footer framing surfaces |
| `mist` | `#cfcfcf` | pull-quote panels; light text on ink |
| `slate` | `#7d7d7d` | every structural rule, and the spine of each quotation |
| `meta` | `#545454` | dates, captions, section labels, secondary copy |
| `canvas` | `#ffffff` | the page |
| `vatican` | `#ffe100` | the single accent — the gold band of the Vatican flag |

**The accent is scarce by design (added 2026-10-06).** A pure yellow is unusable as text on
white — `#ffe100` on `#ffffff` measures **1.31:1** — so it appears only where it sits against
the ink surface or is non-textual:

- the 3px flag band above the ink header (its one appearance on the white canvas)
- nav link hover, and the focus ring on the dark surfaces
- a 22×3px rule opening each section label — note this marks the *editorial apparatus*
  ("Paragraphs cited", "Sources for this essay", "The corpus"), never the author's own
  headings inside an essay body
- the `::selection` highlight

On `#252525` it measures **11.69:1** (WCAG AAA), which is why every textual use sits there.
Flag-yellow citations disagree (Pantone 803 C → `#FFF200`, Pantone 116 C → `#FFCE00`,
schemecolor → `#FFE100`; Wikipedia publishes no specification). `#FFE100` is the most
commonly cited value and is a single token, so a different official sample is a one-line swap.

This also fixed a genuine accessibility defect: the focus ring was `outline-color: ink` on an
ink-coloured nav, i.e. invisible. On the dark surfaces it is now the accent.

Type: **Crimson Pro Variable** for headings, standfirsts and quoted text (the printed papal
register), **Inter Variable** for body and interface. Both SIL OFL 1.1 (verified against the
`google/fonts` repo layout: `ofl/crimsonpro`, `ofl/inter`) and self-hosted through
`@fontsource`, so there is no third-party request and the build is deterministic. Both ship as
variable fonts, so one latin file per family (~48 KB each) covers the whole weight range.
Layout is a 44 rem measure (~66 characters at a 17px body), a fluid `clamp()` scale, and 1px
`#7d7d7d` rules between analytical blocks.

**Two font traps, both of which fail silently:**
1. `@fontsource` **variable** packages declare the family as `"<Name> Variable"`. Asking for
   `"Crimson Pro"` matches no `@font-face` at all, and every glyph falls back to Georgia while
   the computed `font-family` still reads back as the name you wrote. The theme now lists both
   names. Caught by comparing rendered text widths, not by reading computed styles.
2. `index.css` carries the **normal** faces only. The italic entry point is a separate import;
   without it every blockquote renders a synthesised oblique instead of the drawn italic.

### N6 — A destructive test fixture was pointed at a real database (2026-10-06)
Date: 2026-10-06

Running `npm test` with `DATABASE_URI_TEST` set to `magnifica_humanitas_dev` caused the
fixtures to DROP that database's `posts_locales` and `doc_paragraphs_locales` tables. The
fixture aborts on the first DROP that hits a foreign key, which is the only reason the damage
stopped at two tables. Both were restored from production's schema (`pg_dump --schema-only -t`)
and dev is back to exact table parity (30).

The safety mechanism had been **a comment** in the test header. It is now a fail-closed guard
(`site/tests/_guard.mjs`) that refuses any target whose database name does not end in `_test`,
called from both fixtures before the first DROP. Verified by falsification: pointed at the dev
database the suite aborts with the refusal and drops nothing.

**Rule: a comment is not a guard.** When a script deletes anything, encode the refusal in code
and then watch it refuse.

### N7 — Phase 6: the publication is live at `magnifica.catholic.work` (2026-10-06)
Date: 2026-10-06

Completed with a **two-part** change, in this order — add the custom domain to the Pages
project *first*, then point DNS at it:

1. `POST /accounts/{id}/pages/projects/magnifica-humanitas/domains` with
   `{"name": "magnifica.catholic.work"}`.
2. GoDaddy `PUT /CNAME/magnifica` → `magnifica-humanitas-bm3.pages.dev` (TTL 600), via
   `ops/dns/godaddy_magnifica.py`, whose allow-list is `{magnifica, cms.magnifica}`.

The two-part order matters because Cloudflare validates ownership over HTTP-01 against the
name: the project must already expect the hostname before the record appears. `verification_data`
went `active` as soon as the CNAME resolved, and the certificate (Google Trust Services, ~90-day
life) issued about 4 minutes later. **Until it issues, a TLS handshake for the new SNI fails with
`SSLV3_ALERT_HANDSHAKE_FAILURE`** — that reads like a broken deployment and is simply "not issued
yet". Prove it by handshaking the same IP with the `*.pages.dev` SNI: if that succeeds, the network
path is fine and only the cert is outstanding.

**Canonical URL:** `site/astro.config.mjs` already carried
`site: 'https://magnifica.catholic.work'`, so the build emits the correct `<link rel="canonical">`,
`og:url` and sitemap base. This was set in an earlier phase precisely so the cutover would not
require a rebuild — worth doing at authoring time rather than at cutover time.

**Proven blast radius — the whole point of the before/after diff:**

| Check | Result |
|---|---|
| Zone records | **46 → 47**; exactly one ADDED (the CNAME), **zero removed** |
| 14 sibling hostnames (`@`,`www`,`learn`,`make`,`ai`,`lms`,`pathways`,`diocese`,`staging`,`church`,`disciple`,`genesis`,`patriarchs`,`cms.magnifica`) | **byte-identical** to the pre-change baseline |
| Apex `MX` | unchanged (`10 mail.schoedel.tech`) |
| Apex `TXT` (6 records incl. the client's M365 `dc-` SPF include) | unchanged |

**Pitfall confirmed:** after the write the workstation's own resolver still returned a negative
answer while both authoritative nameservers and all three public resolvers were already serving the
CNAME. Verify against the authoritative NS (or bypass the local cache with
`curl --resolve <host>:443:<ip>`) — the workstation cache is the last thing to catch up, and reading
it as "not propagated" wastes the window.

### N8 — Spanish translation standard (2026-10-06)
Date: 2026-10-06

**Decision: the official texts are the reference point and their choices are not altered — in
representation or in interpretation.** The Spanish edition is not a translation of our English
edition but the same document issued in Spanish with its own settled wording; where the English
page quotes the English edition, the Spanish page quotes the **Spanish** edition.

The rule splits the work in two, and the split is not stylistic. `doc_paragraphs.extract` is
**lookup, never translation** — translating a papal quotation and presenting it as one
attributes wording to the Holy See that it did not write. Our own prose (essays, abstracts,
standfirsts, notes, summaries) is written freely in the register below.

**Register: the formal preferences of the Holy Father's pastoral region — northern Peru
(Chulucanas, Piura; Chiclayo) — used in a general way.** Not popular register and not regional
slang: the vocabulary a Peruvian bishop would preach in. Barry ranked the audience explicitly,
the Holy Father first — since Prevost became a Peruvian national in 2015 and was Bishop of
Chiclayo 2015–2023, northern Peruvian Spanish is the language of his episcopate, not a
stylistic flourish.

Artifacts: `docs/translation-standard.md` (register, fidelity rules, citation conventions,
review checklist) and `docs/glossary.es.md` (27 locked terms, **every Spanish form checked
against the official Spanish text** rather than recalled).

**Fidelity defect found while writing the standard (open, English-side, pre-existing):**
`doc_paragraphs.extract` is a plain `textarea`, so it cannot carry emphasis — and the official
text uses emphasis to carry argument. MH 118's ***a pesar*** / ***a través*** is the whole
point of the sentence (not *despite* limits but *through* them), and our stored English extract
has already lost it. Under the rule above this is altering the text's choices, so the field
needs to hold inline emphasis and the nine extracts need re-checking against both official
texts. Recorded in §4 of the standard; not yet fixed.

**Also noted:** the `/es/` routes declare `<html lang="es">` while serving English, because no
Spanish content exists yet (every locale table holds one `en` row). That misinforms screen
readers and search engines and should be resolved before translation work begins, by either
gating the routes or marking the fallback honestly.

### N9 — extract localized; the encyclical's Spanish page is live (2026-10-06)
Date: 2026-10-06

Two pieces of work, both verified on dev before production.

**1. `doc_paragraphs.extract` is now localized.** It was a single shared column, so a
paragraph could hold only one language's quotation — and the Spanish page quotes the *Spanish*
edition. The migration is **hand-written, not generated**: Payload's generator for a field
changing from shared to localized adds the new column and drops the old one *without carrying
the values across*, which would have destroyed all nine English extracts silently. The copy
runs between the ADD and the DROP. Verified on dev against a pre-populated table, then on
production: **9/9 English extracts carried, no loss.**

**2. Emphasis.** The official text uses italics to carry argument and the field was a plain
varchar, so quotations were losing them. MH 118 is the case that matters — *not \*despite\*
limitations, but often \*through\* them* — where without the emphasis the sentence still reads
but no longer says what the author said. Convention: a single asterisk pair marks an
emphasised span; `site/src/lib/emphasis.ts` escapes first and expands second, so a quotation
cannot inject markup and an unpaired asterisk stays literal. **This was a pre-existing defect
in the English edition**, not a Spanish one. Exactly one quoted span of the nine carries
emphasis in either language (MH 118).

**3. The Spanish page is live** at `/es/documents/magnifica-humanitas/`: title, summary and all
nine extracts taken from the official Spanish edition, with each extract **verified verbatim
against that text before insertion** (9/9).

Editorial notes (our own prose, since they are not quotations) are written in the register of
`docs/translation-standard.md`, using the locked glossary terms — *la custodia de la persona
humana*, *la Doctrina social de la Iglesia*, *la IA*, *el poshumanismo*.

**Lessons encoded:**
- **Key content migrations by slug, not by id.** The first attempt hardcoded `_parent_id = 1`;
  the dev database assigns id 2 to the same document, so the insert hit the FK and aborted
  instead of writing to the wrong row. `ops/sql/020_spanish_content.sql` joins on
  `documents.slug`.
- **Rollout order matters when a field moves.** The site build reads the new column, so the
  code was committed and the server clone synced *before* the migration; the CMS image was
  rebuilt and transferred *before* the container was recreated, so the admin never ran long
  against the moved column. The old image would have queried `doc_paragraphs.extract` and
  errored.
- **Cross-language span selection was done by reading, not by alignment.** An automated
  English↔Spanish sentence matcher produced garbage (it matched paragraph-number prefixes and
  weak cognates); at this fidelity a bad alignment is a mistranslation, so the nine Spanish
  spans were selected by reading the Spanish and then verified programmatically.

**Still open:** the other `/es/` routes (`/es/posts/`, `/es/sources/`, `/es/topics/`) still fall
back to English, and the `lang="es"`-over-English problem persists on them. The sync layer
(`translation_status` + `source_hash`, so an English edit marks the Spanish stale) is not
built.

### N10 — the Spanish site stops claiming to be Spanish where it is not (2026-10-06)
Date: 2026-10-06

Payload's locale fallback meant a `/es/` route with no translation served **English under
`<html lang="es">`**. Four of the five Spanish routes did exactly that — only the encyclical
page was genuinely translated. Screen readers switch voice on `lang`, so this was an
accessibility defect as well as a search one.

Fixed by making the fallback *visible rather than implicit*:

- The data layer now reports which locale each lateral join actually **resolved**
  (`resolved_locale`), not merely which was requested, so a fallback is detectable.
- `Base.astro` takes `contentLang`. When it differs from the page language, the `<main>`
  region is marked with its real language and a short notice states the mismatch in the
  page's own language. Per-element `lang` is precisely what HTML provides for mixed-language
  documents; the page chrome stays Spanish because the chrome genuinely is.
- **Lists mark per item, not per page.** `/es/` shows a Spanish document beside an English
  essay; an all-or-nothing page rule declared the whole thing Spanish, which was wrong for
  half of it. Each `<li>` now carries its own resolved locale. The page-level notice still
  fires when *every* row fell back, and an empty list is not a fallback.

Verified against the production database through the publish worker's own read-only build
path, then live.

**Process lesson (cost an hour):** the first verification of the per-item change reported the
item "NOT MARKED", which was wrong — the check script never rebuilt the site image, so it
tested **stale code**. A build-container check must rebuild its image from the synced clone
every run; `docker run` alone silently reuses the old one. Re-run after rebuilding, the
result was correct.

**Observed, not a defect:** the custom domain served the previous `/es/` for ~a minute after
the deploy while the `*.pages.dev` deployment URL already had the new markup. Cloudflare edge
propagation, settled on its own. Do not read a single mid-propagation fetch as a failed
deploy — compare the deployment URL before concluding.
