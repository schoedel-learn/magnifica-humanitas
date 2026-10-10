import { query } from './db';

export type PostRow = {
  id: number;
  slug: string;
  post_type: string;
  published_at: string | Date | null;
  title: string | null;
  abstract: string | null;
  // Which locale the lateral join actually landed on. When this differs from the requested
  // locale the page is showing fallback content, and the caller MUST say so rather than
  // claim the page is in the requested language (see Base.astro's contentLang).
  resolved_locale: string | null;
};

// Published posts, newest first, with localized text resolved for `locale`.
//
// The publish flag is Payload's native `_status` (C1). Localized fields live in the
// `posts_locales` side table, so ONE lateral join picks the requested locale and falls
// back to whatever row exists (default 'en') — index 0 wins via the CASE ordering (C2).
export async function listPublishedPosts(locale = 'en'): Promise<PostRow[]> {
  return query<PostRow>(
    `select p.id, p.slug, p.post_type, p.published_at, l.title, l.abstract, l.resolved_locale
       from posts p
       join lateral (
         select title, abstract, loc._locale as resolved_locale
           from posts_locales loc
          where loc._parent_id = p.id
          order by case loc._locale when $1 then 0 else 1 end, loc._locale
          limit 1
       ) l on true
      where p._status = 'published'
      order by p.published_at desc nulls last, p.id desc`,
    [locale],
  );
}

export type DocumentRow = {
  id: number;
  abbreviation: string;
  slug: string;
  doc_type: string;
  signed_date: string | Date | null;
  published_date: string | Date | null;
  vatican_url: string | null;
  title: string | null;
  summary: string | null;
  resolved_locale: string | null;
};

const DOCUMENT_COLUMNS = `d.id, d.abbreviation, d.slug, d.doc_type, d.signed_date,
       d.published_date, d.vatican_url, l.title, l.summary, l.resolved_locale`;

// Published documents (the magisterial corpus), newest first, localized for `locale`.
export async function listPublishedDocuments(locale = 'en'): Promise<DocumentRow[]> {
  return query<DocumentRow>(
    `select ${DOCUMENT_COLUMNS}
       from documents d
       join lateral (
         select title, summary, loc._locale as resolved_locale
           from documents_locales loc
          where loc._parent_id = d.id
          order by case loc._locale when $1 then 0 else 1 end, loc._locale
          limit 1
       ) l on true
      where d._status = 'published'
      order by d.published_date desc nulls last, d.id desc`,
    [locale],
  );
}

// A single published document by slug; undefined when missing or unpublished.
export async function getDocumentBySlug(
  slug: string,
  locale = 'en',
): Promise<DocumentRow | undefined> {
  const rows = await query<DocumentRow>(
    `select ${DOCUMENT_COLUMNS}
       from documents d
       join lateral (
         select title, summary, loc._locale as resolved_locale
           from documents_locales loc
          where loc._parent_id = d.id
          order by case loc._locale when $1 then 0 else 1 end, loc._locale
          limit 1
       ) l on true
      where d.slug = $2 and d._status = 'published'
      limit 1`,
    [locale, slug],
  );
  return rows[0];
}

export type ParagraphRow = {
  number: number;
  extract: string | null;
  note: string | null;
  resolved_locale: string | null;
};

// Paragraphs of one document, ascending. `doc_paragraphs.number` is numeric in Postgres
// and node-pg returns numeric as a STRING, so it is cast to int here (C3).
//
// Both `extract` and `note` are localized in `doc_paragraphs_locales`: the Spanish page
// quotes the *Spanish* edition of the encyclical rather than a translation of the English,
// so the two quotations have to coexist. `extract` is quoted because it collides with the
// SQL EXTRACT() construct. The lateral join prefers the requested locale and falls back.
export async function listParagraphs(
  documentId: number,
  locale = 'en',
): Promise<ParagraphRow[]> {
  return query<ParagraphRow>(
    `select p.number::int as number, l."extract", l.note, l.resolved_locale
       from doc_paragraphs p
       left join lateral (
         select loc."extract", loc.note, loc._locale as resolved_locale
           from doc_paragraphs_locales loc
          where loc._parent_id = p.id
          order by case loc._locale when $2 then 0 else 1 end, loc._locale
          limit 1
       ) l on true
      where p.document_id = $1
      order by p.number asc`,
    [documentId, locale],
  );
}

export type TopicRow = {
  id: number;
  slug: string;
  name: string | null;
  description: string | null;
  resolved_locale: string | null;
};

// Topics are a taxonomic label; `name`/`description` are localized (C2).
export async function listTopics(locale = 'en'): Promise<TopicRow[]> {
  return query<TopicRow>(
    `select t.id, t.slug, l.name, l.description, l.resolved_locale
       from topics t
       join lateral (
         select name, description, loc._locale as resolved_locale
           from topics_locales loc
          where loc._parent_id = t.id
          order by case loc._locale when $1 then 0 else 1 end, loc._locale
          limit 1
       ) l on true
      order by l.name asc`,
    [locale],
  );
}

export type SourceRow = {
  id: number;
  kind: string;
  authors: string;
  title: string;
  year: number | null;
  publishedOn: string | Date | null;
  edition: string | null;
  publisher: string | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  verified_on: string | Date | null;
};

// The bibliography. `sources` has no localized display columns used here, and `year` is
// numeric in Postgres → cast to int so the citation formatter gets a number (same trap as C3).
// `published_on` is aliased to the formatter's camelCase field so the APA date element can use
// the most specific date the source publishes (full date for news/web, else the year).
export async function listSources(): Promise<SourceRow[]> {
  return query<SourceRow>(
    `select id, kind, authors, title, year::int as year, published_on as "publishedOn", edition,
            publisher, journal, volume, issue, pages, doi, url, verified_on
       from sources
      order by authors asc, year asc nulls last`,
  );
}

export type PostDetailRow = {
  id: number;
  slug: string;
  post_type: string;
  published_at: string | Date | null;
  title: string | null;
  abstract: string | null;
  body: unknown;
  resolved_locale: string | null;
};

// One published post by slug including its rich-text `body` (Payload Lexical JSON stored
// as jsonb), localized with the same lateral-join preference/fallback as the list query (C2).
export async function getPostBySlug(
  slug: string,
  locale = 'en',
): Promise<PostDetailRow | undefined> {
  const rows = await query<PostDetailRow>(
    `select p.id, p.slug, p.post_type, p.published_at, l.title, l.abstract, l.body, l.resolved_locale
       from posts p
       join lateral (
         select title, abstract, body, loc._locale as resolved_locale
           from posts_locales loc
          where loc._parent_id = p.id
          order by case loc._locale when $2 then 0 else 1 end, loc._locale
          limit 1
       ) l on true
      where p.slug = $1 and p._status = 'published'
      limit 1`,
    [slug, locale],
  );
  return rows[0];
}

export type PostSourceRow = {
  locator: string;
  authors: string;
  year: number | null;
  publishedOn: string | Date | null;
  kind: string;
  title: string;
  edition: string | null;
  publisher: string | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
};

// The bibliography entries linked to one post (post_sources → sources) with the locator
// that says where in the source the claim is supported. `year` is numeric → int (C3).
export async function listSourcesForPost(postId: number): Promise<PostSourceRow[]> {
  return query<PostSourceRow>(
    `select ps.locator, s.authors, s.year::int as year, s.published_on as "publishedOn",
            s.kind, s.title, s.edition, s.publisher, s.journal, s.volume, s.issue, s.pages, s.doi, s.url
       from post_sources ps
       join sources s on s.id = ps.source_id
      where ps.post_id = $1
      order by ps.id asc`,
    [postId],
  );
}

// One topic by slug, localized (name/description live in topics_locales, C2).
export async function getTopicBySlug(
  slug: string,
  locale = 'en',
): Promise<TopicRow | undefined> {
  const rows = await query<TopicRow>(
    `select t.id, t.slug, l.name, l.description, l.resolved_locale
       from topics t
       join lateral (
         select name, description, loc._locale as resolved_locale
           from topics_locales loc
          where loc._parent_id = t.id
          order by case loc._locale when $2 then 0 else 1 end, loc._locale
          limit 1
       ) l on true
      where t.slug = $1
      limit 1`,
    [slug, locale],
  );
  return rows[0];
}

// Published posts carrying a topic (posts_rels path='topics'), newest first.
export async function listPostsForTopic(topicId: number, locale = 'en'): Promise<PostRow[]> {
  return query<PostRow>(
    `select p.id, p.slug, p.post_type, p.published_at, l.title, l.abstract, l.resolved_locale
       from posts p
       join posts_rels r on r.parent_id = p.id and r.path = 'topics' and r.topics_id = $2
       join lateral (
         select title, abstract, loc._locale as resolved_locale
           from posts_locales loc
          where loc._parent_id = p.id
          order by case loc._locale when $1 then 0 else 1 end, loc._locale
          limit 1
       ) l on true
      where p._status = 'published'
      order by p.published_at desc nulls last, p.id desc`,
    [locale, topicId],
  );
}

// Published documents carrying a topic. Topics attach to documents at the PARAGRAPH level
// (doc_paragraphs_rels path='topics') — there is no documents_rels table (C4).
export async function listDocumentsForTopic(
  topicId: number,
  locale = 'en',
): Promise<DocumentRow[]> {
  return query<DocumentRow>(
    `select distinct on (d.id) ${DOCUMENT_COLUMNS}
       from documents d
       join doc_paragraphs p on p.document_id = d.id
       join doc_paragraphs_rels r
         on r.parent_id = p.id and r.path = 'topics' and r.topics_id = $2
       join lateral (
         select title, summary, loc._locale as resolved_locale
           from documents_locales loc
          where loc._parent_id = d.id
          order by case loc._locale when $1 then 0 else 1 end, loc._locale
          limit 1
       ) l on true
      where d._status = 'published'
      order by d.id, d.published_date desc nulls last`,
    [locale, topicId],
  );
}
