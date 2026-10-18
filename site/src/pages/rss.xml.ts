// RSS feed over the published posts. Uses the same listPublishedPosts() the pages use, so
// the feed can never drift from the site (the citation-formatting rationale, applied here).
//
// The Veritas guide is not a post (it is a CMS topic page), so it is inserted here as a
// fixed-date item: a build-time date would churn the feed on every deploy. Its link and
// description mirror the page's own meta description (plan answer N10).
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { listPublishedPosts } from '../lib/content';

export const prerender = true;

const VERITAS_ITEM = {
  title: 'Agentes Veritatis — a guide to becoming disciples of the Truth',
  pubDate: new Date('2026-10-15'),
  description:
    'A three-step Scriptural guide to becoming a disciple of the Truth: awakening, commitment, sacrifice — integrity first, then truthful witness with AI.',
  link: '/topics/truth/',
};

export const GET: APIRoute = async (context) => {
  const posts = await listPublishedPosts('en');
  return rss({
    title: 'Magnifica Humanitas',
    description:
      'Posts with cited sources on the teaching of Pope Leo XIV.',
    site: context.site ?? 'https://magnifica.agentesfidei.org',
    items: [VERITAS_ITEM, ...posts.map((post) => ({
      title: post.title ?? post.slug,
      pubDate: post.published_at ? new Date(post.published_at) : new Date(),
      description: post.abstract ?? '',
      link: `/posts/${post.slug}/`,
    }))],
    customData: '<language>en</language>',
  });
};
