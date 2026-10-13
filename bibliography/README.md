# Exhaustive Bibliography

A research bibliography for the Magnifica Humanitas work: works gathered to be **used**, not published.
It lives in this repo because it is meant to feed the publication later, and because plain text is
reviewable, diffable and greppable in a way a reference manager's database is not.

**The rule: this directory is the source of truth. Zotero is a one-way reading mirror.** Metadata and
tags are edited here and exported to Zotero for reading, PDFs and annotation. Never edit a metadata
field in Zotero — the edit would be invisible here and would be lost on the next export.

## Authored vs generated

| File | Who writes it |
| --- | --- |
| `entries/<citekey>.yml` | **You** (or `scripts/capture.mjs`) — one work per file |
| `vocabulary.yml` | **You** — the controlled tag list |
| `exhaustive-bibliography.md` | generated — the list, APA 7, grouped by kind |
| `essays/<seed-id>.md` | generated — **one seed essay's reference list**, in the order the article prints it |
| `tag-index.md` | generated — **the index of tags** |
| `index.json`, `exports/*` | generated — CSL-JSON, RIS, BibTeX |

`node scripts/build.mjs --check` fails if a generated file is out of date, so the two can never drift
apart silently. Run it (or `npm test`, which includes it) before committing.

## Add a work

```sh
cd bibliography
node scripts/capture.mjs 10.1007/s11019-025-10290-7 --seen-in <citekey-of-the-list-it-came-from>
# or, for a book:  node scripts/capture.mjs --isbn 9780268006983
```

That writes a stub from Crossref (articles) or Open Library (books, the edition that ISBN names) and
**never overwrites an existing entry**. Then, by hand:

1. Put `authors` in APA 7 order; add a `creators` list (each `Family, I. N.`) when there is more than one.
   Titles are kept **as the publisher deposited or printed them** — different journals use different
   conventions, and sentence-casing is part of what happens at promotion, not here.
2. Check the fields against **the publisher's own page**, not a catalogue, and set `metadata_source`
   and `verified_on` to say what you actually looked at.
3. Add tags. Anything you are asserting goes in `tags`; anything an agent inferred goes in
   `tags_inferred` (it renders with a `?`). Set `ref_no` to the work's **position in the source list**
   you took it from — the build requires a seed essay's `ref_no` values to be exactly 1..`reference_count`,
   so a skipped or duplicated reference cannot pass unnoticed.
4. Record what you could not confirm in `to_verify`, and any difference from the source list you took
   the reference from in `discrepancy`. Both are rendered in appendices — nothing is silently repaired.
   A field you genuinely cannot fill (a classical text whose edition the source list never names) may be
   left out **if `to_verify` names the gap**: the entry then renders `no date recorded` rather than a
   guessed year, and the build still passes.
5. `node scripts/build.mjs`

## Tags

- One id per concept, kebab-case. `vocabulary.yml` carries the display label, aliases, axis and a
  one-line definition. An entry may only use ids that are in that file — the build refuses otherwise,
  because an unlisted tag is one that cannot be found again.
- Two different questions, kept apart on purpose, and they are orthogonal:
  - **Does the concept exist?** — `status: approved|proposed` in `vocabulary.yml`. `proposed` means the
    tag itself is not settled yet.
  - **Where did the assignment come from?** — `tags` when the work's own title or journal states it (or
    Barry assigned it), `tags_inferred` when an agent read the work and put it there.
  A proposed concept may be borne by a title; an approved concept may be an agent's inference. Only the
  first list is checkable by looking, which is why the index marks the second with `?`.
- Axes: `concept`, `venue` (a journal), `field` (a discipline), `person`, `method`.
- Confirming an inferred assignment = move the id from `tags_inferred` to `tags`.
- `tag-index.md` lists everything still needing a decision, with the works that would move.

## Zotero (the mirror)

One-way: import this folder into Zotero to read, annotate and keep PDFs. **Never edit metadata there** —
edit the entry and re-export. A collection named **Magnifica Humanitas — Exhaustive Bibliography** holds
the mirror (created 2026-10-12); the rest of Barry's library is unrelated and untouched.

Two ways to refresh it:

1. **In the UI:** select the collection, then Zotero → File → Import → `exports/references.ris`.
2. **Programmatically:** `exports/zotero-items.json` is Zotero item JSON (generated). With Zotero running,
   POST it to the connector in batches:

```sh
curl -s -X POST http://127.0.0.1:23119/connector/saveItems \
  -H 'Content-Type: application/json' -d '{"items": [ ... ]}'   # 201 on success, empty body
```

Items land in **whatever collection Zotero has selected** — the connector ignores any target sent in the
payload (verified in Zotero 10's `server_connector.js`) — so select the target first, and re-link the
items afterwards if you had something else selected. Every mirrored item carries `Citekey: <id>` in
Extra, so an item traces back to its entry, and the entry's `note` arrives as a child note.

Tag naming carries over: `recognition` is borne by the work's own title, `recognition?` is an inferred
assignment awaiting confirmation. Zotero's tag pane is not the index — `tag-index.md` is.

## The file collection (the works' own PDFs)

The PDFs live **outside** this repo, because the repo deploys and the publication's posture is quoted
extracts only, never a full text (D9). The default folder is
`~/Documents/Research/Exhaustive Bibliography/`:

```
pdf/<citekey>.pdf   one file per work, named by its citekey (stable, greppable, no collisions)
MANIFEST.md         what is held, and for everything else where to get it
fetch-list.csv      every work with doi/url/link, laid out for a library session
state.json          provenance: the URL fetched, size, sha256, date
```

```sh
node scripts/collect-pdfs.mjs --dir "$HOME/Documents/Research/Exhaustive Bibliography"
node scripts/collect-pdfs.mjs --dir "…" --manifest-only     # refresh; also registers PDFs you filed yourself
```

The collector downloads what is legitimately reachable over the open web — publisher OA (Springer,
Cambridge, MDPI where it answers), and PMC/repository copies located through Unpaywall. It refuses any
`--dir` inside the repo, and it validates what it saves (`%PDF-`, minimum size). The folder is the truth:
any PDF you drop in `pdf/<citekey>.pdf` counts as held on the next run.

Automated fetching stops at several publishers' bot walls — Wiley, OUP, T&F, SAGE, NEJM, Hindawi and
Europe PMC all answer 403 to a scripted request, and a browser session only gets Springer, PMC's
open-access subset, Cambridge and some repositories. Those works need a library session; `fetch-list.csv`
carries a clickable link for each, and everything still missing is written up in `MANIFEST.md`.

### File sync: this collection goes to Nextcloud, not Zotero's cloud

Attachments sync over **WebDAV to Barry's own Nextcloud**, because Zotero's free file storage is 300 MB and
this collection is built to grow. Configured 2026-10-12:

| Setting | Value |
| --- | --- |
| Zotero → Settings → Sync → File Syncing | **WebDAV** |
| URL | `cloud.schoedel.tech/remote.php/dav/files/admin/` (Zotero appends `/zotero` itself) |
| Username | `admin` |
| Password | the app password named *Zotero WebDAV*, recorded in the vault's `Secrets.md` |

The app password was minted server-side (`occ user:add-app-password admin --name="Zotero WebDAV"`), so no
account password is ever handled, and the server side was verified before Barry typed anything: PROPFIND
207 on the DAV root, plus a write/read/delete round trip inside `.../files/admin/zotero/`.

Two rules worth knowing, both from Zotero's own documentation:

- **Linked files are never synced.** To get a PDF into Nextcloud it must be a *stored* attachment (Zotero
  copies it into its data directory and uploads it). So the folder in `~/Documents/Research` is the
  collector's staging area — what syncs is Zotero's copy of it.
- WebDAV works for the personal library only; group libraries require Zotero Storage.

Stored attachments are created through the local API rather than by hand:
`POST /api/users/0/items` (an `imported_file` attachment under the parent) → `POST …/items/<key>/file`
with `If-None-Match: *` to authorize → POST the bytes to the returned `/api/local/uploads/<key>` →
register with `upload=<uploadKey>`. It needs one user approval: `POST /api/local/authorize` shows Zotero's
dialog, and **Always Allow** returns a persistent key.

## Commands

```sh
node scripts/build.mjs          # validate and write everything
node scripts/build.mjs --check  # fail if a generated file is stale (CI / pre-commit)
node scripts/build.mjs --stats  # counts only
npm test                        # gates: validation, rendering, staleness, capture mappers
```

## Fields that do not exist at the site

`cms/src/collections/Sources.ts` is the live bibliography, and it has no field for a translator, an
original-language title, an ISBN, or the source list a reference came from. Those fields are here for
research use and are **dropped on promotion** unless the CMS schema grows. Everything else — `kind`,
`authors`, `title`, `edition`, `year`, `published_on`, `publisher`, `journal`, `volume`, `issue`,
`pages`, `doi`, `url` — maps 1:1 onto a `sources` row, which is why the field names are the site's.

**Nothing here is published.** A `sources` insert queues a `content_events` row and the publish worker
rebuilds the site, so a work is promoted only when an essay actually cites it
(`docs/citations-style.md` §3).

## Batches

A batch is one seed essay plus the works its reference list cites. The seed records `reference_count`;
each work it cites records `seen_in: [<essay id>]` and its `ref_no` in that list. `build.mjs` fails unless
the numbers are exactly 1..`reference_count`, and `essays/<seed-id>.md` renders the list in the article's
own order — the file to open when you want one essay's papers rather than the whole bibliography.

| Seed | References | Entered | Its file |
| --- | --- | --- | --- |
| Frantz, Rego & Barbas (2025), *Reclaiming human dignity* | 19 | 19 | `essays/frantz-2025-reclaiming-human-dignity.md` |
| Dernbach (2025), *Addiction is a Dignity Disorder* | 72 | 72 | `essays/dernbach-2025-addiction-is-a-dignity-disorder.md` |

A seed list is not always right, and the entries are the record: the Dernbach list's DOI for Goodman 1990
resolves to a different work entirely, its Stepinova page range disagrees with the publisher's deposit,
and it gives a page range for Schulte & Hser that the deposit lacks. Each is recorded in the entry's
`discrepancy` field and printed under the entry in the essay file.
