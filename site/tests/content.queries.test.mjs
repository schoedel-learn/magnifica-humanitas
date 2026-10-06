// Tests for the documents / paragraphs / topics / sources queries in lib/content.ts.
//
// The fixture mirrors the real Payload schema: `_status` is the publish flag (C1),
// localized text lives in `*_locales` side tables (C2), `doc_paragraphs.number` is
// `numeric` in Postgres and every relationship FK is `<field>_id` (C3).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';

const DSN = process.env.DATABASE_URI_TEST;
let pool;

before(async () => {
  if (!DSN) throw new Error('DATABASE_URI_TEST is required for these tests');
  process.env.DATABASE_URI = DSN;
  pool = new Pool({ connectionString: DSN });

  for (const t of [
    'doc_paragraphs_locales',
    'doc_paragraphs',
    'documents_locales',
    'documents',
    'topics_locales',
    'topics',
    'sources',
  ]) {
    await pool.query(`drop table if exists ${t}`);
  }

  await pool.query(`create table documents (
    id serial primary key, abbreviation text, slug text unique, doc_type text default 'encyclical',
    signed_date timestamptz, published_date timestamptz, vatican_url text, _status text default 'draft')`);
  await pool.query(`create table documents_locales (
    id serial primary key, _parent_id integer references documents(id) on delete cascade,
    _locale text not null, title text, summary text, unique (_locale, _parent_id))`);
  await pool.query(`create table doc_paragraphs (
    id serial primary key, document_id integer references documents(id) on delete cascade,
    number numeric not null, extract text)`);
  await pool.query(`create table doc_paragraphs_locales (
    id serial primary key, _parent_id integer references doc_paragraphs(id) on delete cascade,
    _locale text not null, note text, unique (_locale, _parent_id))`);
  await pool.query(`create table topics (
    id serial primary key, slug text unique)`);
  await pool.query(`create table topics_locales (
    id serial primary key, _parent_id integer references topics(id) on delete cascade,
    _locale text not null, name text, description text, unique (_locale, _parent_id))`);
  await pool.query(`create table sources (
    id serial primary key, kind text, authors text, title text, year numeric, publisher text,
    journal text, volume text, issue text, pages text, doi text, url text)`);

  // Two published documents (one newer, one older) and one draft.
  await pool.query(`insert into documents (abbreviation, slug, doc_type, published_date, vatican_url, _status) values
    ('DP','draft-doc','encyclical', now(), null, 'draft'),
    ('MH','magnifica-humanitas','encyclical', '2025-05-01T00:00:00Z', 'https://www.vatican.va/mh', 'published'),
    ('LL','older-letter','letter', '2024-01-01T00:00:00Z', null, 'published')`);
  await pool.query(`insert into documents_locales (_parent_id, _locale, title, summary)
    select id, 'en', 'Magnifica Humanitas', 'English summary' from documents where slug='magnifica-humanitas'`);
  await pool.query(`insert into documents_locales (_parent_id, _locale, title, summary)
    select id, 'es', 'Magnifica Humanitas (ES)', 'Resumen' from documents where slug='magnifica-humanitas'`);
  await pool.query(`insert into documents_locales (_parent_id, _locale, title)
    select id, 'en', 'Older Letter' from documents where slug='older-letter'`);
  await pool.query(`insert into documents_locales (_parent_id, _locale, title)
    select id, 'en', 'Draft Doc' from documents where slug='draft-doc'`);

  // Paragraphs inserted out of order; numbers are numeric in the real schema.
  await pool.query(`insert into doc_paragraphs (document_id, number, extract)
    select id, 12, 'extract twelve' from documents where slug='magnifica-humanitas'`);
  await pool.query(`insert into doc_paragraphs (document_id, number, extract)
    select id, 2, 'extract two' from documents where slug='magnifica-humanitas'`);
  await pool.query(`insert into doc_paragraphs_locales (_parent_id, _locale, note)
    select id, 'en', 'note for 12 en' from doc_paragraphs where number=12`);
  await pool.query(`insert into doc_paragraphs_locales (_parent_id, _locale, note)
    select id, 'es', 'nota para 12' from doc_paragraphs where number=12`);

  await pool.query(`insert into topics (slug) values ('leo-xiv')`);
  await pool.query(`insert into topics_locales (_parent_id, _locale, name, description)
    select id, 'en', 'Leo XIV', 'the pope' from topics where slug='leo-xiv'`);
  await pool.query(`insert into topics_locales (_parent_id, _locale, name, description)
    select id, 'es', 'León XIV', 'el papa' from topics where slug='leo-xiv'`);

  await pool.query(`insert into sources (kind, authors, title, year, publisher, doi) values
    ('book','Doe, A.','A book',1999,'Publish Co',null),
    ('journal-article','Smith, J.','A study',2021,null,'10.1000/xyz')`);
});

after(async () => {
  const db = await import('../src/lib/db.ts').catch(() => null);
  if (db && typeof db.closePool === 'function') await db.closePool();
  if (pool) await pool.end();
});

test('listPublishedDocuments filters drafts and orders newest first', async () => {
  const { listPublishedDocuments } = await import('../src/lib/content.ts');
  const rows = await listPublishedDocuments('en');
  assert.deepEqual(rows.map((r) => r.slug), ['magnifica-humanitas', 'older-letter']);
});

test('listPublishedDocuments resolves the requested locale with fallback', async () => {
  const { listPublishedDocuments } = await import('../src/lib/content.ts');
  const en = await listPublishedDocuments('en');
  const es = await listPublishedDocuments('es');
  assert.equal(en.find((r) => r.slug === 'magnifica-humanitas').title, 'Magnifica Humanitas');
  assert.equal(es.find((r) => r.slug === 'magnifica-humanitas').title, 'Magnifica Humanitas (ES)');
  assert.equal(es.find((r) => r.slug === 'older-letter').title, 'Older Letter'); // fallback
});

test('getDocumentBySlug returns a published doc and undefined for a draft', async () => {
  const { getDocumentBySlug } = await import('../src/lib/content.ts');
  const doc = await getDocumentBySlug('magnifica-humanitas', 'en');
  assert.equal(doc.abbreviation, 'MH');
  const draft = await getDocumentBySlug('draft-doc', 'en');
  assert.equal(draft, undefined);
});

test('listParagraphs returns integer numbers ascending (numeric cast, C3) with localized note', async () => {
  const content = await import('../src/lib/content.ts');
  const doc = await content.getDocumentBySlug('magnifica-humanitas', 'en');
  const rows = await content.listParagraphs(doc.id, 'en');
  assert.deepEqual(rows.map((r) => r.number), [2, 12]);
  assert.equal(typeof rows[0].number, 'number');
  const es = await content.listParagraphs(doc.id, 'es');
  assert.equal(es.find((r) => r.number === 12).note, 'nota para 12');
});

test('listTopics prefers the requested locale', async () => {
  const { listTopics } = await import('../src/lib/content.ts');
  const en = await listTopics('en');
  const es = await listTopics('es');
  assert.equal(en[0].name, 'Leo XIV');
  assert.equal(en[0].slug, 'leo-xiv');
  assert.equal(es[0].name, 'León XIV');
});

test('listSources returns sources with an integer year', async () => {
  const { listSources } = await import('../src/lib/content.ts');
  const rows = await listSources();
  assert.equal(rows.length, 2);
  assert.equal(typeof rows[0].year, 'number'); // numeric cast, same trap as C3
});
