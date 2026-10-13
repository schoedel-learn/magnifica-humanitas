#!/usr/bin/env node
/**
 * file-downloads.mjs — identify PDFs you downloaded in a library session and file them.
 *
 *   node scripts/file-downloads.mjs --dir "<collection>"            # scans <collection>/inbox/
 *   node scripts/file-downloads.mjs --dir "<collection>" --dry-run  # say what it would do
 *
 * How it identifies a file, in order, never guessing silently:
 *   1. a DOI in the PDF's own text (publisher PDFs print it on page 1) matched against entries;
 *   2. the entry's title appearing in page 1's text;
 *   3. otherwise the file is listed as unidentified and left where it is.
 * A match is moved to pdf/<citekey>.pdf. An existing file for that citekey is never overwritten — it is
 * reported so you can compare. Whatever is filed still needs `collect-pdfs.mjs --manifest-only` and, to
 * reach Zotero, `attach-pdfs.mjs`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { load, shortLabel } from './build.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const REPO = path.resolve(ROOT, '..')

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag)
  return i === -1 ? fallback : process.argv[i + 1]
}
const dryRun = process.argv.includes('--dry-run')

const normalise = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

function textOf(pdf) {
  try {
    return execFileSync('pdftotext', ['-l', '3', '-layout', pdf, '-'], { maxBuffer: 32 * 1024 * 1024 }).toString()
  } catch {
    return ''
  }
}

function identify(text, entries) {
  const dois = [...String(text).matchAll(/10\.\d{4,9}\/[^\s"'<>,;)\]]+/g)].map((m) => m[0].replace(/[.,;]$/, '').toLowerCase())
  for (const doi of dois) {
    const hit = entries.find((e) => (e.doi ?? '').toLowerCase() === doi)
    if (hit) return { entry: hit, how: `DOI ${doi}` }
  }
  const flat = normalise(text).replace(/\s+/g, ' ')
  for (const e of entries) {
    const t = normalise(e.title)
    if (t.length >= 24 && flat.includes(t)) return { entry: e, how: 'the title appears in page 1' }
  }
  return { entry: null, doisFound: dois.slice(0, 3) }
}

const dir = path.resolve(arg('--dir', path.join(process.env.HOME, 'Documents/Research/Exhaustive Bibliography')))
if (dir === REPO || dir.startsWith(REPO + path.sep)) throw new Error(`refusing to work inside the repo (${dir})`)
const inbox = path.join(dir, 'inbox')
const pdfDir = path.join(dir, 'pdf')
fs.mkdirSync(inbox, { recursive: true })
fs.mkdirSync(pdfDir, { recursive: true })

const { entries } = load(ROOT)
const files = fs.readdirSync(inbox).filter((f) => f.toLowerCase().endsWith('.pdf'))
if (!files.length) {
  console.log(`nothing to file — drop downloaded PDFs into ${inbox}`)
  process.exit(0)
}

const filed = []
const already = []
const unknown = []
for (const f of files) {
  const src = path.join(inbox, f)
  const text = textOf(src)
  if (!text.trim()) {
    unknown.push([f, 'no extractable text (a scan, or a broken download)'])
    continue
  }
  const { entry, how, doisFound } = identify(text, entries)
  if (!entry) {
    unknown.push([f, doisFound?.length ? `unmatched DOI(s): ${doisFound.join(', ')}` : 'no DOI and no title match'])
    continue
  }
  const target = path.join(pdfDir, `${entry.id}.pdf`)
  if (fs.existsSync(target)) {
    already.push([f, entry.id])
    if (!dryRun) fs.renameSync(src, path.join(inbox, `duplicate-${f}`))
    continue
  }
  console.log(`${dryRun ? 'would file' : 'filed'}  ${f}  ->  pdf/${entry.id}.pdf   (${how}; ${shortLabel(entry)})`)
  if (!dryRun) fs.renameSync(src, target)
  filed.push(entry.id)
}

console.log(`\nfiled ${filed.length} | already held ${already.length} | unidentified ${unknown.length}`)
for (const [f, why] of already) console.log(`  already held: ${f} (matches ${why}) — left in inbox as duplicate-*`)
for (const [f, why] of unknown) console.log(`  unidentified: ${f} — ${why}`)
if (filed.length && !dryRun) console.log('\nnext: node scripts/collect-pdfs.mjs --manifest-only  &&  node scripts/attach-pdfs.mjs')
