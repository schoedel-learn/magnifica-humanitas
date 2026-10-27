// RSS feed over the published posts. Uses the same listPublishedPosts() the pages use, so
// the feed can never drift from the site (the citation-formatting rationale, applied here).
//
// The Veritas guide USED to be injected here as a fixed-date special case because it was a CMS
// topic page rather than a post. It is a `posts` row now (post_type `guide`, published
// 2026-10-15), so the special case is gone: keeping it would list the guide twice.
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { listPublishedPosts } from '../lib/content';

export const prerender = true;

export const GET: APIRoute = async (context) => {
  const posts = await listPublishedPosts('en');
  return rss({
    title: 'Magnifica Agentes Fidei', // the publication's name, not the encyclical's
    description:
      'Posts with cited sources on the teaching of Pope Leo XIV.',
    site: context.site ?? 'https://magnifica.agentesfidei.org',
    items: posts.map((post) => ({
      title: post.title ?? post.slug,
      pubDate: post.published_at ? new Date(post.published_at) : new Date(),
      description: post.abstract ?? '',
      link: `/posts/${post.slug}/`,
    })),
    customData: '<language>en</language>',
  });
};
