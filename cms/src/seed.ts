/**
 * Initial content for the Magnifica Humanitas publication.
 *
 * Run inside the CMS image:  docker compose exec -T cms npx payload run src/seed.ts
 *
 * Design notes
 * ------------
 * - Uses Payload's LOCAL API, not raw SQL: localized fields, relationships, the
 *   `*_rels` join tables and the `_status` publish flag are all written in the shape
 *   Payload itself produces, so the admin UI and Mathesar both see consistent rows.
 * - IDEMPOTENT: every entity is upserted by a stable key (slug / paragraph number /
 *   reference title). Re-running updates in place; nothing outside these slugs is
 *   touched. The only deletion is post_sources rows belonging to THIS post, which are
 *   replaced so a re-run yields exactly the intended set.
 * - COPYRIGHT (decision D9): `extract` and `quoted_passage` carry SHORT quotations only
 *   (well under the 400-character cap), each with a locator. Full texts stay at
 *   vatican.va and are linked, never reproduced.
 * - No claim here is written from memory: every quotation was read out of the primary
 *   document text and every URL was fetched (HTTP 200) before `verified_on` was set.
 */

import { getPayload } from 'payload'
import config from './payload.config'

const VERIFIED = '2026-10-06T00:00:00.000Z'

// ---------------------------------------------------------------- Lexical helpers

type LexNode = Record<string, unknown>

const txt = (t: string): LexNode => ({
  type: 'text', text: t, format: 0, detail: 0, mode: 'normal', style: '', version: 1,
})

const p = (...children: LexNode[]): LexNode => ({
  type: 'paragraph', format: '', indent: 0, version: 1, direction: 'ltr',
  textFormat: 0, textStyle: '', children,
})

const h2 = (t: string): LexNode => ({
  type: 'heading', tag: 'h2', format: '', indent: 0, version: 1, direction: 'ltr',
  children: [txt(t)],
})

const quote = (t: string): LexNode => ({
  type: 'quote', format: '', indent: 0, version: 1, direction: 'ltr',
  children: [txt(t)],
})

const body = (children: LexNode[]) => ({
  root: { type: 'root', format: '', indent: 0, version: 1, direction: 'ltr', children },
})

const payload = await getPayload({ config })

/**
 * Upsert helper: find by `where`, update if present, else create.
 *
 * `draftable` marks a collection with `versions: { drafts: true }`. For those, `_status`
 * is a plain select field whose column default is 'draft' — the `draft: false` option alone
 * does NOT publish (verified against payload/dist/collections/operations/create.js: with
 * `versions.drafts` as a boolean, `hasLocalizeStatusEnabled` is false, so the create path
 * never assigns `_status`). The admin UI's Publish button works by sending
 * `_status: 'published'` in the payload, so the Local API equivalent is to send it too.
 */
async function upsert(
  collection: string,
  where: Record<string, unknown>,
  data: Record<string, unknown>,
  draftable = false,
): Promise<{ id: number | string; action: string }> {
  const found = await payload.find({ collection: collection as never, where: where as never, limit: 1, depth: 0 })
  const payloadData = draftable ? { ...data, _status: 'published' } : data
  const opts = { collection: collection as never, data: payloadData as never, locale: 'en' as const }
  if (found.docs.length) {
    const id = (found.docs[0] as { id: number | string }).id
    await payload.update({ ...opts, id, ...(draftable ? { draft: false } : {}) })
    return { id, action: 'updated' }
  }
  const created = await payload.create({ ...opts, ...(draftable ? { draft: false } : {}) })
  return { id: (created as { id: number | string }).id, action: 'created' }
}

// ---------------------------------------------------------------- 1. Topic

const topic = await upsert('topics', { slug: { equals: 'leo-xiv' } }, {
  name: 'Pope Leo XIV',
  slug: 'leo-xiv',
  description: 'Robert Francis Prevost (b. 1955), elected 267th Bishop of Rome on 8 May 2025; '
    + 'author of the encyclical Magnifica humanitas.',
})
console.log(`topic leo-xiv: ${topic.action} (id=${topic.id})`)

// ---------------------------------------------------------------- 2. Document

const doc = await upsert('documents', { slug: { equals: 'magnifica-humanitas' } }, {
  title: 'Magnifica humanitas: On Safeguarding the Human Person in the Time of Artificial Intelligence',
  abbreviation: 'MH',
  slug: 'magnifica-humanitas',
  doc_type: 'encyclical',
  signed_date: '2026-05-15T00:00:00.000Z',
  published_date: '2026-05-25T00:00:00.000Z',
  vatican_url: 'https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html',
  // No official Latin text had been published when this record was created, so the field is
  // set to null rather than left to inherit the schema's `la` default, which would be a
  // claim we cannot support. See docs/decisions.md (D9/D6 notes) for the source.
  language_of_original: null,
  summary: 'Pope Leo XIV\u2019s first encyclical, signed 15 May 2026 and published 25 May 2026 '
    + 'on the 135th anniversary of Leo XIII\u2019s Rerum novarum. In five chapters it applies '
    + 'the Church\u2019s social doctrine \u2014 the dignity of the person, the common good, the '
    + 'universal destination of goods, subsidiarity, solidarity and social justice \u2014 to '
    + 'artificial intelligence and the digital transformation of work, communication and war, '
    + 'framing the choice before humanity as Babel or the rebuilt Jerusalem.',
  topics: [topic.id],
}, true)
console.log(`document magnifica-humanitas: ${doc.action} (id=${doc.id})`)

// ---------------------------------------------------------------- 3. Paragraphs

// Short verbatim extracts only (D9). Each carries its paragraph number as the locator.
//
// Emphasis is part of a quotation, not decoration: wrap an emphasised span in single
// asterisks and `renderEmphasis` (site/src/lib/emphasis.ts) turns it into <em>. MH 118 is the
// case that matters — "not *despite* limitations, but often *through* them" — where the
// emphasis IS the argument. Dropping it leaves a sentence that still reads but no longer says
// what the author said. See docs/translation-standard.md §0 and §4.
const paragraphs: Array<{ number: number; extract: string; note: string }> = [
  {
    number: 1,
    extract: 'Humanity, created by God in all its grandeur, is today facing a pivotal choice: '
      + 'either to construct a new Tower of Babel or to build the city in which God and humanity dwell together.',
    note: 'The opening sentence of the encyclical, which states its central alternative.',
  },
  {
    number: 4,
    extract: 'Technology should not be considered, in itself, as a force antagonistic to humanity.',
    note: 'The document\u2019s refusal of technophobia; technology is a "profoundly human reality".',
  },
  {
    number: 9,
    extract: 'In practice, however, technology is never neutral, because it takes on the characteristics '
      + 'of those who devise, finance, regulate and use it.',
    note: 'The pivot from "not evil" to "not neutral" \u2014 responsibility attaches to people, not tools.',
  },
  {
    number: 64,
    extract: 'the promotion of the common good can never be separated from respect for the right of peoples '
      + 'to exist, to preserve their own identity and to contribute their unique qualities to the family of '
      + 'nations. Moreover, any attempt or plan to eliminate or subjugate a nation is gravely immoral and '
      + 'therefore unacceptable.',
    note: 'The application of the common good to international politics.',
  },
  {
    number: 89,
    extract: 'Living out justice in the Church means purifying ecclesial relationships and structures from '
      + 'distortions that give rise to inequality, lack of transparency and abuse of power.',
    note: 'The examen for the Church herself, including listening to victims of abuse.',
  },
  {
    number: 107,
    extract: 'A more moral AI is not enough if that morality is determined by a few.',
    note: 'The critique of "alignment" without shared ethical deliberation.',
  },
  {
    number: 110,
    extract: 'To disarm means discrediting the assumption that technical power automatically confers the right '
      + 'to govern. To disarm does not mean rejecting technology, but preventing it from dominating humanity.',
    note: 'The document\u2019s governing image for its AI proposals.',
  },
  {
    number: 118,
    extract: 'humanity flourishes not *despite* limitations, but often *through* them.',
    note: 'The answer to transhumanism and posthumanism: limitation is not a defect to be removed.',
  },
  {
    number: 129,
    extract: 'the true alternative is not between enthusiasm and fear, but between two paths of development: '
      + 'a progress that serves individuals and peoples, or a progress that subjects them to the mentality of power',
    note: 'The reframing of the debate away from techno-optimism versus techno-panic.',
  },
]

for (const par of paragraphs) {
  const res = await upsert(
    'doc_paragraphs',
    { and: [{ document: { equals: doc.id } }, { number: { equals: par.number } }] },
    {
      document: doc.id,
      number: par.number,
      extract: par.extract,
      note: par.note,
      topics: [topic.id],
    },
  )
  console.log(`  para ${String(par.number).padStart(3)}: ${res.action} (id=${res.id})`)
}

// ---------------------------------------------------------------- 4. Sources (APA 7)

const sourceDefs = [
  {
    key: 'Leo XIV (2026) encyclical',
    kind: 'magisterial',
    authors: 'Leo XIV',
    title: 'Encyclical letter Magnifica humanitas: On safeguarding the human person in the time of artificial intelligence',
    year: 2026,
    published_on: null,
    publisher: 'Libreria Editrice Vaticana',
    url: 'https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html',
  },
  {
    key: 'Dicastery for Communication (2025) biography',
    kind: 'web',
    authors: 'Dicastery for Communication',
    title: 'Biography of the Holy Father Leo XIV',
    year: 2025,
    published_on: null,
    publisher: 'The Holy See',
    url: 'https://www.vatican.va/content/leo-xiv/en/biography/documents/biografia_leone-xiv.html',
  },
  {
    key: 'Piro (2026) Vatican News',
    kind: 'web',
    authors: 'Piro, I.',
    title: 'Pope Leo\u2019s \u201cMagnifica humanitas\u201d: AI must serve humanity not concentrate power',
    year: 2026,
    published_on: '2026-05-25',
    publisher: 'Vatican News',
    url: 'https://www.vaticannews.va/en/pope/news/2026-05/pope-leo-xiv-encyclical-magnifica-humanitas-ai.html',
  },
  {
    key: 'Leo XIII (1891) Rerum novarum',
    kind: 'magisterial',
    authors: 'Leo XIII',
    title: 'Encyclical letter Rerum novarum: On capital and labour',
    year: 1891,
    published_on: null,
    publisher: 'Libreria Editrice Vaticana',
    url: 'https://www.vatican.va/content/leo-xiii/en/encyclicals/documents/hf_l-xiii_enc_15051891_rerum-novarum.html',
  },
  {
    key: 'USCCB (2026) Magnifica Humanitas',
    kind: 'web',
    authors: 'United States Conference of Catholic Bishops',
    title: 'Magnifica Humanitas',
    year: 2026,
    published_on: null,
    publisher: 'United States Conference of Catholic Bishops',
    url: 'https://www.usccb.org/magnifica-humanitas',
  },
  {
    // Bibliography entry with no essay link yet: the International Theological Commission's
    // study document on trans- and post-humanism. Publication 4 March 2026 (the page's
    // eventDate; Leo XIV authorised publication on 9 February 2026) — the Commission's
    // approval in 2025 is not the publication year.
    key: 'International Theological Commission (2026) Quo vadis, humanitas?',
    kind: 'magisterial',
    authors: 'International Theological Commission',
    title:
      'Quo vadis, humanitas? Thinking through Christian anthropology in the face of certain scenarios for the future of humanity',
    year: 2026,
    published_on: '2026-03-04',
    publisher: 'Libreria Editrice Vaticana',
    url: 'https://www.vatican.va/roman_curia/congregations/cfaith/cti_documents/rc_cti_doc_20260304_quo-vadis-humanits_en.html',
  },
] as const

const sourceIds: Record<string, number | string> = {}
for (const s of sourceDefs) {
  const res = await upsert('sources', { title: { equals: s.title } }, {
    kind: s.kind,
    authors: s.authors,
    title: s.title,
    year: s.year,
    published_on: s.published_on,
    publisher: s.publisher,
    url: s.url,
    accessed_on: VERIFIED,
    // Set only because every URL above was fetched successfully on this date.
    verified_on: VERIFIED,
  })
  sourceIds[s.key] = res.id
  console.log(`source "${s.authors}": ${res.action} (id=${res.id})`)
}

// ---------------------------------------------------------------- 5. Post (the introduction)

const postBody = body([
  p(txt('Magnifica humanitas is the first encyclical of Pope Leo XIV. He signed it on 15 May 2026 and the Holy See published it on 25 May 2026, the 135th anniversary of Pope Leo XIII\u2019s Rerum novarum (Leo XIV, 2026, para. 3; Piro, 2026). The date is the argument in miniature: a document written for the "new things" (res novae) of industrial society is renewed here for the "new things" of artificial intelligence, digitalisation and robotics (Leo XIV, 2026, para. 4).')),
  p(txt('Its subtitle names the subject precisely \u2014 on safeguarding the human person in the time of artificial intelligence \u2014 and the text runs to five chapters, moving from the Church\u2019s social doctrine to the culture of power and the civilisation of love (Piro, 2026).')),

  h2('The pope who wrote it'),
  p(txt('Leo XIV was born Robert Francis Prevost on 14 September 1955 in Chicago, Illinois, the youngest of three children of Louis Marius Prevost and Mildred Agnes Mart\u00ednez (Dicastery for Communication, 2025). He read mathematics at Villanova University and entered the Order of Saint Augustine, making his first profession on 2 September 1978 and his solemn profession on 29 August 1981 (Dicastery for Communication, 2025).')),
  p(txt('He was ordained a priest on 19 June 1982, and completed a doctorate in canon law at the Pontifical University of Saint Thomas Aquinas in Rome in 1985 (Dicastery for Communication, 2025). The centre of gravity of his ministry, however, was Peru: he was assigned to the Augustinian mission in Chulucanas in 1985, worked in Trujillo from 1988, and acquired Peruvian citizenship by naturalisation on 24 August 2015 (Dicastery for Communication, 2025). His order elected him Prior General in 2001 and confirmed him for a second term in 2007 (Dicastery for Communication, 2025).')),
  p(txt('Appointed Bishop of Chiclayo in 2015, and Prefect of the Dicastery for Bishops in 2023, he was created a cardinal on 30 September 2023 (Dicastery for Communication, 2025). The conclave opened on 7 May 2025 and elected him on 8 May 2025, when he took the name Leo XIV \u2014 the 267th successor of Saint Peter, the first pope from the United States of America, and the first Augustinian pope in the history of the Church (Dicastery for Communication, 2025).')),
  p(txt('His episcopal motto, In Illo Uno Unum, is taken from Saint Augustine\u2019s exposition of Psalm 127: "although we Christians are many, in the one Christ we are one" (Dicastery for Communication, 2025). It is not incidental to the encyclical. A pope formed by Augustine and by two decades of missionary work in Peru argues about technology from the standpoint of communion rather than of control.')),

  h2('What the document argues'),
  p(txt('The text opens with two biblical images rather than with technology: the Tower of Babel (Genesis 11) and the rebuilding of the walls of Jerusalem under Nehemiah (Nehemiah 2\u20136) (Leo XIV, 2026, paras. 7\u20138). Its first sentence states the alternatives plainly:')),
  quote('Humanity, created by God in all its grandeur, is today facing a pivotal choice: either to construct a new Tower of Babel or to build the city in which God and humanity dwell together (Leo XIV, 2026, para. 1).'),
  p(txt('Babel is the project of uniformity and self-sufficiency, conceived without reference to God; Nehemiah\u2019s wall is rebuilt by the shared labour of many, each family taking a section (Leo XIV, 2026, paras. 7\u20138). The contrast governs everything that follows.')),
  p(txt('On technology itself the document refuses both enthusiasm and refusal. Technology is not intrinsically opposed to humanity (Leo XIV, 2026, para. 4), but neither is it innocent:')),
  quote('In practice, however, technology is never neutral, because it takes on the characteristics of those who devise, finance, regulate and use it (Leo XIV, 2026, para. 9).'),
  p(txt('That sentence relocates the question. Since responsibility attaches to people rather than to tools, Chapter Two sets out the foundations and principles of Catholic social doctrine \u2014 the dignity of the person, the common good, the universal destination of goods, subsidiarity, solidarity and social justice \u2014 and applies them to a world in which, the pope argues, the principal drivers of technological development are private and often transnational actors whose resources surpass those of many governments (Leo XIV, 2026, para. 5).')),
  p(txt('Chapter Three turns directly to artificial intelligence. Taking up Pope Francis\u2019s critique of the technocratic paradigm, the pope warns that moralising machines is not enough:')),
  quote('A more moral AI is not enough if that morality is determined by a few (Leo XIV, 2026, para. 107).'),
  p(txt('His proposal is captured in a single verb. Artificial intelligence, he writes, must be "disarmed":')),
  quote('To disarm does not mean rejecting technology, but preventing it from dominating humanity (Leo XIV, 2026, para. 110).'),
  p(txt('Against transhumanism and posthumanism he insists that limitation is not a defect to be eliminated but a dimension of the person through which relationship matures: "humanity flourishes not despite limitations, but often through them" (Leo XIV, 2026, para. 118).')),
  p(txt('Chapter Four treats truth, work and freedom \u2014 an "ecology of communication", the dignity of work in a digital transition, and new forms of dependency. Chapter Five names the "culture of power" and sets against it the "civilisation of love", with a critique of the normalisation of war and of weapons augmented by artificial intelligence (Piro, 2026).')),
  p(txt('One passage has drawn particular attention. Applying the five principles to the Church herself, the pope calls for an examination of conscience and for "purifying ecclesial relationships and structures from distortions that give rise to inequality, lack of transparency and abuse of power", including listening to victims of abuse (Leo XIV, 2026, para. 89; Piro, 2026).')),

  h2('Why it matters here'),
  p(txt('Magnifica humanitas is a social encyclical, and it stands in a line that runs from Rerum novarum (Leo XIII, 1891) through the magisterium of the twentieth century to Pope Francis (Leo XIV, 2026, paras. 30, 45). Its novelty lies in the subject rather than in the method: the pope does not invent a new doctrine for artificial intelligence but asks what the existing doctrine requires of the people who devise, finance, regulate and use it. The closing invitation is characteristic of the whole document \u2014 that even in the age of AI "we may bear witness to the grandeur of humanity, in which God has made His dwelling" (Piro, 2026).')),
])

const post = await upsert('posts', { slug: { equals: 'introduction-to-magnifica-humanitas' } }, {
  title: 'Introduction to Magnifica humanitas',
  slug: 'introduction-to-magnifica-humanitas',
  post_type: 'essay',
  abstract: 'An introduction to Pope Leo XIV\u2019s first encyclical: the historical occasion of '
    + 'its publication, the biography of the pope who wrote it, and the argument of its five chapters.',
  body: postBody,
  topics: [topic.id],
  documents: [doc.id],
  published_at: VERIFIED,
}, true)
console.log(`post introduction-to-magnifica-humanitas: ${post.action} (id=${post.id})`)

// ---------------------------------------------------------------- 6. Post \u2192 source links

// Replace this post's own links so a re-run yields exactly the intended set.
const existingLinks = await payload.find({
  collection: 'post_sources' as never,
  where: { post: { equals: post.id } } as never,
  limit: 100,
})
for (const row of existingLinks.docs) {
  await payload.delete({ collection: 'post_sources' as never, id: (row as { id: number | string }).id })
}
if (existingLinks.docs.length) console.log(`  removed ${existingLinks.docs.length} previous post_sources row(s)`)

const links: Array<{ source: string; locator: string; claim: string; quote?: string }> = [
  {
    source: 'Piro (2026) Vatican News',
    locator: 'Vatican News, 25 May 2026',
    claim: 'Magnifica humanitas is Pope Leo XIV\u2019s first encyclical; he signed it on 15 May 2026 and it was published on 25 May 2026.',
  },
  {
    source: 'Leo XIV (2026) encyclical',
    locator: 'MH 3',
    claim: 'The publication date marks the 135th anniversary of Pope Leo XIII\u2019s Rerum novarum (1891).',
  },
  {
    source: 'Leo XIV (2026) encyclical',
    locator: 'MH 1',
    claim: 'The encyclical opens on the choice between building a new Tower of Babel and building the city where God and humanity dwell together.',
    quote: 'either to construct a new Tower of Babel or to build the city in which God and humanity dwell together',
  },
  {
    source: 'Leo XIV (2026) encyclical',
    locator: 'MH 4, 9',
    claim: 'Technology is not in itself antagonistic to humanity, yet it is never neutral because it takes on the character of those who devise, finance, regulate and use it.',
    quote: 'technology is never neutral, because it takes on the characteristics of those who devise, finance, regulate and use it',
  },
  {
    source: 'Leo XIV (2026) encyclical',
    locator: 'MH 107',
    claim: 'The pope argues that moralising AI is insufficient if the morality is set by a few rather than agreed to shared standards of social justice.',
    quote: 'A more moral AI is not enough if that morality is determined by a few',
  },
  {
    source: 'Leo XIV (2026) encyclical',
    locator: 'MH 110',
    claim: 'The document\u2019s central proposal is that AI must be "disarmed" \u2014 which means preventing technology from dominating humanity, not rejecting it.',
    quote: 'To disarm does not mean rejecting technology, but preventing it from dominating humanity',
  },
  {
    source: 'Leo XIV (2026) encyclical',
    locator: 'MH 89',
    claim: 'Applying its principles to the Church, the encyclical calls for an examination of conscience, transparency, and listening to victims of abuse.',
    quote: 'purifying ecclesial relationships and structures from distortions that give rise to inequality, lack of transparency and abuse of power',
  },
  {
    source: 'Dicastery for Communication (2025) biography',
    locator: 'Biography of the Holy Father Leo XIV',
    claim: 'Robert Francis Prevost was born on 14 September 1955 in Chicago, Illinois, the youngest of three children.',
  },
  {
    source: 'Dicastery for Communication (2025) biography',
    locator: 'Biography, "Election to the Apostolic See"',
    claim: 'Prevost was elected on 8 May 2025 in the conclave that opened on 7 May; he is the 267th Successor of Saint Peter, the first pope from the United States, and the first Augustinian pope.',
  },
  {
    source: 'Leo XIII (1891) Rerum novarum',
    locator: 'Rerum novarum (15 May 1891)',
    claim: 'Rerum novarum is the foundational modern social encyclical to which Magnifica humanitas explicitly anchors itself.',
  },
]

for (const l of links) {
  const res = await payload.create({
    collection: 'post_sources' as never,
    data: {
      post: post.id,
      source: sourceIds[l.source],
      locator: l.locator,
      claim: l.claim,
      ...(l.quote ? { quoted_passage: l.quote } : {}),
    } as never,
  })
  console.log(`  link "${l.locator}": created (id=${(res as { id: number | string }).id})`)
}

console.log('\nSeed complete.')
process.exit(0)
