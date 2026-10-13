#!/usr/bin/env node
/**
 * attach-pdfs.mjs — attach any PDF in the collection's pdf/ folder to its Zotero item (stored copy, so it
 * syncs to Nextcloud), skipping ones already attached.
 *
 *   node scripts/attach-pdfs.mjs --dir "<collection>" [--dry-run]
 *
 * Needs Zotero running, and a local-API key at ~/.config/zotero/local-api-key (create it once by
 * POSTing /api/local/authorize and choosing "Always Allow" — see the zotero skill). Attachments are
 * located by the Citekey the bibliography writes into each item's Extra field, so this never guesses
 * from titles.
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { load } from './build.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const REPO = path.resolve(ROOT, '..')
const API = 'http://127.0.0.1:23119'
const KEYFILE = path.join(process.env.HOME, '.config/zotero/local-api-key')

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag)
  return i === -1 ? fallback : process.argv[i + 1]
}
const dryRun = process.argv.includes('--dry-run')
const dir = path.resolve(arg('--dir', path.join(process.env.HOME, 'Documents/Research/Exhaustive Bibliography')))
if (dir === REPO || dir.startsWith(REPO + path.sep)) throw new Error(`refusing to work inside the repo (${dir})`)
const pdfDir = path.join(dir, 'pdf')

const apiKey = fs.existsSync(KEYFILE) ? fs.readFileSync(KEYFILE, 'utf8').trim() : null

let _serverID = null
/** Zotero's server ID lives in its own database; copy it first, Zotero holds the file open. */
function serverID() {
  if (_serverID) return _serverID
  const db = path.join(process.env.HOME, 'Zotero/zotero.sqlite')
  const tmp = path.join(process.env.TMPDIR ?? '/tmp', `zotero-sid-${process.pid}.sqlite`)
  fs.copyFileSync(db, tmp)
  try {
    _serverID = execFileSync(
      'python3',
      ['-c',
       `import sqlite3,sys;print(sqlite3.connect(sys.argv[1]).execute("SELECT value FROM settings WHERE setting='localAPI' AND key='serverID'").fetchone()[0])`,
       tmp],
      { encoding: 'utf8' }
    ).trim()
    return _serverID
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

async function call(pathname, { method = 'GET', body, headers = {}, contentType, timeout = 180 } = {}) {
  const res = await fetch(API + pathname, {
    method,
    body,
    headers: { 'Zotero-API-Version': '3', 'Zotero-Server-ID': serverID(), ...headers, ...(contentType ? { 'Content-Type': contentType } : {}) },
    signal: AbortSignal.timeout(timeout),
  })
  const text = await res.text().catch(() => '')
  return { status: res.status, text }
}

async function main() {
  if (!apiKey) throw new Error(`no local-API key at ${KEYFILE} — authorize once via POST /api/local/authorize ("Always Allow")`)
  const { entries } = load(ROOT)
  const byId = new Map(entries.map((e) => [e.id, e]))

  let items
  try {
    items = JSON.parse((await call('/api/users/0/items/top?limit=100&format=json')).text)
  } catch (err) {
    throw new Error(`could not read the library from Zotero at ${API} (${err.message}) — is Zotero running?`)
  }
  const parentByCitekey = new Map()
  for (const it of items) {
    const m = /Citekey: (\S+)/.exec(it.data.extra ?? '')
    if (m) parentByCitekey.set(m[1], it.key)
  }

  const files = fs.readdirSync(pdfDir).filter((f) => f.endsWith('.pdf'))
  let attached = 0
  const skipped = []
  for (const f of files) {
    const citekey = f.slice(0, -4)
    const parent = parentByCitekey.get(citekey)
    if (!parent) {
      skipped.push([citekey, 'no Zotero item carries that citekey'])
      continue
    }
    const children = JSON.parse((await call(`/api/users/0/items/${parent}/children?format=json`)).text)
    const hasFile = children.some((c) => c.data.itemType === 'attachment' && c.data.linkMode === 'imported_file')
    if (hasFile) {
      skipped.push([citekey, 'already attached'])
      continue
    }
    const data = fs.readFileSync(path.join(pdfDir, f))
    const md5 = crypto.createHash('md5').update(data).digest('hex')
    if (dryRun) {
      console.log(`would attach ${f} -> ${citekey} (${(data.length / 1024).toFixed(0)} KB)`)
      attached++
      continue
    }
    const created = await call('/api/users/0/items', {
      method: 'POST',
      contentType: 'application/json',
      body: JSON.stringify([{ itemType: 'attachment', linkMode: 'imported_file', parentItem: parent, title: 'Full Text PDF', contentType: 'application/pdf' }]),
      headers: { 'Zotero-API-Key': apiKey },
    })
    const parsed = JSON.parse(created.text)
    const attKey = parsed?.success?.['0'] ?? parsed?.successful?.['0']?.key
    if (created.status >= 300 || !attKey) {
      skipped.push([citekey, `create failed: ${created.status} ${created.text.slice(0, 60)}`])
      continue
    }
    const form = new URLSearchParams({
      md5, filename: f, filesize: String(data.length), mtime: String(Math.round(fs.statSync(path.join(pdfDir, f)).mtimeMs)),
      contentType: 'application/pdf',
    })
    const auth = await call(`/api/users/0/items/${attKey}/file`, {
      method: 'POST', body: form, contentType: 'application/x-www-form-urlencoded',
      headers: { 'Zotero-API-Key': apiKey, 'If-None-Match': '*' },
    })
    if (auth.status !== 200) {
      skipped.push([citekey, `upload authorize failed: ${auth.status} ${auth.text.slice(0, 60)}`])
      continue
    }
    const { url, uploadKey } = JSON.parse(auth.text)
    const put = await fetch(url, { method: 'POST', body: data, headers: { 'Content-Type': 'application/pdf' }, signal: AbortSignal.timeout(300000) })
    if (![200, 201, 204].includes(put.status)) {
      skipped.push([citekey, `byte upload failed: ${put.status}`])
      continue
    }
    const reg = await call(`/api/users/0/items/${attKey}/file`, {
      method: 'POST', body: new URLSearchParams({ upload: uploadKey }), contentType: 'application/x-www-form-urlencoded',
      headers: { 'Zotero-API-Key': apiKey },
    })
    if (reg.status >= 300) {
      skipped.push([citekey, `register failed: ${reg.status} ${reg.text.slice(0, 60)}`])
      continue
    }
    console.log(`attached ${citekey} -> storage/${attKey}`)
    attached++
  }
  console.log(`\n${dryRun ? 'would attach' : 'attached'} ${attached} | skipped ${skipped.length}`)
  for (const [id, why] of skipped) console.log(`  ${id}: ${why}`)
}

main().catch((err) => {
  console.error(`attach-pdfs failed: ${err.message}`)
  process.exit(1)
})
