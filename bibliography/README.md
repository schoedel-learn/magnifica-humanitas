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
   `tags_inferred` (it renders with a `?`).
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

`exports/references.ris` imports into Zotero; `exports/csl.json` is the archival interchange copy.

1. Make a collection, e.g. **Magnifica Humanitas — Exhaustive Bibliography**, and select it.
2. Zotero → **File → Import** → `exports/references.ris`.
3. Read, annotate, store PDFs there. To refresh after edits here, delete the collection and re-import.

Tag names carry the same convention into Zotero: `recognition` is approved, `reality?`-style names with a
trailing `?` are inferred. Zotero's tag pane is not the index — `tag-index.md` is.

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

A batch is one source essay plus the works its reference list cites. The seed essay records
`reference_count`, and each work it cites records `seen_in: [<essay id>]`; `npm test` fails if the two
disagree, so a half-entered list cannot pass unnoticed. Two batches so far:

| Seed | References | Entered |
| --- | --- | --- |
| Frantz, Rego & Barbas (2025), *Reclaiming human dignity* | 19 | 19 |
| Dernbach (2025), *Addiction is a Dignity Disorder* | 72 | 72 |
