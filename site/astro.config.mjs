// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://magnifici.agentesfidei.org',
  vite: { plugins: [tailwindcss()] },
  integrations: [
    sitemap({
      // i18n shape verified against the current @astrojs/sitemap docs (2026-10): an object
      // with `defaultLocale` and a code -> hreflang `locales` map. It emits the alternate
      // xhtml:link entries for the en/es pairs. (@astrojs/sitemap 3.7.4.)
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', es: 'es' },
      },
    }),
  ],
});
