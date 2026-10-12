/**
 * capture.test.mjs — the DOI/ISBN capture helpers, tested against real API payload shapes
 * (trimmed from live Crossref and Open Library responses) so no network is needed.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { citekey, formatAuthors, crossrefToEntry, openlibraryToEntry, writeEntry, slugify } from '../scripts/capture.mjs'

const CROSSREF_ARTICLE = {
  DOI: '10.1007/S11019-025-10290-7',
  type: 'journal-article',
  title: ['Reclaiming human dignity: a critical review of contemporary theories in light of ontological foundations'],
  'container-title': ['Medicine, Health Care and Philosophy'],
  author: [
    { given: 'Patrícia', family: 'Frantz' },
    { given: 'Francisca', family: 'Rego' },
    { given: 'Stela', family: 'Barbas' },
  ],
  volume: '28',
  issue: '4',
  page: '791-797',
  publisher: 'Springer Science and Business Media LLC',
  'published-print': { 'date-parts': [[2025, 12]] },
  issued: { 'date-parts': [[2025, 8, 2]] },
}

const CROSSREF_CHAPTER = {
  DOI: '10.1007/978-1-4020-6281-0_2',
  type: 'book-chapter',
  title: ['Human Dignity and Human Worth'],
  'container-title': ['Perspectives on Human Dignity: A Conversation'],
  author: [{ given: 'Daniel P.', family: 'Sulmasy' }],
  page: '9-18',
  publisher: 'Springer Netherlands',
  issued: { 'date-parts': [[2007]] },
}

const OPENLIBRARY_EDITION = {
  title: 'Body, soul, and bioethics',
  by_statement: 'Gilbert Meilaender.',
  publishers: ['University of Notre Dame Press'],
  publish_date: '1995',
  isbn_10: ['0268006989'],
  isbn_13: ['9780268006983'],
}

test('slugify strips accents and punctuation', () => {
  assert.equal(slugify('Patrícia Frantz'), 'patricia-frantz')
  assert.equal(slugify('Someone and something: the difference!'), 'someone-and-something-the-difference')
})

test('citekey is author-year-firstthreewords, with stopwords dropped', () => {
  assert.equal(
    citekey({ family: 'Frantz', year: 2025, title: CROSSREF_ARTICLE.title[0] }),
    'frantz-2025-reclaiming-human-dignity'
  )
  assert.equal(
    citekey({ family: 'Nussbaum', year: 2006, title: 'Frontiers of justice: Disability, nationality, species membership' }),
    'nussbaum-2006-frontiers-justice-disability'
  )
})

test('authors are rendered in APA 7 order with initials', () => {
  assert.deepEqual(formatAuthors(CROSSREF_ARTICLE.author), {
    authors: 'Frantz, P., Rego, F., & Barbas, S.',
    creators: ['Frantz, P.', 'Rego, F.', 'Barbas, S.'],
  })
  assert.deepEqual(formatAuthors([{ given: 'Daniel P.', family: 'Sulmasy' }]), {
    authors: 'Sulmasy, D. P.',
    creators: ['Sulmasy, D. P.'],
  })
  assert.deepEqual(formatAuthors([]), { authors: '', creators: [] })
})

test('a Crossref article maps to a journal-article entry with a bare DOI and en-dash pages', () => {
  const e = crossrefToEntry(CROSSREF_ARTICLE, { seenIn: ['frantz-2025-reclaiming-human-dignity'], today: '2026-10-12' })
  assert.equal(e.id, 'frantz-2025-reclaiming-human-dignity')
  assert.equal(e.kind, 'journal-article')
  assert.equal(e.doi, '10.1007/s11019-025-10290-7', 'DOI must be lowercased and bare')
  assert.equal(e.pages, '791–797', 'a hyphenated range becomes an en dash')
  assert.equal(e.year, 2025)
  assert.equal(e.journal, 'Medicine, Health Care and Philosophy')
  assert.deepEqual(e.creators, ['Frantz, P.', 'Rego, F.', 'Barbas, S.'])
  assert.deepEqual(e.seen_in, ['frantz-2025-reclaiming-human-dignity'])
  assert.equal(e.metadata_source, 'crossref')
  assert.deepEqual(e.tags, [])
})

test('a chapter asks to be verified against the printed book', () => {
  const e = crossrefToEntry(CROSSREF_CHAPTER, { today: '2026-10-12' })
  assert.equal(e.kind, 'chapter')
  assert.equal(e.pages, '9–18')
  assert.ok(e.to_verify.some((v) => v.includes('editors')))
})

test('an Open Library edition becomes a book stub that admits what it cannot supply', () => {
  const e = openlibraryToEntry(OPENLIBRARY_EDITION, { today: '2026-10-12' })
  assert.equal(e.kind, 'book')
  assert.equal(e.year, 1995)
  assert.equal(e.publisher, 'University of Notre Dame Press')
  assert.equal(e.isbn, '9780268006983')
  assert.equal(e.authors, 'Gilbert Meilaender')
  assert.ok(e.to_verify.some((v) => v.includes('APA 7 order')))
})

test('capture never overwrites an existing entry', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'capture-'))
  const entry = crossrefToEntry(CROSSREF_ARTICLE, { today: '2026-10-12' })
  const file = writeEntry(dir, entry, { today: '2026-10-12' })
  assert.ok(fs.existsSync(file))
  assert.throws(() => writeEntry(dir, entry, { today: '2026-10-12' }), /refusing to overwrite/)
  assert.match(fs.readFileSync(file, 'utf8'), /Captured from crossref/)
  // the written stub must be loadable YAML
  assert.ok(fs.readFileSync(file, 'utf8').includes('id: frantz-2025-reclaiming-human-dignity'))
})
