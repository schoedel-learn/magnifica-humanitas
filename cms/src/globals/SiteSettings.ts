import type { GlobalConfig } from 'payload'

/**
 * Copy that appears on every page, and that should not need a deploy to change.
 *
 * The footer note used to live in the site's `i18n.ts`, so re-wording one sentence about the
 * publication meant editing TypeScript, committing, and forcing a publish. The sentence belongs
 * to the publication rather than to the code, so it gets an editing surface here.
 *
 * Two things make that safe rather than merely convenient:
 *
 *  - The global's tables carry the same statement-level trigger as every other content table
 *    (ops/sql/011_events_site_settings.sql), so a save queues a `content_events` row and the
 *    publish worker rebuilds the static site — the same loop every other edit rides.
 *  - The site falls back to its own copy if this row is missing or empty, so an unseeded or
 *    unreachable global can never leave the footer blank.
 *
 * Read is public: this is a line rendered on every public page, and it lets the CMS answer the
 * question "did my save land?" without a login.
 */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: {
    group: 'Site',
    description:
      'Lines that appear on every page. Saving here republishes the site on its own within about two minutes — no deploy needed.',
  },
  access: { read: () => true },
  fields: [
    {
      name: 'footerNote',
      type: 'textarea',
      localized: true,
      admin: {
        description:
          'The line in the dark footer at the foot of every page. Edit both languages: in Spanish write the sentence as Spanish, not as a translation of the English field. Empty means the built-in fallback text is used.',
      },
    },
  ],
}
