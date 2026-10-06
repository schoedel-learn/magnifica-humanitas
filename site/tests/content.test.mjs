// Tests for site/src/lib/content.ts run against a throwaway Postgres.
//
// The fixture mirrors the REAL Payload schema: the publish flag is `_status` (C1) and
// localized text lives in `*_locales` side tables joined laterally with a locale
// preference plus English fallback (C2, C5).
//
// DATABASE_URI_TEST points at a dedicated `magnifica_humanitas_test` database on the dev
// Postgres container, so the real dev schema the CMS uses is never dropped by the fixture.
// Create it once:
//   docker exec mh-dev-pg psql -U mh_admin -d postgres -c "create database magnifica_humanitas_test"
// Then run:
//   DATABASE_URI_TEST="postgres://mh_admin:devonly@127.0.0.1:55433/magnifica_humanitas_test" npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { assertScratchDatabase } from './_guard.mjs';

const DSN = process.env.DATABASE_URI_TEST;
let pool;

before(async () => {
  assertScratchDatabase(DSN);
  // content.ts reads DATABASE_URI (its production variable). Point it at the same fixture
  // database so the library code under test queries the test tables.
  process.env.DATABASE_URI = DSN;
  pool = new Pool({ connectionString: DSN });

  await pool.query(`drop table if exists posts_locales`);
  await pool.query(`drop table if exists posts`);
  await pool.query(`create table posts (
    id serial primary key,
    slug text unique,
    post_type text default 'essay',
    published_at timestamptz,
    _status text default 'draft')`);
  await pool.query(`create table posts_locales (
    id serial primary key,
    _parent_id integer references posts(id) on delete cascade,
    _locale text not null,
    title text,
    abstract text,
    unique (_locale, _parent_id))`);

  // One draft and two published rows. The newest published row also carries an 'es' title
  // (C5) so the locale preference and the fallback are both exercised.
  await pool.query(`insert into posts (slug, post_type, _status, published_at) values
    ('draft-one','essay','draft', now()),
    ('live-two','essay','published', now() - interval '1 day'),
    ('live-three','essay','published', now())`);
  await pool.query(`insert into posts_locales (_parent_id, _locale, title, abstract)
    select id, 'en', 'Live two', 'abstract two' from posts where slug='live-two'`);
  await pool.query(`insert into posts_locales (_parent_id, _locale, title, abstract)
    select id, 'en', 'Live three', 'abstract three' from posts where slug='live-three'`);
  await pool.query(`insert into posts_locales (_parent_id, _locale, title, abstract)
    select id, 'es', 'Live tres', 'resumen tres' from posts where slug='live-three'`);
  await pool.query(`insert into posts_locales (_parent_id, _locale, title)
    select id, 'en', 'Draft one' from posts where slug='draft-one'`);
});

after(async () => {
  const db = await import('../src/lib/db.ts').catch(() => null);
  if (db && typeof db.closePool === 'function') await db.closePool();
  if (pool) await pool.end();
});

test('listPublishedPosts returns only published rows, newest first', async () => {
  const { listPublishedPosts } = await import('../src/lib/content.ts');
  const rows = await listPublishedPosts('en');
  assert.deepEqual(rows.map((r) => r.slug), ['live-three', 'live-two']);
});

test('listPublishedPosts prefers the requested locale and falls back to en', async () => {
  const { listPublishedPosts } = await import('../src/lib/content.ts');
  const en = await listPublishedPosts('en');
  const es = await listPublishedPosts('es');
  assert.equal(en.find((r) => r.slug === 'live-three').title, 'Live three');
  assert.equal(es.find((r) => r.slug === 'live-three').title, 'Live tres');
  // live-two has no 'es' row: the lateral join must fall back to its English title.
  assert.equal(es.find((r) => r.slug === 'live-two').title, 'Live two');
});
