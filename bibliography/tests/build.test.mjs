/**
 * build.test.mjs — the bibliography's own gates.
 *
 * Run: cd bibliography && npm test
 *
 * Fixtures are written into a temp dir per test, so these tests neither need the network nor
 * touch the real bibliography. The last test is the integration gate: it validates and
 * --checks the actual entries/ directory, so `npm test` fails if the seeded bibliography is
 * invalid or if a generated file is stale.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

import { load, validate, render, build, apaEntry, shortLabel, renderIndexJson } from '../scripts/build.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REAL_ROOT = path.resolve(HERE, '..')

const VOCAB = {
  version: 1,
  tags: [
    { id: 'soul', label: 'Soul', axis: 'concept', status: 'approved', origin: 'barry-ref-list', aliases: [] },
    { id: 'wonder', label: 'Wonder', axis: 'concept', status: 'proposed', origin: 'agent-proposed', aliases: [] },
  ],
}

const BOOK = {
  id: 'meilaender-1995-body-soul-and-bioethics',
  kind: 'book',
  authors: 'Meilaender, G.',
  title: 'Body, soul, and bioethics',
  year: 1995,
  publisher: 'University of Notre Dame Press',
  tags: ['soul'],
  tags_inferred: [],
  metadata_source: 'openlibrary',
  verified_on: '2026-10-12',
  note: 'A note.',
}

/** Write a throwaway bibliography root: vocabulary.yml + entries/*.yml */
function fixture({ vocab = VOCAB, entries = [BOOK] } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'biblio-'))
  fs.mkdirSync(path.join(root, 'entries'), { recursive: true })
  fs.writeFileSync(path.join(root, 'vocabulary.yml'), yaml.dump(vocab))
  for (const e of entries) fs.writeFileSync(path.join(root, 'entries', `${e.id}.yml`), yaml.dump(e))
  return root
}

const quiet = { error() {}, warn() {}, log() {} }

/** validate(entries, vocab) from a fixture root — spelled out, no argument-order guessing. */
function validateRoot(root) {
  const { vocab, entries } = load(root)
  return validate(entries, vocab)
}

test('a valid entry set builds and writes every generated file', () => {
  const root = fixture()
  const res = build({ root, log: quiet })
  assert.equal(res.ok, true)
  for (const f of [
    'exhaustive-bibliography.md',
    'tag-index.md',
    'index.json',
    'exports/csl.json',
    'exports/references.ris',
    'exports/references.bib',
  ])
    assert.ok(fs.existsSync(path.join(root, f)), `${f} was not written`)
})

test('--check passes when the tree is fresh and fails once an entry changes', () => {
  const root = fixture()
  build({ root, log: quiet })
  assert.equal(build({ root, check: true, log: quiet }).ok, true, 'fresh tree should pass --check')

  const file = path.join(root, 'entries', 'meilaender-1995-body-soul-and-bioethics.yml')
  fs.writeFileSync(file, yaml.dump({ ...BOOK, note: 'A changed note.' }))
  const stale = build({ root, check: true, log: quiet })
  assert.equal(stale.ok, false, 'a changed entry must fail --check')
  assert.ok(stale.stale.includes('exhaustive-bibliography.md'))
  assert.equal(build({ root, check: false, log: quiet }).ok, true, 'a plain build repairs it')
  assert.equal(build({ root, check: true, log: quiet }).ok, true)
})

test('a tag absent from the vocabulary is an error', () => {
  const root = fixture({ entries: [{ ...BOOK, tags: ['dignity'] }] })
  const { errors } = validateRoot(root)
  assert.ok(errors.some((e) => e.includes('tag "dignity" is not in vocabulary.yml')), errors.join('\n'))
})

test('a proposed tag may still be a title-borne assignment — the two questions are orthogonal', () => {
  // `wonder` is a proposed concept in VOCAB; assigning it objectively (it is in the title) is fine.
  const a = fixture({ entries: [{ ...BOOK, title: 'Body, soul, and wonder', tags: ['wonder'], tags_inferred: ['soul'] }] })
  assert.deepEqual(validateRoot(a).errors, [])
})

test('an approved tag CAN be an inferred assignment — tag approval and tag assignment are different questions', () => {
  const b = fixture({ entries: [{ ...BOOK, tags: [], tags_inferred: ['soul'] }] })
  assert.deepEqual(validateRoot(b).errors, [])
  const md = render([{ ...BOOK, tags: [], tags_inferred: ['soul'] }], VOCAB)['tag-index.md']
  assert.match(md, /\[Meilaender \(1995\)\]\([^)]*\)\?/, 'an inferred assignment is marked with ?')
})

test('an untagged work is an error — it would be invisible in the index', () => {
  const root = fixture({ entries: [{ ...BOOK, tags: [], tags_inferred: [] }] })
  assert.ok(validateRoot(root).errors.some((e) => e.includes('no tags')))
})

test('structural errors are caught: https DOI, edition in title, missing year, id/filename drift', () => {
  const cases = [
    [{ ...BOOK, doi: 'https://doi.org/10.1/x' }, /doi must be bare/],
    [{ ...BOOK, title: 'Body, soul, and bioethics (2nd ed.)' }, /edition statement/],
    [{ ...BOOK, year: undefined }, /year must be an integer/],
    [{ ...BOOK, kind: 'chapter' }, /chapter without `container_title`/],
    [{ ...BOOK, title: 'The soul in n.d. sources' }, /"n.d."/],
  ]
  for (const [entry, re] of cases) {
    const root = fixture({ entries: [entry] })
    const { errors } = validateRoot(root)
    assert.ok(errors.some((e) => re.test(e)), `expected ${re} for ${JSON.stringify(entry)}: ${errors.join(' / ')}`)
  }
})

test('an id that does not match its filename is an error', () => {
  const root = fixture()
  const file = path.join(root, 'entries', 'meilaender-1995-body-soul-and-bioethics.yml')
  fs.writeFileSync(file, yaml.dump({ ...BOOK, id: 'some-other-id' }))
  assert.ok(validateRoot(root).errors.some((e) => e.includes('does not match filename')))
})

test('published_on must agree with the year', () => {
  const root = fixture({
    entries: [{ ...BOOK, kind: 'web', published_on: '1996-01-01' }],
  })
  assert.ok(validateRoot(root).errors.some((e) => e.includes('published_on year disagrees')))
})

test('APA rendering: journal article, standalone book, and a work with no author', () => {
  const article = apaEntry({
    kind: 'journal-article',
    authors: 'McCrudden, C.',
    year: 2008,
    title: 'Human dignity and judicial interpretation of human rights',
    journal: 'European Journal of International Law',
    volume: '19',
    issue: '4',
    pages: '655–724',
    doi: '10.1093/ejil/chn043',
  })
  assert.equal(
    article,
    'McCrudden, C. (2008). Human dignity and judicial interpretation of human rights. *European Journal of International Law*, 19(4), 655–724. https://doi.org/10.1093/ejil/chn043'
  )

  const translated = apaEntry({
    kind: 'book',
    authors: 'Agamben, G.',
    year: 1998,
    title: 'Homo sacer: Sovereign power and bare life',
    translator: 'Heller-Roazen, D.',
    publisher: 'Stanford University Press',
  })
  assert.equal(
    translated,
    'Agamben, G. (1998). *Homo sacer: Sovereign power and bare life* (Heller-Roazen, D., Trans.). Stanford University Press.'
  )

  // blank authors moves the title into the author position — printed once, never twice
  const anonymous = apaEntry({ kind: 'book', authors: '', year: 2011, title: 'New American Bible', publisher: 'USCCB' })
  assert.equal(anonymous, '*New American Bible* (2011). USCCB.')
  assert.equal(anonymous.match(/New American Bible/g).length, 1)

  const chapter = apaEntry({
    kind: 'chapter',
    authors: 'Taylor, C.',
    year: 1994,
    title: 'The politics of recognition',
    editors: 'A. Gutmann',
    container_title: 'Multiculturalism: Examining the politics of recognition',
    pages: '25–73',
    publisher: 'Princeton University Press',
  })
  assert.equal(
    chapter,
    'Taylor, C. (1994). The politics of recognition. In A. Gutmann (Ed.), *Multiculturalism: Examining the politics of recognition* (pp. 25–73). Princeton University Press.'
  )
})

test('a web document states its full date, a paginated article its year', () => {
  const web = apaEntry({
    kind: 'web',
    authors: 'United Nations General Assembly',
    year: 1948,
    published_on: '1948-12-10',
    title: 'Universal Declaration of Human Rights',
    publisher: 'United Nations',
    url: 'https://www.un.org/en/about-us/universal-declaration-of-human-rights',
  })
  assert.match(web, /\(1948, December 10\)/)
  assert.match(
    apaEntry({ kind: 'journal-article', authors: 'Frantz, P.', year: 2025, title: 'T', journal: 'J', volume: '28', issue: '4', pages: '1–2' }),
    /\(2025\)/
  )
})

test('a corporate author element is closed with a period', () => {
  const web = apaEntry({
    kind: 'web',
    authors: 'United Nations General Assembly',
    year: 1948,
    published_on: '1948-12-10',
    title: 'Universal Declaration of Human Rights',
    publisher: 'United Nations',
    url: 'https://www.un.org/en/about-us/universal-declaration-of-human-rights',
  })
  assert.match(web, /^United Nations General Assembly\. \(1948, December 10\)\./)
  // and a personal author does not get a doubled period
  assert.match(
    apaEntry({ kind: 'book', authors: 'Crosby, J. F.', year: 1996, title: 'T', publisher: 'P' }),
    /^Crosby, J\. F\. \(1996\)\./
  )
})

test('short labels: one, two and three-plus creators', () => {
  assert.equal(shortLabel({ authors: 'Crosby, J. F.', year: 1996, title: 'x' }), 'Crosby (1996)')
  assert.equal(
    shortLabel({ authors: 'Pellegrino, E. D., & Thomasma, D. C.', year: 1993, title: 'x' }),
    'Pellegrino & Thomasma (1993)'
  )
  assert.equal(
    shortLabel({
      authors: 'Frantz, P., Rego, F., & Barbas, S.',
      creators: ['Frantz, P.', 'Rego, F.', 'Barbas, S.'],
      year: 2025,
      title: 'x',
    }),
    'Frantz et al. (2025)'
  )
})

test('exports: RIS gets one AU per creator, CSL keywords carry the proposed marker', () => {
  const entries = [
    {
      ...BOOK,
      creators: ['Pellegrino, E. D.', 'Thomasma, D. C.'],
      authors: 'Pellegrino, E. D., & Thomasma, D. C.',
      tags: ['soul'],
      tags_inferred: ['wonder'],
    },
  ]
  const files = render(entries, VOCAB)
  const ris = files['exports/references.ris']
  assert.equal(ris.match(/^AU {2}- /gm).length, 2)
  assert.equal(ris.match(/^TY {2}- /gm).length, 1)
  assert.match(ris, /^KW {2}- soul$/m)

  const csl = JSON.parse(files['exports/csl.json'])
  assert.deepEqual(csl[0].author, [{ family: 'Pellegrino', given: 'E. D.' }, { family: 'Thomasma', given: 'D. C.' }])
  assert.deepEqual(csl[0].keyword, ['soul', 'wonder?'])

  const index = JSON.parse(renderIndexJson(entries, VOCAB))
  assert.deepEqual(index.tags.soul.entries, ['meilaender-1995-body-soul-and-bioethics'])
  assert.deepEqual(index.tags.soul.inferred_entries, [])
  assert.deepEqual(index.tags.wonder.inferred_entries, ['meilaender-1995-body-soul-and-bioethics'])
  assert.equal(index.tags.wonder.status, 'proposed')
})

test('the tag index marks a proposed tag and lists it for a decision', () => {
  const files = render([{ ...BOOK, tags_inferred: ['wonder'] }], VOCAB)
  const md = files['tag-index.md']
  assert.match(md, /\*wonder\*/)
  assert.match(md, /## Awaiting a decision/)
  assert.match(md, /### Proposed tags — should the concept exist at all\?/)
  assert.match(md, /### Inferred assignments/)
  assert.match(md, /## Concepts/)
})

test('integration: the real bibliography validates and its generated files are current', () => {
  const { vocab, entries } = load(REAL_ROOT)
  const { errors } = validate(entries, vocab)
  assert.deepEqual(errors, [], errors.join('\n'))
  assert.equal(entries.length, 93, `expected 93 works, found ${entries.length}`)
  const res = build({ root: REAL_ROOT, check: true, log: quiet })
  assert.deepEqual(res.stale, [], `generated files out of date: ${res.stale.join(', ')}`)
})

test('integration: every declared reference list is fully carried, and the counts agree', () => {
  const { entries } = load(REAL_ROOT)
  const seeded = entries.filter((e) => e.reference_count)
  assert.ok(seeded.length >= 2, 'expected at least two seed essays to be on file')
  for (const seed of seeded) {
    const carried = entries.filter((e) => (e.seen_in ?? []).includes(seed.id))
    assert.equal(
      carried.length,
      seed.reference_count,
      `${seed.id} declares ${seed.reference_count} references but ${carried.length} works carry it`
    )
  }
  // and no work claims to come from a list that is not on file
  const ids = new Set(entries.map((e) => e.id))
  for (const e of entries) for (const s of e.seen_in ?? []) assert.ok(ids.has(s), `${e.id}: unknown seen_in ${s}`)
})

test('integration: the tag index lists every work and no tag is orphaned', () => {
  const { vocab, entries } = load(REAL_ROOT)
  const index = JSON.parse(renderIndexJson(entries, vocab))
  const tagged = new Set()
  for (const t of Object.values(index.tags)) for (const id of t.entries) tagged.add(id)
  const untagged = entries.filter((e) => !tagged.has(e.id)).map((e) => e.id)
  assert.deepEqual(untagged, [], `works that appear under no tag: ${untagged.join(', ')}`)
})
