// robots.txt, generated at build time so the sitemap URL stays in one place.
// Policy: Barry welcomes AI and Google crawlers on his sites — Allow: / and no bot blocks.
import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = () => {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: https://magnifici.agentesfidei.org/sitemap-index.xml',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
