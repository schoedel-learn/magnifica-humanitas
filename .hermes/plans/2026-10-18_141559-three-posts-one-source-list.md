# Three posts and one source list — IA restructure plan

**Goal:** Reduce the site to what Barry named on 2026-10-18: **three posts** and **one
topically organized source list**. Documents dissolves (its MH extracts become a post "in
progress"); Sources survives as the single list; the nav becomes two items.

**Verified starting state** (queried live, 2026-10-18):

| fact | value |
|---|---|
| posts rows | 1 — `introduction-to-magnifica-humanitas`, `post_type=essay`, published 2026-10-06 |
| documents rows | 1 — `magnifica-humanitas` / `MH` / `encyclical` |
| doc_paragraphs | 15 (9 tagged to topic `leo-xiv`, 6 to topic `truth`) |
| topics rows | 2 — `leo-xiv`, `truth` (truth renders the bespoke `TopicVeritasPage`) |
| sources rows | 11 (magisterial 7, web 3, book 1) |
| post_sources | 10, all on post 1 — source 11 (NAB) is cited by nothing |
| posts_rels | empty |

**Decisions (Barry, answered in the gate form)**

1. The MH extracts = **one** post holding all 15, growing.
2. Veritatis keeps its **bespoke three-step page**, served at `/posts/agentes-veritatis/`.
3. The source list is grouped **by the post that cites each work**.
4. Old `/documents/` and `/topics/` URLs **301** to the new post URLs.
5. The nav is **Posts | Sources**.

---

## Target IA

```
/posts/                                   index — three posts
/posts/introduction-to-magnifica-humanitas/   essay      (exists today)
/posts/agentes-veritatis/                 guide      NEW — TopicVeritasPage
/posts/magnifica-humanitas-in-quotations/ extracts   NEW — DocumentDetail (MH), "in progress"
/sources/                                 one list, grouped by citing post
```

Nav (both locales) drops `Documents` and `Veritatis`:

| locale | nav |
|---|---|
| en | Posts · Sources |
| es | Entradas · Fuentes |

**URL map / redirects** (`site/public/_redirects`, Cloudflare Pages):

```
/documents/                                    /posts/magnifica-humanitas-in-quotations/   301
/documents/magnifica-humanitas/                /posts/magnifica-humanitas-in-quotations/   301
/topics/                                       /posts/                                     301
/topics/truth/                                 /posts/agentes-veritatis/                   301
/topics/leo-xiv/                               /posts/magnifica-humanitas-in-quotations/   301
/es/documents/                                 /es/posts/magnifica-humanitas-in-quotations/ 301
/es/documents/magnifica-humanitas/             /es/posts/magnifica-humanitas-in-quotations/ 301
/es/topics/                                    /es/posts/                                  301
/es/topics/truth/                              /es/posts/agentes-veritatis/                301
/es/topics/leo-xiv/                            /es/posts/magnifica-humanitas-in-quotations/ 301
```

`#pNNN` anchors survive: `DocumentDetail` already carries `id="p{number}"`, and a 301 keeps
the fragment client-side.

---

## Phase 1 — additive code only (nothing visible changes)

**Files**
- Modify: `site/src/lib/i18n.ts` — add `guide`, `extracts` (+ `art`, `poem`, which Barry named
  earlier) to the `postTypes` map in **both** locales. Typed `Record<string, string>`, so an
  unmapped value still renders raw rather than blank.
- Modify: `site/src/pages/posts/[slug].astro`, `site/src/pages/es/posts/[slug].astro` — branch
  on slug, the same pattern `pages/topics/[slug].astro` already uses:
  ```astro
  {slug === 'agentes-veritatis' ? <TopicVeritasPage lang="en" />
   : slug === 'magnifica-humanitas-in-quotations' ? <DocumentDetail slug="magnifica-humanitas" lang="en" />
   : <PostDetail slug={slug} lang="en" />}
  ```
  Both new components already exist and take exactly these props.
- Leave `/documents/` and `/topics/` routes in place this phase — nothing is removed while its
  replacement is not yet live.

**Verify:** `npx astro check` 0 errors; build still emits 16 pages; no URL changes.
**Deploy:** push + `publish-worker.sh --force`.

## Phase 2 — data, ONE transaction

The trigger on `posts`/`posts_locales` queues `content_events`, and the cron publishes within
two minutes, so every statement must land together or the site publishes a half-section. One
`ON_ERROR_STOP` transaction piped to psql, matching the house pattern.

- Insert 2 `posts` rows (`_status='published'`, `published_at=now()`, defaults otherwise):
  - slug `agentes-veritatis`, `post_type='guide'`, title "Agentes Veritatis — a guide to
    becoming disciples of the Truth", abstract from the existing RSS description.
  - slug `magnifica-humanitas-in-quotations`, `post_type='extracts'`, title "Magnifica
    Humanitas in quotations", abstract stating it is a work in progress.
- Insert their `posts_locales` `en` rows. **No `es` rows yet** — Payload falls back to English
  and the page states the mismatch, which is the existing, honest behaviour. Spanish titles are
  Barry's copy to dictate.
- Insert `post_sources`: (post `agentes-veritatis` → source 1 MH), (post
  `magnifica-humanitas-in-quotations` → source 1 MH).
- Do **not** touch `doc_paragraphs_rels` (paragraph→topic). Those rows become unused, not
  wrong; deleting them is a separate, reversible cleanup once the restructure is confirmed.

**Verify:** `/posts/agentes-veritatis/` renders the three-step page; `/posts/magnifica-humanitas-in-quotations/`
renders all 15 quotations with notes and `#pNNN` anchors; both appear in `/posts/`; the old
`/documents/` and `/topics/` pages still work (nothing removed yet).

## Phase 3 — removal, regrouping, redirects

**Files**
- Delete: `site/src/pages/documents/**`, `site/src/pages/es/documents/**`,
  `site/src/pages/topics/**`, `site/src/pages/es/topics/**`.
- Delete: `site/src/components/DocumentsIndex.astro`, `TopicPage.astro`, `TopicLists.astro`
  (TopicLists only serves topic pages). Keep `DiscoverPage`-style helpers if referenced elsewhere.
- Modify: `site/src/layouts/Base.astro` — nav becomes Posts · Sources; drop the two links and
  their comment.
- Modify: `site/src/components/PageHome.astro` — remove the documents list block.
- Modify: `site/src/components/TopicVeritasPage.astro` — repoint its paragraph anchors from
  `/documents/${doc.slug}/#p…` to `/posts/magnifica-humanitas-in-quotations/#p…` (3 sites,
  including the hardcoded `MH 131` link).
- Modify: `site/src/components/SourcesPage.astro` — group by citing post instead of `kind`:
  one section per post with `post_sources` rows, and a final **"Not yet cited"** section for any
  source with no post (source 11, the NAB, lands there). A source cited by two posts appears
  under each — the grouping is a reading list per post. Reuse `listSourcesForPost()`.
- Modify: `site/src/pages/rss.xml.ts` — **remove the hardcoded `VERITAS_ITEM`** or the guide now
  arrives twice (it is a real post row); post 3 arrives by itself.
- Modify: `site/src/lib/i18n.ts` — drop `documents`, `topics`, `veritas`, `noDocuments` if
  unused; keep `paragraphsHeading`, `fullTextAtVatican` (DocumentDetail still needs them). The
  `typeof en` guard forces both locales together.
- Create: `site/public/_redirects` with the map above.
- Modify: `site/src/pages/sitemap` inputs — no change needed; `@astrojs/sitemap` follows routes.

**Verify (live, bytes not statuses):**
- `curl -o /dev/null -w '%{http_code} %{redirect_url}'` on all 10 old URLs → 301 to the right target.
- Nav on `/` and `/es/` is exactly `Posts Sources` / `Entradas Fuentes`.
- `/sources/` has a section per post plus the uncited tail; every one of the 11 sources appears
  exactly once per citing post and never disappears silently.
- `/rss.xml` has no duplicate Veritas item.
- `npx astro check`, citation suite (pass 11 / fail 0 / skipped 0), and a 390px mobile pass on
  `/posts/`, the quotations post and `/sources/`.

---

## Risks

- **The two-minute cron is the hazard.** Any data statement published alone produces a visible
  half-section; Phase 2 is therefore one transaction and Phase 1 keeps the old routes alive.
- **`_redirects` is only honoured if it lands in the build output root.** Confirm with a 301 on
  the live domain, not by the file existing in `public/`.
- **A redirect to a URL that 404s** is worse than none: the Cloudflare Pages project has no 404
  page and answers every unmatched path with the home page at 200, so a wrong redirect looks
  like success in a status-code check. Compare the target's bytes, not its status.
- **Deleting topic pages** orphans `doc_paragraphs_rels`; harmless (no page reads topics), but
  the `topics` rows should stay until Barry confirms, since they are the record of which
  paragraph belongs to which theme.

## Open items for Barry at the go

- Titles and slugs for the two new posts (plan proposes "Agentes Veritatis — a guide to
  becoming disciples of the Truth" / `agentes-veritatis`, and "Magnifica Humanitas in
  quotations" / `magnifica-humanitas-in-quotations`).
- Spanish titles and abstracts for both (English serves as fallback meanwhile).
- Whether `art` and `poem` should really join the `post_type` enum now, or wait until the first
  one is filed.
