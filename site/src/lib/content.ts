import { query } from './db';

export type PostRow = {
  id: number;
  slug: string;
  post_type: string;
  published_at: string | Date | null;
  title: string | null;
  abstract: string | null;
};

// Published posts, newest first, with localized text resolved for `locale`.
//
// The publish flag is Payload's native `_status` (C1). Localized fields live in the
// `posts_locales` side table, so ONE lateral join picks the requested locale and falls
// back to whatever row exists (default 'en') — index 0 wins via the CASE ordering (C2).
export async function listPublishedPosts(locale = 'en'): Promise<PostRow[]> {
  return query<PostRow>(
    `select p.id, p.slug, p.post_type, p.published_at, l.title, l.abstract
       from posts p
       join lateral (
         select title, abstract
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
};

const DOCUMENT_COLUMNS = `d.id, d.abbreviation, d.slug, d.doc_type, d.signed_date,
       d.published_date, d.vatican_url, l.title, l.summary`;

// Published documents (the magisterial corpus), newest first, localized for `locale`.
export async function listPublishedDocuments(locale = 'en'): Promise<DocumentRow[]> {
  return query<DocumentRow>(
    `select ${DOCUMENT_COLUMNS}
       from documents d
       join lateral (
         select title, summary
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
         select title, summary
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
};

// Paragraphs of one document, ascending. `doc_paragraphs.number` is numeric in Postgres
// and node-pg returns numeric as a STRING, so it is cast to int here (C3); `extract` is a
// plain column while `note` is localized in `doc_paragraphs_locales` (C2).
export async function listParagraphs(
  documentId: number,
  locale = 'en',
): Promise<ParagraphRow[]> {
  return query<ParagraphRow>(
    `select p.number::int as number, p.extract, l.note
       from doc_paragraphs p
       left join lateral (
         select note
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
};

// Topics are a taxonomic label; `name`/`description` are localized (C2).
export async function listTopics(locale = 'en'): Promise<TopicRow[]> {
  return query<TopicRow>(
    `select t.id, t.slug, l.name, l.description
       from topics t
       join lateral (
         select name, description
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
  publisher: string | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
};

// The bibliography. `sources` has no localized display columns used here, and `year` is
// numeric in Postgres → cast to int so the citation formatter gets a number (same trap as C3).
export async function listSources(): Promise<SourceRow[]> {
  return query<SourceRow>(
    `select id, kind, authors, title, year::int as year, publisher, journal, volume,
            issue, pages, doi, url
       from sources
      order by authors asc, year asc nulls last`,
  );
}
