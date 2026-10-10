// RSS feed over the published essays. Uses the same listPublishedPosts() the pages use, so
// the feed can never drift from the site (the citation-formatting rationale, applied here).
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { listPublishedPosts } from '../lib/content';

export const prerender = true;

export const GET: APIRoute = async (context) => {
  const posts = await listPublishedPosts('en');
  return rss({
    title: 'Magnifica Humanitas',
    description:
      'Essays with cited sources on the teaching of Pope Leo XIV.', 
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
