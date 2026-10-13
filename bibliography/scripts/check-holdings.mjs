#!/usr/bin/env node
/**
 * check-holdings.mjs — ask UTEP's link resolver what the library actually holds, for every work that has a
 * DOI or an ISBN.
 *
 *   node scripts/check-holdings.mjs --dir "<collection>" [--only-articles] [--refresh]
 *
 * Why: whether a paywall opens is a fact about the institution, not about the publisher, and the Alma
 * resolver states it plainly — it lists the databases that carry the article ("New England Journal of
 * Medicine Current", "Journals@Ovid Complete", ProQuest …) or says "No full text available" and offers
 * Interlibrary Loan. Every provider link it returns is already wrapped in the institution's EZproxy
 * prefix, so the resolver is the shortest path from a citation to a readable copy.
 *
 * Results are cached in state.json under `holdings`, so the session page regenerates without re-asking.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load, shortLabel } from './build.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const REPO = path.resolve(ROOT, '..')
const RESOLVER = 'https://utep.alma.exlibrisgroup.com/view/uresolver/01UTEP_INST/openurl'

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag)
  return i === -1 ? fallback : process.argv[i + 1]
}
const dir = path.resolve(arg('--dir', path.join(process.env.HOME, 'Documents/Research/Exhaustive Bibliography')))
if (dir === REPO || dir.startsWith(REPO + path.sep)) throw new Error(`refusing to work inside the repo (${dir})`)

const stateFile = path.join(dir, 'state.json')
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
state.holdings ??= {}

const { entries } = load(ROOT)
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
const textOf = (h) => decode(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

async function ask(entry) {
  const q = entry.doi
    ? `rft_id=info:doi/${encodeURIComponent(entry.doi)}`
    : `rft.btitle=${encodeURIComponent(entry.title)}&rft.au=${encodeURIComponent((entry.creators?.[0]?.family ?? entry.authors ?? '').split(',')[0] ?? '')}&rft.isbn=${encodeURIComponent(entry.isbn ?? '')}`
  const url = `${RESOLVER}?${q}`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)' }, signal: AbortSignal.timeout(60000) })
  const html = decode(await res.text())
  const body = textOf(html)
  const providers = [...html.matchAll(/<a[^>]+package_service_id=(\d+)[^>]*>(.*?)<\/a>/gs)]
    .map((m) => ({ id: m[1], label: textOf(m[2]).trim() }))
    .filter((p) => p.label && !/^full text/i.test(p.label) && p.label.length < 70)
  const dedup = [...new Map(providers.map((p) => [p.label, p])).values()]
  // "No full text available" contains "full text available" — never test the prose alone. The service
  // anchors are the entitled providers; their presence is the signal, and the negated sentence rules it out.
  const noCopy = /No full text available/i.test(body)
  const fullText = dedup.length > 0 && !noCopy
  return {
    resolver: url,
    fullText,
    databases: dedup.map((p) => p.label),
    // the no-copy case offers Interlibrary Loan on the resolver page itself
    interlibraryLoan: /Interlibrary Loan/i.test(body),
    checked: new Date().toISOString().slice(0, 10),
  }
}

const targets = entries.filter((e) => (e.doi || e.isbn) && (arg('--only-articles') ? e.kind !== 'book' : true))
console.log(`asking the resolver about ${targets.length} works…`)
let asked = 0
for (const e of targets) {
  if (state.holdings[e.id] && !has('--refresh')) continue
  try {
    state.holdings[e.id] = await ask(e)
    asked++
    const h = state.holdings[e.id]
    console.log(`  ${h.fullText ? 'HELD  ' : 'no copy'}  ${shortLabel(e).slice(0, 52).padEnd(52)} ${h.fullText ? h.databases.slice(0, 3).join(' | ') : 'Interlibrary Loan'}`)
  } catch (err) {
    console.log(`  ERROR ${e.id}: ${err.message}`)
  }
  await new Promise((r) => setTimeout(r, 400))
}
fs.writeFileSync(stateFile, JSON.stringify(state, null, 1))
const held = Object.values(state.holdings).filter((h) => h.fullText).length
console.log(`\nasked ${asked} | cache now ${Object.keys(state.holdings).length} | full text at the library: ${held}`)
function has(f) {
  return process.argv.includes(f)
}
