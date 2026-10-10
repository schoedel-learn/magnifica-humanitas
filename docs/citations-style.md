# Citation style for this site

How every bibliography entry on `/sources/` and every **Sources for this essay** block is
written. One style, applied mechanically, so the site cannot drift entry by entry.

The bibliography is generated, not hand-typed: a `sources` row in Postgres becomes an entry
through `site/src/lib/citations.ts` → `formatApa()`. That function is the single place the
style lives. Change the style there, never in a component.

---

## 1. APA 7 governs the entry shape

Each entry is one of exactly two shapes, chosen by whether the row has a `journal`:

**Standalone work** (book, chapter, thesis, magisterial document, web page, report)

```
Authors. (Date). Title in italics. Publisher or site name. URL
```

**Periodical** (journal, magazine, news article)

```
Authors. (Date). Article title in plain text. Journal in italics, volume(issue), pages. URL
```

**Work with no author** (a Bible, a dictionary) — the title takes the author position

```
Title in italics (ed.). (Year). Publisher or site name. URL
```

A blank `authors` is the switch for the third shape, and it is meaningful, not missing data:
printing an empty author element, or printing the title twice (once where the author goes and
once where the title goes), are both wrong. Worked example: the New American Bible, revised
edition is cited `<em>New American Bible, revised edition</em>. (2011). United States
Conference of Catholic Bishops. URL`.

Consequences that follow from this and are easy to get wrong:

- **Italics are not decoration.** They distinguish a standalone work's title from a
  periodical's name. They are why `formatApa()` returns HTML (escaped, with `<em>` as the
  only tag it writes) and why the components render it with `set:html`.
- **Never repeat the author as the publisher.** APA 7 omits the publisher/site when it is the
  same as the author. A USCCB page authored by the USCCB prints the body once.
- **An edition is not part of the title.** APA 7 prints the edition statement in parentheses
  straight after the title and *outside* the italics — `Catechism of the Catholic Church
  (2nd ed.).` It therefore lives in its own `edition` column; folding it into `title` would
  drag it into the italic span, which is exactly where a bibliography stops looking precise.
- **Cite the edition actually being cited, and name it in the change note.** The Catechism of
  the Catholic Church is the worked example: the first English edition is 1994 and the revised
  second edition is 1997, and the two read differently at points where the doctrine itself
  developed — so a bare "Catechism of the Catholic Church" is not a complete reference.
- **Sentence case for titles**, as the publisher wrote them. Proper nouns, document names and
  titles of works inside a title keep their capitals.
- **No trailing period after a URL or DOI**, and a period after the publisher/container.
- **No "Retrieved from" / access dates** on stable content. `accessed_on` is pipeline
  bookkeeping, not an APA element.

## 2. Dates: the most specific date the source publishes

This is a house rule on top of APA 7, and it is absolute:

- **`n.d.` is not acceptable on this site.** If a source looks undated, open it and look
  again — a dateline, a `datePublished`, a footer, the year of the events it reports. Find
  the date; do not print a placeholder.
- **Use the most specific date available.** A dated news or web article gets the full date
  (`(2026, May 25)`); a book, report or magisterial document gets the year (`(2026)`).
  `apaDate()` implements exactly this: `published_on` wins for the kinds listed in
  `FULL_DATE_KINDS` (`journal-article`, `magazine`, `web`); everything else renders `year`.
- **Record the full date in `published_on` only when the source publishes one.** Leaving it
  null is correct for a document cited by year; it is not a gap to fill with a guess.
- **If a page genuinely carries no date, change the source rather than the style.** Cite a
  dated equivalent from the same publisher (a news release instead of a landing page, a
  dated bulletin instead of an index). Say so in the change note. The corollary, learned from
  the New American Bible: a contents or index page can still serve as the **locator** when the
  work itself is dated from the publisher's own page — what it must never be is the thing that
  supplies the date.
- **Never infer a date.** A year taken from "the content looks like 2025" is a guess. If a
  year is genuinely the only thing the publisher states, cite the year and record *where*
  that year comes from.
- **A page's date is not always the work's date — the document wins.** vatican.va carries an
  `eventDate` that is sometimes the date the HTML version was posted (it matches the URL
  slug). Worked example: the *Compendium of the Social Doctrine of the Church* page says
  `2006-05-26`, but the work is **2004** — its approval decree is dated 2 April 2004 and its
  presentation letter is headed "From the Vatican, 29 June 2004". Where the document's own
  signing, approval or presentation date disagrees with the page's `eventDate`, cite the
  document, and leave `published_on` empty rather than write a posting date into a
  publication-date field. Same trap in reverse: a remembered year can be the *approval* year
  while the publication year differs (the International Theological Commission's *Quo vadis,
  humanitas?* was approved in 2025 and published 4 March 2026).

## 3. One entry per in-text citation, and the reverse

An entry with no in-text citation is clutter; an in-text citation with no entry is a
broken reference. When a source's year changes, every `(Author, Year)` in the body text and
every `post_sources` link changes in the same edit. The in-text form is
`(Author, Year)` or `(Author, Year, para. N)` for a paragraph-anchored quote.

## 4. The `Verified` badge

`verified_on` renders as the badge beside an entry. It means a human opened the URL and
confirmed the citation resolves and the metadata matches. Leave it empty until that is true
— the field description in the CMS says the same thing.

## 5. Fields, and what each one feeds

| Field | Feeds | Notes |
| --- | --- | --- |
| `authors` | entry start | APA 7 order. `Piro, I.`; a body as author: `United States Conference of Catholic Bishops`. Free text for v1. **Blank means the work has no author**, which moves the title into the author position (a Bible, a dictionary). |
| `year` | Date element | The year, whenever known. Required in practice. |
| `published_on` | Date element for dated article/web kinds | Full date; only when the publisher states one. |
| `kind` | Grouping on `/sources/`, date rule | `magisterial`, `book`, `journal-article`, `chapter`, `web`, `magazine`, `thesis`. |
| `title` | Italic span (standalone) or plain span (periodical) | Sentence case. No trailing date — the date is the Date element. No edition statement — that is `edition`. |
| `edition` | Straight after the title, outside the italics | No parentheses in the stored value: store `2nd ed.`, APA 7 adds the brackets. |
| `publisher` | Standalone entries | Omitted automatically when identical to `authors`. |
| `journal`/`volume`/`issue`/`pages` | Periodical entries | Presence of `journal` selects the periodical shape. |
| `doi` | Preferred locator | Bare DOI, no `https://doi.org/` prefix. Rendered as the full https URL. |
| `url` | Fallback locator | Used only when there is no DOI. |
| `note` | not printed | Localized editorial note. |

## 6. Checklist before a source ships

1. The URL resolves, and the entry is built from the page itself, not from memory.
2. The date is the publisher's own, and it is the most specific one the page states.
3. `n.d.` appears nowhere in the rendered bibliography.
4. The title has no trailing date and is in sentence case, and any edition statement is in
   `edition`, not in the title.
5. The publisher is not a repeat of the author.
6. Every in-text citation for this source uses the same year.
7. `verified_on` is set only if step 1 actually happened today.
8. The `/es/` bibliography reads the same (the entries are shared; only `note` is localized).
