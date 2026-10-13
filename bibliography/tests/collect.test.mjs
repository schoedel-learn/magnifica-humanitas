/**
 * collect-pdfs: the classification the manifest and the session page share, and the folder scan that must
 * prune as well as add. Both are regressions that reached a generated artifact once.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { routeOf, needsLibrarySession, scanFolder, renderSession, PROXY_PREFIX } from '../scripts/collect-pdfs.mjs'

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n')

test('routeOf says how each work can be obtained', () => {
  assert.equal(routeOf({ id: 'a', kind: 'book' }), 'print only — not obtainable as a file here')
  assert.equal(routeOf({ id: 'b', doi: '10.1/x' }), 'library session (DOI 10.1/x)')
  assert.equal(routeOf({ id: 'c', url: 'https://example.org/doc' }), 'the publisher’s own page')
  assert.match(routeOf({ id: 'd' }), /^no locator recorded/)
})

test('a print-only book and a work with no locator are not library-session work', () => {
  assert.equal(needsLibrarySession({ id: 'a', kind: 'book', doi: '10.1/x' }), false)
  assert.equal(needsLibrarySession({ id: 'b' }), false)
  assert.equal(needsLibrarySession({ id: 'c', doi: '10.1/y' }), true)
  assert.equal(needsLibrarySession({ id: 'd', url: 'https://example.org/doc' }), true)
})

test('the session page is exactly the works the manifest routes to a library session', () => {
  const entries = [
    { id: 'held', doi: '10.1/held', title: 'A held work', authors: 'Someone', creators: [], seen_in: [], year: 2020 },
    { id: 'gated', doi: '10.1/gated', title: 'A gated work', authors: 'Someone', creators: [], seen_in: [], year: 2020 },
    { id: 'print', kind: 'book', title: 'A book', authors: 'Someone', creators: [], seen_in: [], year: 2020 },
    { id: 'lost', title: 'No locator', authors: 'Someone', creators: [], seen_in: [], year: 2020 },
  ]
  const state = { files: { held: {} }, failed: {} }
  const expected = entries.filter((e) => needsLibrarySession(e) && !state.files[e.id]).length
  const page = renderSession(entries, state)
  assert.equal((page.match(/<tr><td/g) ?? []).length, expected, 'one row per library-session work')
  assert.match(page, new RegExp(`<strong>${expected} works</strong>`))
  assert.equal(expected, 1, 'and the held one is excluded')
})

test('every session row carries a proxied link beside the direct one', () => {
  const entries = [{ id: 'gated', doi: '10.1/gated', title: 'A gated work', authors: 'Someone', creators: [], seen_in: [], year: 2020 }]
  const page = renderSession(entries, { files: {}, failed: {} })
  assert.ok(page.includes(PROXY_PREFIX + encodeURIComponent('https://doi.org/10.1/gated')), 'proxied link')
  assert.ok(page.includes('href="https://doi.org/10.1/gated"'), 'direct link kept as the fallback')
})

test('scanFolder prunes a file that is no longer on disk', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'collect-'))
  try {
    fs.writeFileSync(path.join(dir, 'kept.pdf'), PDF)
    fs.writeFileSync(path.join(dir, 'gone.pdf'), PDF)
    const state = { files: {}, failed: { kept: { why: 'x' }, gone: { why: 'y' } } }
    scanFolder(dir, state)
    assert.deepEqual(Object.keys(state.files).sort(), ['gone', 'kept'])
    assert.equal(state.failed.kept, undefined, 'a held file is no longer a failure')

    fs.rmSync(path.join(dir, 'gone.pdf'))
    scanFolder(dir, state)
    assert.deepEqual(Object.keys(state.files), ['kept'], 'the deleted file stops being held')
    assert.match(state.files.kept.sha256, /^[0-9a-f]{64}$/, 'a real hash is recorded')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('scanFolder ignores a file that only pretends to be a PDF', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'collect-'))
  try {
    fs.writeFileSync(path.join(dir, 'notreally.pdf'), 'this is a download error page')
    const state = { files: { notreally: { why: 'claimed earlier' } }, failed: {} }
    scanFolder(dir, state)
    assert.deepEqual(Object.keys(state.files), [], 'neither held nor left in state')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('provenance already recorded survives a rescan', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'collect-'))
  try {
    fs.writeFileSync(path.join(dir, 'doc.pdf'), PDF)
    const state = { files: { doc: { why: 'printed from the official page' } }, failed: {} }
    scanFolder(dir, state)
    assert.equal(state.files.doc.why, 'printed from the official page')
    assert.ok(state.files.doc.bytes > 0)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
