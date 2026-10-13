-- Dev fixtures for the Magnifica Humanitas Astro site.
--
-- Purpose: give the pages real content to render so the build can be PROVEN, instead of
-- validated against empty lists. Everything here is dev-only sample data.
--
-- Idempotent: every insert is guarded by a fixed natural key (slug, DOI, or a
-- not-exists check), so re-running the file neither duplicates rows nor errors.
-- Target the throwaway dev database only:
--   docker exec -i mh-dev-pg psql -U mh_admin -d magnifica_humanitas_dev < ops/sql/dev-fixtures.sql
--
-- Copyright posture (D9): the paragraphs below carry SHORT attributed extracts only and
-- never a full document.

begin;

-- ---------------------------------------------------------------------------
-- Topics
-- ---------------------------------------------------------------------------
insert into topics (slug) values ('leo-xiv'), ('magisterium')
on conflict (slug) do nothing;

insert into topics_locales (name, description, _locale, _parent_id)
select 'Pope Leo XIV', 'The magisterium of Pope Leo XIV.', 'en', t.id
from topics t where t.slug = 'leo-xiv'
on conflict (_locale, _parent_id) do nothing;

insert into topics_locales (name, description, _locale, _parent_id)
select 'Magisterium', 'The teaching office of the Church.', 'en', t.id
from topics t where t.slug = 'magisterium'
on conflict (_locale, _parent_id) do nothing;

-- ---------------------------------------------------------------------------
-- One published document
-- ---------------------------------------------------------------------------
insert into documents
  (abbreviation, slug, doc_type, signed_date, published_date, vatican_url,
   language_of_original, _status)
values
  ('MH', 'magnifica-humanitas', 'encyclical', '2025-10-04', '2025-10-04',
   'https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/leo-xiv-20251004-magnifica-humanitas.html',
   'la', 'published')
on conflict (slug) do nothing;

-- English title/summary.
insert into documents_locales (title, summary, _locale, _parent_id)
select 'Magnifica Humanitas',
       'On the dignity of the human person in the age of artificial intelligence.',
       'en', d.id
from documents d where d.slug = 'magnifica-humanitas'
on conflict (_locale, _parent_id) do nothing;

-- Spanish title/summary: the /es/ routes show a real translation here. The post below is
-- deliberately English-only, so on the same build you can see BOTH a translation and the
-- fallback-to-English path (the point the fixtures are meant to prove).
insert into documents_locales (title, summary, _locale, _parent_id)
select 'Magnifica Humanitas',
       'Sobre la dignidad de la persona humana en la era de la inteligencia artificial.',
       'es', d.id
from documents d where d.slug = 'magnifica-humanitas'
on conflict (_locale, _parent_id) do nothing;

-- Two paragraphs, short extracts only.
--
-- The extract is a LOCALIZED field, so English goes in the side table below rather than on the
-- parent row (migration 20261006_160000 moved it). Writing it as a parent column — as this file
-- did until 2026-10-12 — fails with `column "extract" of relation "doc_paragraphs" does not
-- exist`, which is how the staleness surfaced.
insert into doc_paragraphs (document_id, number)
select d.id, v.pn
from documents d
cross join (values (1), (12)) as v(pn)
where d.slug = 'magnifica-humanitas'
  and not exists (
    select 1 from doc_paragraphs p
     where p.document_id = d.id and p.number = v.pn
  );

insert into doc_paragraphs_locales (extract, _locale, _parent_id)
select v.txt, 'en', p.id
from doc_paragraphs p
join documents d on d.id = p.document_id
cross join (values
  (1,  'The Church enters this conversation with a word of hope, not of fear.'),
  (12, 'Human dignity is not a concession granted by technology, but a gift that precedes it.')
) as v(pn, txt)
where d.slug = 'magnifica-humanitas' and p.number = v.pn
on conflict (_locale, _parent_id) do nothing;

insert into doc_paragraphs_locales (note, _locale, _parent_id)
select 'Opening paragraph.', 'en', p.id
from doc_paragraphs p
join documents d on d.id = p.document_id
where d.slug = 'magnifica-humanitas' and p.number = 1
on conflict (_locale, _parent_id) do nothing;

-- Attach paragraph 12 to the "Pope Leo XIV" topic (this is how a document carries a topic:
-- topics live on the paragraph, doc_paragraphs_rels).
insert into doc_paragraphs_rels (parent_id, path, topics_id, "order")
select p.id, 'topics', t.id, 0
from doc_paragraphs p
join documents d on d.id = p.document_id
join topics t on t.slug = 'leo-xiv'
where d.slug = 'magnifica-humanitas' and p.number = 12
  and not exists (
    select 1 from doc_paragraphs_rels r
     where r.parent_id = p.id and r.path = 'topics' and r.topics_id = t.id
  );

-- ---------------------------------------------------------------------------
-- Two sources
-- ---------------------------------------------------------------------------
insert into sources
  (kind, authors, title, year, journal, volume, issue, pages, doi, verified_on)
select 'journal-article', 'Smith, J.', 'Dignity and the Limits of Computation', 2024,
       'Journal of Theological Ethics', '4', '2', '11-29', '10.1000/xyz123', now()
where not exists (select 1 from sources where doi = '10.1000/xyz123');

insert into sources (kind, authors, title, year, publisher)
select 'book', 'Doe, A.', 'The Human Person in the Digital Age', 1999, 'Publish Co'
where not exists (
  select 1 from sources
   where authors = 'Doe, A.' and title = 'The Human Person in the Digital Age'
);

-- ---------------------------------------------------------------------------
-- One published post with a Lexical rich-text body (jsonb)
-- ---------------------------------------------------------------------------
insert into posts (slug, post_type, published_at, _status)
values ('renewing-the-humanism', 'essay', now() - interval '2 days', 'published')
on conflict (slug) do nothing;

insert into posts_locales (title, abstract, body, _locale, _parent_id)
select
  'Renewing the Humanism',
  'A short essay on what the encyclical asks of the institutions that build machine intelligence.',
  $lex${"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"textStyle":"","children":[{"type":"text","detail":0,"format":0,"mode":"normal","style":"","text":"The encyclical places human dignity at the centre of the debate about artificial intelligence, and asks institutions to answer for the dignity they either protect or erode.","version":1}]}]}}$lex$::jsonb,
  'en', p.id
from posts p where p.slug = 'renewing-the-humanism'
on conflict (_locale, _parent_id) do nothing;

-- Post -> topic and post -> document links (posts_rels; the only relationship table for posts).
insert into posts_rels (parent_id, path, topics_id, "order")
select p.id, 'topics', t.id, 0
from posts p join topics t on t.slug = 'leo-xiv'
where p.slug = 'renewing-the-humanism'
  and not exists (
    select 1 from posts_rels r
     where r.parent_id = p.id and r.path = 'topics' and r.topics_id = t.id
  );

insert into posts_rels (parent_id, path, documents_id, "order")
select p.id, 'documents', d.id, 0
from posts p join documents d on d.slug = 'magnifica-humanitas'
where p.slug = 'renewing-the-humanism'
  and not exists (
    select 1 from posts_rels r
     where r.parent_id = p.id and r.path = 'documents' and r.documents_id = d.id
  );

-- Post -> source claim link (post_sources), so the post page renders its source list.
insert into post_sources (post_id, source_id, locator)
select p.id, s.id, 'MH 12'
from posts p join sources s on s.doi = '10.1000/xyz123'
where p.slug = 'renewing-the-humanism'
  and not exists (
    select 1 from post_sources ps where ps.post_id = p.id and ps.source_id = s.id
  );

commit;
