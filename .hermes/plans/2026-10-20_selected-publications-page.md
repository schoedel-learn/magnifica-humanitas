# Selected publications on the site (Google Scholar library, 37 works so far)

Date: 2026-10-20
Status: awaiting Barry's decisions (4 questions at the bottom)

## The problem, stated exactly

The menu item shipped today points at
`https://scholar.google.com/scholar?scilib=1024&hl=en&as_sdt=0,44` — his saved
library. Google's own help page is unambiguous:

> "Only you can see the articles in your library. If you create a Scholar profile
> and make it public, then the articles in your public profile (and only those
> articles) will be visible to everyone."
> — https://scholar.google.com/intl/en/scholar/help.html

Proof, not inference: an anonymous fetch of that URL returns
"To see your saved articles, sign in and click 'My library'." There is no public
link Google will give us for a library; profiles are public, libraries are not.

**Consequence: showing the selection to visitors means publishing the list on our own
site.** The menu item then points at our page, not at Scholar.

## What was captured (2026-10-20)

Read out of his signed-in Scholar library, label by label:

| View | URL | Works |
| --- | --- | --- |
| Label "Magnifica Humanitas" | `scilib=1024` | 37 |
| All articles | `scilib=1` | 42 (the 37 above + 5 unlabeled) |

Per entry we have: title, authors line, venue + year, and outbound links.
Raw capture: `~/.hermes/cache/browser-use/workspace/20261020_200900_d34dc0/scholar-library-full.json`.

Venues seen: Journal of Social Encounters (10), Vinayasādhana (7), Theology and Science (3),
Journal of Religion and Health (3), SSRN (4), Taylor & Francis, Springer, SciELO, OUP, Emerald,
MDPI, Perspectiva Teológica, Annals of Global Health, and a few web-only publications.

## Why the list does not go into `sources`

`docs/decisions.md` D11: every write to `sources` queues a `content_events` row and the publish
worker ships it within two minutes, so an unreviewed entry goes public. The bibliography is also
the site's *cited* works, with its own Postgres enum of kinds and a `KIND_ORDER` page that silently
drops a kind it does not list. This list is a different object: works Barry selected for reading,
not works the publication quotes.

**It lives as a repo data file** — committed, reviewable in the diff, no migration, no CMS rebuild,
no DB write, and refreshing it is a file edit plus a deploy.

## Proposed shape

- Data: `site/src/data/selected-publications.ts` — one object per work:
  `{ title, authors, venue, year, url, doi? }`. Typed, so a missing field is a build error.
- Page: `/selected-publications/` (EN) and `/es/selected-publications/` (ES) — same slug under the
  locale prefix, the pattern `/sources/` already uses.
- Menu: the Google Scholar entry becomes the way in. Recommended label **Publications**
  (`Publicaciones`), pointing at our page; the page itself carries a line explaining that the list
  is Barry's Google Scholar selection and linking out to Scholar.
- Bilingual: chrome translates; the works themselves are English-language scholarship and are not
  translated. The ES page says so in one line rather than pretending.
- Refresh: re-read the library from his signed-in browser and regenerate the data file.

## Citation depth — the honest trade-off

Crossref was queried for all 37 titles. **19 of 37 resolve with high confidence** (title match exact
or near-exact, same first author). The rest fail for real reasons: Scholar titles are truncated or
carry appended label text, several works are not registered with Crossref at all (ResearchGate,
academia.edu, philpapers, personal sites), and two have publisher-only landing pages.

A DOI attached to the wrong work is worse than no DOI — the bibliography skill's rule, learned the
hard way. So confidence is per entry, and unresolved entries get a link to the source page instead.

## Verification plan

1. `npx astro check` — 0 errors.
2. Local build against the dev database; assert the rendered list's entry count equals the data
   file's count (a count check by eye fails at 37).
3. Screenshot at 390px and 1280px — the menu row must still fit on one line.
4. Push, `publish-worker.sh --force`, confirm the worker's HEAD, then fetch both locales live and
   assert the entry count and the menu item in the served HTML.

## Decisions needed

1. Scope: the 37 labeled works only, or all 42 (5 unlabeled added)?
2. Menu label: "Publications" / "Selected publications" / keep "Google Scholar"?
3. Citation depth: entry fields + link (ships today) vs. full APA 7 with verified DOIs (slower)?
4. Refresh: on request, or a scheduled re-read?
