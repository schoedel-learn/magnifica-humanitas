#!/usr/bin/env node
/**
 * capture.mjs — turn a DOI or an ISBN into a stub entry file, using publisher- or
 * library-supplied metadata instead of typing.
 *
 * Usage (from bibliography/):
 *   node scripts/capture.mjs 10.1007/s11019-025-10290-7
 *   node scripts/capture.mjs --isbn 9780268006983
 *   node scripts/capture.mjs <id> --seen-in frantz-2025-reclaiming-human-dignity --tags human-dignity,soul
 *   node scripts/capture.mjs <id> --dry-run
 *
 * The stub is deliberately INCOMPLETE: metadata_source is recorded, tags start empty, and
 * anything the source cannot supply is listed under `to_verify`. An existing entry is never
 * overwritten. Authors are left in the source's own words for a human to put into APA 7 order.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const UA = 'magnifica-humanitas-bibliography/1.0 (mailto:contact@schoedel.design)'

export const slugify = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const STOP = new Set([
  'the', 'a', 'an', 'of', 'and', 'in', 'on', 'to', 'for', 'as', 'is', 'are', 'with',
  'between', 'from', 'its', 'why', 'about', 'into', 'at', 'by',
])

/** author-year-titlewords, e.g. nussbaum-2006-frontiers-of-justice */
export function citekey({ family, year, title }) {
  const words = slugify(title ?? '')
    .split('-')
    .filter((w) => w && !STOP.has(w))
    .slice(0, 3)
  return [slugify(family ?? 'anon'), year ?? 'nd', ...words].join('-')
}

const initials = (given = '') =>
  given
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.includes('-') ? w.split('-').map((p) => `${p[0]}.`).join('-') : `${w[0]}.`))
    .join(' ')

/** Crossref `author` array -> { authors: APA 7 string, creators: ["Family, I. N."] } */
export function formatAuthors(people = []) {
  const creators = people.map((p) =>
    p.family ? `${p.family}, ${initials(p.given)}`.trim() : (p.name ?? '').trim()
  )
  const authors =
    creators.length <= 1
      ? creators[0] ?? ''
      : `${creators.slice(0, -1).join(', ')}, & ${creators[creators.length - 1]}`
  return { authors, creators }
}

const CROSSREF_KIND = {
  'journal-article': 'journal-article',
  book: 'book',
  monograph: 'book',
  'book-chapter': 'chapter',
  'reference-entry': 'chapter',
  'proceedings-article': 'chapter',
  'edited-book': 'book',
  report: 'web',
  'posted-content': 'web',
  'web-resource': 'web',
  dataset: 'web',
}

/** Crossref work message -> entry stub. Pure: no network, so it is testable. */
export function crossrefToEntry(work, { seenIn = [], tags = [], today } = {}) {
  const kind = CROSSREF_KIND[work.type] ?? 'web'
  const { authors, creators } = formatAuthors(work.author ?? [])
  const year =
    work['published-print']?.['date-parts']?.[0]?.[0] ??
    work.issued?.['date-parts']?.[0]?.[0] ??
    work['published-online']?.['date-parts']?.[0]?.[0]
  const title = Array.isArray(work.title) ? work.title[0] : work.title
  const toVerify = []
  if (!authors) toVerify.push('authors (the record carries none — a corporate or missing author)')
  if (!year) toVerify.push('year')
  if (kind === 'book') toVerify.push('publisher as printed on the title page')
  if (kind === 'chapter') toVerify.push('editors and page range as printed in the book')

  const entry = {
    id: citekey({ family: (work.author ?? [])[0]?.family, year, title }),
    kind,
    authors,
    ...(creators.length > 1 ? { creators } : {}),
    title,
    year: year ?? null,
    publisher: work.publisher,
    journal: work['container-title']?.[0],
    volume: work.volume,
    issue: work.issue,
    pages: work.page?.replace(/-/g, '–'),
    doi: (work.DOI ?? '').toLowerCase(),
    tags,
    tags_proposed: [],
    seen_in: seenIn,
    metadata_source: 'crossref',
    verified_on: today,
    note: '',
    to_verify: toVerify,
  }
  return dropEmpty(entry)
}

/** Open Library edition JSON -> entry stub. ISBN resolves one edition, which is what an ISBN means. */
export function openlibraryToEntry(edition, { seenIn = [], tags = [], today } = {}) {
  const byStatement = String(edition.by_statement ?? '').replace(/\.$/, '')
  const year = Number(String(edition.publish_date ?? '').match(/\d{4}/)?.[0]) || null
  const subtitle = edition.subtitle ? `: ${edition.subtitle}` : ''
  const entry = {
    id: citekey({ family: byStatement.split(/[,\s]+/)[0], year, title: edition.title }),
    kind: 'book',
    authors: byStatement,
    title: `${edition.title}${subtitle}`,
    year,
    publisher: edition.publishers?.[0],
    isbn: (edition.isbn_13 ?? [])[0] ?? (edition.isbn_10 ?? [])[0],
    tags,
    tags_proposed: [],
    seen_in: seenIn,
    metadata_source: 'openlibrary',
    verified_on: today,
    note: '',
    to_verify: [
      'authors in APA 7 order (Open Library gives a by-statement, not a creator list)',
      'publisher and year as printed on the title page',
      'subtitle wording and capitalisation',
    ],
  }
  return dropEmpty(entry)
}

function dropEmpty(o) {
  const out = {}
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v) && !v.length && k !== 'tags' && k !== 'tags_proposed' && k !== 'seen_in') continue
    if (Array.isArray(v) && (k === 'tags' || k === 'tags_proposed' || k === 'seen_in')) {
      out[k] = v
      continue
    }
    out[k] = v
  }
  out.tags ??= []
  out.tags_proposed ??= []
  out.seen_in ??= []
  return out
}

const HEADER = (source) => `# Captured from ${source} by scripts/capture.mjs on %DATE%.
# Stub: fill the tags, confirm every field against the publisher's own page, then delete
# this header and run \`node scripts/build.mjs\`.
`

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

export function writeEntry(dir, entry, { today, header = true } = {}) {
  const file = path.join(dir, `${entry.id}.yml`)
  if (fs.existsSync(file)) throw new Error(`refusing to overwrite existing entry ${file}`)
  fs.mkdirSync(dir, { recursive: true })
  const body = yaml.dump(entry, { lineWidth: 100, noRefs: true, quotingType: '"' })
  fs.writeFileSync(file, `${header ? HEADER(entry.metadata_source).replace('%DATE%', today) : ''}${body}`)
  return file
}

async function main() {
  const argv = process.argv.slice(2)
  const flags = {}
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--isbn') flags.isbn = true
    else if (a === '--dry-run') flags.dryRun = true
    else if (a === '--tags') flags.tags = argv[++i]
    else if (a === '--seen-in') flags.seenIn = argv[++i]
    else if (a.startsWith('--')) {
      console.error(`unknown flag ${a}`)
      process.exit(2)
    } else positional.push(a)
  }
  const arg = positional[0]
  if (!arg) {
    console.error('usage: node scripts/capture.mjs <doi|isbn> [--isbn] [--tags a,b] [--seen-in <id>] [--dry-run]')
    process.exit(2)
  }
  const tags = (flags.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean)
  const seenIn = flags.seenIn ? [flags.seenIn] : []
  const today = new Date().toISOString().slice(0, 10)
  let entry
  if (flags.isbn) {
    entry = openlibraryToEntry(await fetchJson(`https://openlibrary.org/isbn/${arg}.json`), { seenIn, tags, today })
  } else {
    const work = (await fetchJson(`https://api.crossref.org/works/${encodeURIComponent(arg)}`)).message
    entry = crossrefToEntry(work, { seenIn, tags, today })
  }
  if (flags.dryRun) {
    process.stdout.write(yaml.dump(entry, { lineWidth: 100, noRefs: true }))
    return
  }
  const file = writeEntry(path.join(ROOT, 'entries'), entry)
  console.log(`wrote ${path.relative(ROOT, file)}`)
  console.log('next: put the authors in APA 7 order, check the fields at the publisher, add tags, then node scripts/build.mjs')
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(HERE, 'capture.mjs')) {
  main().catch((err) => {
    console.error(`capture failed: ${err.message}`)
    process.exit(1)
  })
}
