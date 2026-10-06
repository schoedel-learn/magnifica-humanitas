import { query } from './db';

export type PostRow = {
  id: number;
  slug: string;
  post_type: string;
  published_at: string | null;
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
