#!/usr/bin/env node
/**
 * build.mjs — validate the bibliography, then render every derived file.
 *
 * Usage (from bibliography/):
 *   node scripts/build.mjs           validate, then write all generated files
 *   node scripts/build.mjs --check   render in memory; exit 1 if anything on disk is stale
 *   node scripts/build.mjs --stats   print counts only (used by tests)
 *
 * Node + js-yaml only. Output is deterministic: no timestamps are written, so --check is a
 * real staleness gate rather than a diff churn generator.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const HERE = path.dirname(fileURLToPath(import.meta.url))

/** Kind values are the site's own enum (cms/src/collections/Sources.ts) so a later promotion
 *  to a `sources` row is a 1:1 mapping rather than a translation. */
export const KINDS = ['magisterial', 'book', 'journal-article', 'chapter', 'web', 'magazine', 'thesis']
export const KIND_ORDER = ['book', 'chapter', 'journal-article', 'magisterial', 'thesis', 'magazine', 'web']
export const KIND_LABEL = {
  book: 'Books',
  chapter: 'Chapters in books',
  'journal-article': 'Journal articles',
  magisterial: 'Magisterial documents',
  thesis: 'Theses',
  magazine: 'Magazine articles',
  web: 'Web documents',
}
/** Singular form, for the "1 web document" count line. */
export const KIND_ONE = {
  book: 'book',
  chapter: 'chapter in a book',
  'journal-article': 'journal article',
  magisterial: 'magisterial document',
  thesis: 'thesis',
  magazine: 'magazine article',
  web: 'web document',
}
export const METADATA_SOURCES = ['crossref', 'openlibrary', 'publisher-page', 'in-article-list', 'mixed']
/** Kinds whose publisher states a full date, per docs/citations-style.md §2. A journal article
 *  in a paginated issue is cited by year, so its `published_on` stays empty and the online-first
 *  date belongs in `note`. */
export const FULL_DATE_KINDS = new Set(['web', 'magazine'])

// ---------------------------------------------------------------- loading

export function load(root) {
  const vocabFile = path.join(root, 'vocabulary.yml')
  const vocab = yaml.load(fs.readFileSync(vocabFile, 'utf8'))
  const dir = path.join(root, 'entries')
  const entries = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.yml'))
    .sort()
    .map((f) => {
      const entry = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8'))
      entry.__file = f
      return entry
    })
  return { vocab, entries }
}

export function vocabIndex(vocab) {
  const index = new Map()
  for (const tag of vocab.tags ?? []) index.set(tag.id, tag)
  return index
}

// ---------------------------------------------------------------- validation

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export function validate(entries, vocab) {
  const errors = []
  const warnings = []
  const tags = vocabIndex(vocab)
  const ids = new Set(entries.map((e) => e.id))

  for (const e of entries) {
    const where = `entries/${e.__file}`
    const err = (m) => errors.push(`${where}: ${m}`)
    const warn = (m) => warnings.push(`${where}: ${m}`)

    if (!e.id) err('missing id')
    else {
      if (!ID_RE.test(e.id)) err(`id "${e.id}" is not kebab-case`)
      if (`${e.id}.yml` !== e.__file) err(`id "${e.id}" does not match filename "${e.__file}"`)
    }
    if (!KINDS.includes(e.kind)) err(`kind "${e.kind}" is not one of ${KINDS.join('|')}`)
    // A work may be entered with a KNOWN GAP — a classical text whose edition the source list
    // never states — but only when `to_verify` names the gap, and the renderer prints no date
    // rather than inventing one.
    if (!Number.isInteger(e.year) && !e.to_verify)
      err('year must be an integer (or a `to_verify` naming the missing date)')
    if (typeof e.title !== 'string' || !e.title.trim()) err('missing title')

    const title = e.title ?? ''
    if (/\bn\.d\./i.test(title)) err('title contains "n.d." — a date must be found, not placeholdered')
    if (/(\b\d+(st|nd|rd|th)?\s+ed\b|\bedition\b)/i.test(title))
      err('title contains an edition statement — it belongs in `edition`')
    if (/\b(19|20)\d{2}\b/.test(title)) warn('title contains a year — a trailing date belongs in the date element')

    if (e.doi && /^https?:\/\//i.test(e.doi)) err('doi must be bare, without the https://doi.org/ prefix')
    if (e.published_on) {
      if (!ISO_RE.test(e.published_on)) err('published_on must be YYYY-MM-DD')
      else if (Number(e.published_on.slice(0, 4)) !== e.year) err('published_on year disagrees with year')
    }
    if (e.verified_on && !ISO_RE.test(e.verified_on)) err('verified_on must be YYYY-MM-DD')
    if (e.metadata_source && !METADATA_SOURCES.includes(e.metadata_source))
      err(`metadata_source "${e.metadata_source}" is not one of ${METADATA_SOURCES.join('|')}`)
    if (!e.metadata_source) warn('no metadata_source — say where the metadata was read from')

    const authors = (e.authors ?? '').trim()
    if (authors && /&/.test(authors) && !Array.isArray(e.creators))
      warn('multiple creators but no `creators` list — exports will use one combined AU field')

    // Online-resolvable material is expected to carry a locator; a print book is found by ISBN.
    if (!e.doi && !e.url && ['journal-article', 'web', 'magazine'].includes(e.kind))
      warn('no doi and no url — the reference cannot be resolved from the entry')

    if (e.kind === 'journal-article' && !e.journal) err('journal-article without `journal`')
    if (e.kind === 'chapter') {
      if (!e.container_title && !e.to_verify) err('chapter without `container_title`')
      if (!e.editors && !e.to_verify) err('chapter without `editors` (APA prints them in the In… position)')
      if (!e.pages) err('chapter without `pages`')
    }
    if (e.kind === 'book' && !e.publisher && !e.to_verify) err('book without `publisher`')

    const approved = e.tags ?? []
    const proposed = e.tags_inferred ?? []
    if (!Array.isArray(approved) || !Array.isArray(proposed)) {
      err('tags and tags_inferred must be lists')
      continue
    }
    if (approved.length + proposed.length === 0)
      err('no tags — an untagged work is invisible in the tag index')
    // `tags` vs `tags_inferred` records WHERE an assignment came from (the work's own title, or an
    // agent's reading). vocabulary.yml's status records WHETHER the concept is settled. They are
    // orthogonal: a title-borne tag may be a proposed concept, and an approved concept may be inferred.
    for (const t of approved) {
      if (!tags.has(t)) err(`tag "${t}" is not in vocabulary.yml`)
    }
    for (const t of proposed) {
      if (!tags.has(t)) err(`inferred tag "${t}" is not in vocabulary.yml`)
      if (approved.includes(t)) err(`tag "${t}" appears in both tags and tags_inferred`)
    }
    for (const seen of e.seen_in ?? []) {
      if (seen === e.id) err('seen_in refers to itself')
      else if (!ids.has(seen)) err(`seen_in refers to unknown entry "${seen}"`)
    }
  }

  // ref_no: the position a work holds in the seed list it came from. For a seed that declares
  // reference_count, the numbers of the works carrying it must be exactly 1..reference_count —
  // so a skipped or duplicated reference cannot pass unnoticed.
  for (const e of entries) {
    if (e.ref_no === undefined) continue
    if (!Number.isInteger(e.ref_no) || e.ref_no < 1) errors.push(`entries/${e.__file}: ref_no must be a positive integer`)
    if ((e.seen_in ?? []).length !== 1)
      errors.push(`entries/${e.__file}: ref_no only makes sense with exactly one seen_in`)
  }
  for (const seed of entries.filter((e) => e.reference_count)) {
    const carried = entries.filter((e) => (e.seen_in ?? []).includes(seed.id))
    const numbers = carried.map((e) => e.ref_no).filter((n) => Number.isInteger(n)).sort((a, b) => a - b)
    const expected = Array.from({ length: seed.reference_count }, (_, i) => i + 1)
    if (JSON.stringify(numbers) !== JSON.stringify(expected)) {
      const missing = expected.filter((n) => !numbers.includes(n))
      const extra = numbers.filter((n) => !expected.includes(n))
      errors.push(
        `${seed.id}: declares ${seed.reference_count} references but the carried ref_no values are wrong` +
          (missing.length ? `; missing ${missing.join(', ')}` : '') +
          (extra.length ? `; out of range ${extra.join(', ')}` : '') +
          (numbers.length !== expected.length && !missing.length ? `; found ${numbers.length} works` : '')
      )
    }
  }

  // vocabulary lint (warnings: a tag with no work is a prune candidate, not an error)
  const used = new Set()
  for (const e of entries) for (const t of [...(e.tags ?? []), ...(e.tags_inferred ?? [])]) used.add(t)
  for (const tag of vocab.tags ?? []) {
    if (!used.has(tag.id)) warnings.push(`vocabulary.yml: tag "${tag.id}" has no works (prune candidate)`)
    if (!['concept', 'venue', 'field', 'person', 'method'].includes(tag.axis))
      errors.push(`vocabulary.yml: tag "${tag.id}" has unknown axis "${tag.axis}"`)
    if (!['approved', 'proposed'].includes(tag.status))
      errors.push(`vocabulary.yml: tag "${tag.id}" has unknown status "${tag.status}"`)
  }
  return { errors, warnings }
}

// ---------------------------------------------------------------- rendering

const sortKey = (e) => ((e.authors ?? '').trim() || e.title).toLowerCase()
const sortEntries = (entries) =>
  [...entries].sort((a, b) =>
    sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : String(a.year).localeCompare(String(b.year))
  )

function apaDate(e) {
  if (!e.year) return 'no date recorded'
  if (FULL_DATE_KINDS.has(e.kind) && e.published_on) {
    const d = new Date(`${e.published_on}T00:00:00Z`)
    const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })
    return `${e.year}, ${month} ${d.getUTCDate()}`
  }
  return String(e.year)
}

const titleParens = (e) => {
  const bits = []
  if (e.translator) bits.push(`${e.translator}, Trans.`)
  if (e.edition) bits.push(e.edition)
  return bits.length ? ` (${bits.join('; ')})` : ''
}

/** One APA 7 entry, mirroring the two shapes in docs/citations-style.md: standalone work vs
 *  periodical, with a blank `authors` moving the title into the author position. */
export function apaEntry(e) {
  const hasAuthors = Boolean((e.authors ?? '').trim())
  const author = hasAuthors ? e.authors.trim() : ''
  // APA 7 closes the author element with a period; a personal name already ends in one
  // ("McCrudden, C."), a corporate author does not ("United Nations General Assembly").
  const authorEl = /[.!?]$/.test(author) ? author : `${author}.`
  const date = `(${apaDate(e)})`
  const locator = e.doi ? `https://doi.org/${e.doi}` : e.url || ''
  const tail = locator ? ` ${locator}` : ''
  const lead = hasAuthors ? `${authorEl} ${date}.` : `*${e.title}*${titleParens(e)} ${date}.`
  const titleEl = hasAuthors ? `*${e.title}*${titleParens(e)}.` : ''

  if (e.kind === 'journal-article') {
    const vol = e.volume ? `, ${e.volume}${e.issue ? `(${e.issue})` : ''}` : ''
    const pp = e.pages ? `, ${e.pages}` : ''
    return `${lead} ${hasAuthors ? `${e.title}.` : ''} *${e.journal}*${vol}${pp}.${tail}`.replace(/\s+/g, ' ')
  }
  if (e.kind === 'chapter') {
    const inner = [e.edition, e.pages ? `pp. ${e.pages}` : null].filter(Boolean).join(', ')
    const eds = e.editors ? `In ${e.editors} (${/&/.test(e.editors) ? 'Eds.' : 'Ed.'}), ` : 'In '
    const chapPub = e.publisher ? ` ${e.publisher}.` : ''
    return `${lead} ${hasAuthors ? `${e.title}.` : ''} ${eds}*${e.container_title}*${inner ? ` (${inner})` : ''}.${chapPub}${tail}`
      .replace(/\s+/g, ' ')
  }
  const pub = e.publisher ? `${e.publisher}.` : ''
  return `${lead} ${titleEl} ${pub}${tail}`.replace(/\s+/g, ' ')
}

/** Short label for index tables: "Spaemann (2006)", "Pellegrino & Thomasma (1993)". */
export function shortLabel(e) {
  let surnames
  if (Array.isArray(e.creators) && e.creators.length) {
    surnames = e.creators.map((c) => String(c).split(',')[0].trim())
  } else if ((e.authors ?? '').trim()) {
    surnames = e.authors
      .split(/,\s*&\s*|\s+&\s+/)
      .map((p) => p.split(',')[0].trim())
      .filter(Boolean)
  } else {
    // a work with no author takes its title; keep the label readable rather than three words wide
    const words = e.title.split(/\s+/)
    surnames = [words.length > 5 ? `${words.slice(0, 5).join(' ')}…` : words.join(' ')]
  }
  let name
  if (surnames.length === 1) name = surnames[0]
  else if (surnames.length === 2) name = `${surnames[0]} & ${surnames[1]}`
  else name = `${surnames[0]} et al.`
  return `${name} (${e.year ?? 'no date'})`
}

const link = (e) => `[${shortLabel(e)}](exhaustive-bibliography.md#${e.id})`
const cell = (s) => String(s).replace(/\|/g, '\\|')

function tagIndexRows(entries, vocab) {
  const used = new Map()
  for (const e of entries)
    for (const [list, inferred] of [
      [e.tags ?? [], false],
      [e.tags_inferred ?? [], true],
    ])
      for (const t of list) {
        if (!used.has(t)) used.set(t, [])
        used.get(t).push({ entry: e, inferred })
      }
  for (const list of used.values()) list.sort((a, b) => shortLabel(a.entry).localeCompare(shortLabel(b.entry)))
  return { used, tags: vocab.tags ?? [] }
}

export function renderBibliography(entries, vocab, { sourceArticleId } = {}) {
  const out = []
  out.push('# Exhaustive Bibliography')
  out.push('')
  out.push(
    `A research bibliography — ${entries.length} works, gathered to be *used*, not to be published.`
  )
  out.push('')
  out.push('- **Generated file.** Edit `entries/*.yml` and `vocabulary.yml`, then run `node scripts/build.mjs`.')
  out.push('- **Not the site bibliography.** Nothing here is published. A work is promoted to a live')
  out.push('  `sources` row only when an essay actually cites it (see `docs/citations-style.md` §3).')
  out.push('- **Tag index:** [`tag-index.md`](tag-index.md) · **vocabulary:** `vocabulary.yml` ·')
  out.push('  **machine-readable:** `index.json`, `exports/` (CSL-JSON, RIS, BibTeX).')
  out.push('')
  const kinds = {}
  for (const e of entries) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1
  out.push(
    Object.entries(kinds)
      .sort((a, b) => KIND_ORDER.indexOf(a[0]) - KIND_ORDER.indexOf(b[0]))
      .map(([k, n]) => `${n} ${n === 1 ? KIND_ONE[k] : KIND_LABEL[k].toLowerCase()}`)
      .join(' · ')
  )
  out.push('')

  for (const kind of KIND_ORDER) {
    const group = sortEntries(entries.filter((e) => e.kind === kind))
    if (!group.length) continue
    out.push(`## ${KIND_LABEL[kind]}`)
    out.push('')
    for (const e of group) {
      out.push(`### ${e.id}`)
      out.push('')
      out.push(apaEntry(e))
      out.push('')
      const approved = (e.tags ?? []).map((t) => `\`${t}\``).join(' ')
      const inferred = (e.tags_inferred ?? []).map((t) => `\`${t}?\``).join(' ')
      const bits = []
      if (approved) bits.push(approved)
      if (inferred) bits.push(`inferred: ${inferred}`)
      if (e.seen_in?.length) bits.push(`seen in: ${e.seen_in.map((s) => `\`${s}\``).join(', ')}`)
      if (e.metadata_source) bits.push(`${e.metadata_source}, verified ${e.verified_on ?? '—'}`)
      out.push(bits.join(' · '))
      if (e.original_title || e.original_year || e.isbn) out.push('')
      if (e.original_title || e.original_year)
        out.push(
          `Originally published as *${e.original_title ?? ''}*${e.original_year ? ` (${e.original_year})` : ''}.`
        )
      if (e.isbn) out.push(`ISBN ${e.isbn}.`)
      if (e.note) {
        out.push('')
        out.push(`> ${String(e.note).trim().replace(/\n/g, ' ')}`)
      }
      out.push('')
    }
  }

  const repaired = sortEntries(entries.filter((e) => e.discrepancy))
  if (repaired.length) {
    out.push('## Appendix A — works whose printed reference needed repair')
    out.push('')
    out.push(
      'The seed article\'s reference list is reproduced in Crossref exactly as published, typos'
    )
    out.push(
      'included. Each entry above carries the verified record; these are the differences, recorded'
    )
    out.push('rather than silently corrected.')
    out.push('')
    for (const e of repaired) {
      out.push(`**${e.id}**`)
      out.push('')
      out.push(`> ${String(e.discrepancy).trim().replace(/\n/g, ' ')}`)
      out.push('')
    }
  }

  const openItems = sortEntries(entries.filter((e) => e.to_verify))
  if (openItems.length) {
    out.push('## Appendix B — still to verify')
    out.push('')
    for (const e of openItems) {
      out.push(`- **${e.id}** — ${String(e.to_verify).trim().replace(/\n/g, ' ')}`)
    }
    out.push('')
  }

  if (sourceArticleId) {
    const article = entries.find((e) => e.id === sourceArticleId)
    const sourced = entries.filter((e) => (e.seen_in ?? []).includes(sourceArticleId))
    if (article?.reference_count) {
      out.push('## Appendix C — coverage of the seed reference list')
      out.push('')
      out.push(
        `${article.id} prints **${article.reference_count}** references; **${sourced.length}** of them `
      )
      out.push(
        `are entered here${article.reference_count === sourced.length ? '' : ' — the remainder is a gap to close'}.`
      )
      out.push('')
    }
  }

  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

export function renderTagIndex(entries, vocab) {
  const { used, tags } = tagIndexRows(entries, vocab)
  const byAxis = new Map()
  for (const tag of tags) {
    if (!byAxis.has(tag.axis)) byAxis.set(tag.axis, [])
    byAxis.get(tag.axis).push(tag)
  }
  const axisLabel = {
    concept: 'Concepts',
    venue: 'Venues (journals)',
    field: 'Fields',
    person: 'Persons',
    method: 'Methods',
  }
  const out = []
  out.push('# Tag index')
  out.push('')
  out.push(`${tags.length} tags over ${entries.length} works. Two separate questions are marked:`)
  out.push('')
  out.push('- *italics* — the **concept** is proposed: it is not yet a settled tag in `vocabulary.yml`.')
  out.push('- `?` after a work — the **assignment** is inferred: an agent read the work and put the tag')
  out.push('  there, rather than the tag being borne by the work\'s own title or journal. Confirm or drop.')
  out.push('')
  out.push('Definitions live in `vocabulary.yml`; every work links into [`exhaustive-bibliography.md`](exhaustive-bibliography.md).')
  out.push('')
  out.push('`grep -ril "recognition" entries/` also works, and needs no build.')
  out.push('')

  const workCell = (works) => works.map((w) => `${link(w.entry)}${w.inferred ? '?' : ''}`).join(' · ')

  out.push('## Quick lookup')
  out.push('')
  out.push('| Tag | Axis | Works |')
  out.push('| --- | --- | --- |')
  for (const tag of [...tags].sort((a, b) => a.id.localeCompare(b.id))) {
    const works = workCell(used.get(tag.id) ?? [])
    out.push(`| ${tag.status === 'proposed' ? `*${tag.id}*` : `**${tag.id}**`} | ${tag.axis} | ${cell(works) || '—'} |`)
  }
  out.push('')

  for (const [axis, label] of Object.entries(axisLabel)) {
    const group = (byAxis.get(axis) ?? []).sort((a, b) => a.id.localeCompare(b.id))
    if (!group.length) continue
    out.push(`## ${label}`)
    out.push('')
    for (const tag of group) {
      const works = used.get(tag.id) ?? []
      out.push(`### ${tag.id} — ${tag.label}`)
      out.push('')
      if (tag.aliases?.length) out.push(`Also written: ${tag.aliases.map((a) => `*${a}*`).join(', ')}.`)
      if (tag.note) out.push('')
      if (tag.note) out.push(String(tag.note).trim().replace(/\n/g, ' '))
      if (tag.status === 'proposed') {
        out.push('')
        out.push('**Proposed tag** — not yet in the vocabulary. Barry has not ruled on it.')
      }
      out.push('')
      if (works.length) out.push(`Works: ${workCell(works)}`)
      else out.push('Works: none yet.')
      out.push('')
    }
  }

  const proposedTags = tags.filter((t) => t.status === 'proposed')
  out.push('## Awaiting a decision')
  out.push('')
  out.push('### Proposed tags — should the concept exist at all?')
  out.push('')
  out.push('| Tag | Would apply to |')
  out.push('| --- | --- |')
  for (const tag of proposedTags) {
    const works = workCell(used.get(tag.id) ?? [])
    out.push(`| ${tag.id} | ${cell(works) || '—'} |`)
  }
  out.push('')
  out.push('### Inferred assignments — an agent read the work and put the tag there')
  out.push('')
  out.push('| Tag | Works awaiting confirmation |')
  out.push('| --- | --- |')
  let inferredTotal = 0
  for (const tag of [...tags].sort((a, b) => a.id.localeCompare(b.id))) {
    if (tag.status === 'proposed') continue
    const works = (used.get(tag.id) ?? []).filter((w) => w.inferred)
    inferredTotal += works.length
    if (works.length) out.push(`| ${tag.id} | ${cell(workCell(works))} |`)
  }
  out.push('')
  out.push(
    `**${inferredTotal} inferred assignment(s)** across ${entries.length} works. Confirming one means moving`
  )
  out.push('the id from `tags_inferred` to `tags` in that entry; dropping one means deleting it.')
  out.push('')

  out.push('## Lint')
  out.push('')
  const unused = tags.filter((t) => !(used.get(t.id) ?? []).length)
  out.push(
    `- Tags in the vocabulary with no works (prune candidates): ${
      unused.length ? unused.map((t) => `\`${t.id}\``).join(', ') : 'none'
    }`
  )
  out.push('- Tag ids used in an entry but absent from the vocabulary: none — the build fails on those.')
  const once = tags.filter((t) => (used.get(t.id) ?? []).length === 1).length
  out.push(`- Tags carried by exactly one work: ${once} of ${tags.length}. Expected in a first batch.`)
  out.push('')

  const counts = new Map()
  for (const e of entries) {
    const n = (e.seen_in ?? []).length
    counts.set(n, (counts.get(n) ?? 0) + 1)
  }
  out.push('## Works by how many source lists carry them')
  out.push('')
  out.push('| Carried by | Works |')
  out.push('| --- | --- |')
  for (const n of [...counts.keys()].sort((a, b) => b - a)) {
    const group = sortEntries(entries.filter((e) => (e.seen_in ?? []).length === n))
    // listing eighty-nine single-list works would bury the signal; only 2+ is worth naming
    out.push(
      `| ${n === 0 ? '— (a seed essay)' : n} | ${
        n === 1 ? `${group.length} works, each seen in one list so far` : cell(group.map(link).join(' · '))
      } |`
    )
  }
  out.push('')
  out.push(
    'A work carried by several of the lists you ingest is load-bearing for the argument they share.'
  )
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

const CSL_TYPE = {
  book: 'book',
  'journal-article': 'article-journal',
  chapter: 'chapter',
  web: 'webpage',
  magazine: 'article-magazine',
  thesis: 'thesis',
  magisterial: 'document',
}

export function renderIndexJson(entries, vocab) {
  const { used, tags } = tagIndexRows(entries, vocab)
  const entryMap = {}
  for (const e of sortEntries(entries)) {
    entryMap[e.id] = {
      id: e.id,
      kind: e.kind,
      authors: e.authors ?? '',
      creators: e.creators ?? [],
      title: e.title,
      year: e.year,
      publisher: e.publisher ?? null,
      journal: e.journal ?? null,
      container_title: e.container_title ?? null,
      doi: e.doi ?? null,
      url: e.url ?? null,
      tags: e.tags ?? [],
      tags_inferred: e.tags_inferred ?? [],
      seen_in: e.seen_in ?? [],
      doi_url: e.doi ? `https://doi.org/${e.doi}` : null,
      csl_type: CSL_TYPE[e.kind] ?? 'document',
    }
  }
  const tagMap = {}
  for (const tag of [...tags].sort((a, b) => a.id.localeCompare(b.id))) {
    tagMap[tag.id] = {
      label: tag.label,
      axis: tag.axis,
      status: tag.status,
      origin: tag.origin,
      aliases: tag.aliases ?? [],
      note: tag.note ? String(tag.note).trim().replace(/\n/g, ' ') : null,
      entries: (used.get(tag.id) ?? []).map((w) => w.entry.id),
      inferred_entries: (used.get(tag.id) ?? []).filter((w) => w.inferred).map((w) => w.entry.id),
    }
  }
  return `${JSON.stringify(
    {
      bibliography: 'Exhaustive Bibliography',
      note: 'Generated by scripts/build.mjs — edit entries/*.yml and vocabulary.yml',
      counts: { entries: entries.length, tags: tags.length },
      tags: tagMap,
      entries: entryMap,
    },
    null,
    2
  )}\n`
}

export function renderCsl(entries) {
  const items = sortEntries(entries).map((e) => {
    const item = {
      id: e.id,
      type: CSL_TYPE[e.kind] ?? 'document',
      title: e.title,
      author: (e.creators ?? (e.authors ? [e.authors] : [])).map((a) =>
        /,/.test(a) ? { family: a.split(',')[0].trim(), given: a.split(',').slice(1).join(',').trim() } : { literal: a }
      ),
      issued: e.year ? { 'date-parts': [[e.year]] } : undefined,
      'container-title': e.container_title ?? e.journal ?? undefined,
      publisher: e.publisher ?? undefined,
      volume: e.volume ?? undefined,
      issue: e.issue ?? undefined,
      page: e.pages ?? undefined,
      DOI: e.doi ?? undefined,
      URL: e.url ?? undefined,
      ISBN: e.isbn ?? undefined,
      translator: e.translator ? [{ literal: e.translator }] : undefined,
      keyword: [...(e.tags ?? []), ...(e.tags_inferred ?? []).map((t) => `${t}?`)],
      note: e.note ? String(e.note).trim().replace(/\n/g, ' ') : undefined,
    }
    for (const [k, v] of Object.entries(item)) if (v === undefined) delete item[k]
    return item
  })
  return `${JSON.stringify(items, null, 2)}\n`
}

const RIS_TYPE = {
  book: 'BOOK',
  chapter: 'CHAP',
  'journal-article': 'JOUR',
  web: 'ELEC',
  magazine: 'MGZN',
  thesis: 'THES',
  magisterial: 'BOOK',
}

export function renderRis(entries) {
  const out = []
  for (const e of sortEntries(entries)) {
    const lines = [`TY  - ${RIS_TYPE[e.kind] ?? 'GEN'}`]
    const authors = e.creators?.length ? e.creators : e.authors ? [e.authors] : []
    for (const a of authors) lines.push(`AU  - ${a}`)
    lines.push(`TI  - ${e.title}`)
    if (e.container_title) lines.push(`T2  - ${e.container_title}`)
    if (e.editors) lines.push(`A2  - ${e.editors}`)
    if (e.journal) lines.push(`JO  - ${e.journal}`)
    if (e.volume) lines.push(`VL  - ${e.volume}`)
    if (e.issue) lines.push(`IS  - ${e.issue}`)
    if (e.pages) {
      const [sp, ep] = e.pages.split(/[–-]/).map((s) => s.trim())
      lines.push(`SP  - ${sp}`)
      if (ep) lines.push(`EP  - ${ep}`)
    }
    if (e.year) lines.push(`PY  - ${e.year}`)
    if (e.published_on) lines.push(`DA  - ${e.published_on}`)
    if (e.publisher) lines.push(`PB  - ${e.publisher}`)
    if (e.edition) lines.push(`ET  - ${e.edition}`)
    if (e.doi) lines.push(`DO  - ${e.doi}`)
    if (e.url) lines.push(`UR  - ${e.url}`)
    if (e.isbn) lines.push(`SN  - ${e.isbn}`)
    for (const t of e.tags ?? []) lines.push(`KW  - ${t}`)
    for (const t of e.tags_inferred ?? []) lines.push(`KW  - ${t}?`)
    if (e.note) lines.push(`N2  - ${String(e.note).trim().replace(/\n/g, ' ')}`)
    lines.push(`ID  - ${e.id}`)
    lines.push('ER  - ')
    out.push(lines.join('\n'))
  }
  return `${out.join('\n\n')}\n`
}

const BIB_TYPE = { book: 'book', chapter: 'incollection', 'journal-article': 'article', web: 'misc', magazine: 'article', thesis: 'phdthesis', magisterial: 'book' }

export function renderBib(entries) {
  const out = [
    '% Generated by scripts/build.mjs — edit entries/*.yml, not this file.',
    '% `?` in keywords marks a tag proposed and not yet approved.',
    '',
  ]
  for (const e of sortEntries(entries)) {
    const authors = (e.creators?.length ? e.creators : e.authors ? [e.authors] : []).join(' and ')
    const fields = []
    fields.push(['author', authors])
    fields.push(['title', e.title.replace(/\*/g, '')])
    if (e.container_title) fields.push(['booktitle', e.container_title])
    if (e.journal) fields.push(['journal', e.journal])
    if (e.volume) fields.push(['volume', e.volume])
    if (e.issue) fields.push(['number', e.issue])
    if (e.pages) fields.push(['pages', e.pages.replace('–', '--')])
    if (e.publisher) fields.push(['publisher', e.publisher])
    if (e.year) fields.push(['year', String(e.year)])
    if (e.edition) fields.push(['edition', e.edition])
    if (e.doi) fields.push(['doi', e.doi])
    if (e.url) fields.push(['url', e.url])
    if (e.isbn) fields.push(['isbn', e.isbn])
    const keywords = [...(e.tags ?? []), ...(e.tags_inferred ?? []).map((t) => `${t}?`)]
    if (keywords.length) fields.push(['keywords', keywords.join(', ')])
    out.push(`@${BIB_TYPE[e.kind] ?? 'misc'}{${e.id},`)
    for (const [k, v] of fields.filter(([, v]) => v)) out.push(`  ${k} = {${v}},`)
    out.push(`  note = {Exhaustive Bibliography, ${e.metadata_source ?? 'unrecorded source'}}`)
    out.push('}')
    out.push('')
  }
  return out.join('\n')
}


/** Zotero item JSON, for the one-way reading mirror. POSTed to Zotero's connector
 *  (/connector/saveItems) or re-importable as a file; `extra` carries our citekey so an item can be
 *  traced back to its entry. */
const ZOTERO_TYPE = {
  book: 'book',
  chapter: 'bookSection',
  'journal-article': 'journalArticle',
  magisterial: 'document',
  web: 'webpage',
  magazine: 'magazineArticle',
  thesis: 'thesis',
}

export function renderZoteroItems(entries) {
  const items = sortEntries(entries).map((e) => {
    const creators = (e.creators?.length ? e.creators : (e.authors ?? '').trim() ? [e.authors.trim()] : []).map(
      (a) => {
        const raw = String(a).trim()
        if (!raw.includes(',')) return { lastName: raw, creatorType: 'author', fieldMode: 1 }
        return { lastName: raw.split(',')[0].trim(), firstName: raw.split(',').slice(1).join(',').trim(), creatorType: 'author' }
      }
    )
    const item = {
      itemType: ZOTERO_TYPE[e.kind] ?? 'document',
      title: e.title,
      creators,
      date: e.published_on ?? (e.year ? String(e.year) : ''),
      DOI: e.doi ?? '',
      url: e.url ?? (e.doi ? `https://doi.org/${e.doi}` : ''),
      extra: `Citekey: ${e.id}`,
      tags: [...(e.tags ?? []), ...(e.tags_inferred ?? []).map((t) => `${t}?`)].map((t) => ({ tag: t })),
      notes: e.note ? [{ note: String(e.note).trim().replace(/\n/g, ' ') }] : [],
    }
    if (e.journal) item.publicationTitle = e.journal
    if (e.container_title) item.bookTitle = e.container_title
    if (e.kind === 'web' && e.publisher) item.websiteTitle = e.publisher
    if (e.kind === 'magazine' && e.publisher) item.publicationTitle = e.publisher
    if (e.publisher && !item.publicationTitle && e.kind !== 'web') item.publisher = e.publisher
    if (e.volume) item.volume = e.volume
    if (e.issue) item.issue = e.issue
    if (e.pages) item.pages = e.pages
    if (e.edition) item.edition = e.edition
    if (e.isbn) item.ISBN = e.isbn
    if (e.translator && e.kind === 'book')
      item.creators.push({ lastName: e.translator.split(',')[0].trim(), firstName: e.translator.split(',').slice(1).join(',').trim(), creatorType: 'translator' })
    return item
  })
  return `${JSON.stringify(items, null, 2)}\n`
}


/** One file per seed essay: every work its reference list cites, in the list's own order. */
export function renderEssay(seed, entries) {
  const carried = entries
    .filter((e) => (e.seen_in ?? []).includes(seed.id))
    .sort((a, b) => (a.ref_no ?? 999) - (b.ref_no ?? 999))
  const out = []
  out.push(`# ${shortLabel(seed)} — the reference list of "${seed.title}"`)
  out.push('')
  out.push('*Generated file — edit the entries, not this.*')
  out.push('')
  out.push(apaEntry(seed))
  if (seed.url) out.push('')
  out.push('')
  out.push(
    `All **${carried.length}** works this essay cites${seed.reference_count ? ` (of ${seed.reference_count} declared)` : ''}, in the order the list prints them. ` +
      'The APA entry is the verified record; `?` marks a tag assignment an agent inferred rather than one the work\'s own title states.'
  )
  out.push('')
  for (const e of carried) {
    const tags = [...(e.tags ?? []), ...(e.tags_inferred ?? []).map((t) => `${t}?`)].map((t) => `\`${t}\``).join(' ')
    out.push(`**${e.ref_no ?? '—'}.** ${apaEntry(e)}`)
    out.push('')
    out.push(`${tags} · \`${e.id}\`${e.metadata_source ? ` · ${e.metadata_source}, verified ${e.verified_on ?? '—'}` : ''}`)
    if (e.note) out.push('')
    if (e.note) out.push(`> ${String(e.note).trim().replace(/\n/g, ' ')}`)
    if (e.discrepancy) out.push('')
    if (e.discrepancy) out.push(`**Repair recorded:** ${String(e.discrepancy).trim().replace(/\n/g, ' ')}`)
    if (e.to_verify) out.push('')
    if (e.to_verify) out.push(`**Still to verify:** ${[].concat(e.to_verify).join('; ')}`)
    out.push('')
  }
  const repairs = carried.filter((e) => e.discrepancy).length
  const open = carried.filter((e) => e.to_verify).length
  out.push('## State of this list')
  out.push('')
  out.push(`- ${carried.length} works entered, numbered 1–${carried.length} with no gaps (checked by \`build.mjs\`).`)
  out.push(`- ${repairs} carr${repairs === 1 ? 'ies' : 'y'} a recorded repair to the list as printed in the article.`)
  out.push(`- ${open} carr${open === 1 ? 'ies' : 'y'} a \`to_verify\` naming what is still open.`)
  out.push('')
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

export function render(entries, vocab, opts = {}) {
  const { used } = tagIndexRows(entries, vocab)
  const essays = {}
  for (const seed of entries.filter((e) => e.reference_count)) essays[`essays/${seed.id}.md`] = renderEssay(seed, entries)
  return {
    ...essays,
    'exhaustive-bibliography.md': renderBibliography(entries, vocab, opts),
    'tag-index.md': renderTagIndex(entries, vocab),
    'index.json': renderIndexJson(entries, vocab),
    'exports/csl.json': renderCsl(entries),
    'exports/references.ris': renderRis(entries),
    'exports/references.bib': renderBib(entries),
    'exports/zotero-items.json': renderZoteroItems(entries),
    _tagsUsed: used,
  }
}

// ---------------------------------------------------------------- cli

export function build({ root, check = false, stats = false, log = console } = {}) {
  const { vocab, entries } = load(root)
  const { errors, warnings } = validate(entries, vocab)
  if (errors.length) {
    log.error(`bibliography: ${errors.length} validation error(s)`)
    for (const e of errors) log.error(`  ${e}`)
    return { ok: false, errors, warnings, stale: [], written: false }
  }
  const files = render(entries, vocab, { sourceArticleId: 'frantz-2025-reclaiming-human-dignity' })
  delete files._tagsUsed
  // one place to guarantee no generated file ships trailing whitespace (and --check sees the same text)
  for (const [k, v] of Object.entries(files)) files[k] = v.replace(/[ \t]+$/gm, '')

  if (stats) {
    const approved = new Set()
    const inferred = new Set()
    for (const e of entries) {
      for (const t of e.tags ?? []) approved.add(t)
      for (const t of e.tags_inferred ?? []) inferred.add(t)
    }
    log.log(
      `entries=${entries.length} tags_in_vocab=${vocab.tags.length} tags_used=${new Set([...approved, ...inferred]).size} ` +
        `distinct_tags_stated_by_the_work_or_Barry=${approved.size} distinct_tags_inferred=${inferred.size}`
    )
    return { ok: true, errors, warnings, stale: [], written: false, counts: { entries: entries.length, approved, inferred } }
  }

  const stale = []
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel)
    const current = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null
    if (current !== content) stale.push(rel)
    if (!check && current !== content) {
      fs.mkdirSync(path.dirname(abs), { recursive: true })
      fs.writeFileSync(abs, content)
    }
  }
  for (const w of warnings) log.warn(`  warn: ${w}`)

  if (check && stale.length) {
    log.error(`bibliography: ${stale.length} generated file(s) out of date: ${stale.join(', ')}`)
    log.error('  run: node scripts/build.mjs')
    return { ok: false, errors, warnings, stale, written: false }
  }
  if (check) log.log(`bibliography: ${entries.length} entries, all generated files current`)
  else log.log(`bibliography: ${entries.length} entries, wrote ${stale.length} file(s)`)
  return { ok: true, errors, warnings, stale, written: !check }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(HERE, 'build.mjs')) {
  const root = path.resolve(HERE, '..')
  const result = build({
    root,
    check: process.argv.includes('--check'),
    stats: process.argv.includes('--stats'),
  })
  process.exit(result.ok ? 0 : 1)
}
