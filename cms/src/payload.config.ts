import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Documents } from './collections/Documents'
import { DocParagraphs } from './collections/DocParagraphs'
import { Posts } from './collections/Posts'
import { Sources } from './collections/Sources'
import { PostSources } from './collections/PostSources'
import { Topics } from './collections/Topics'
import { SiteSettings } from './globals/SiteSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Email is wired up ONLY when credentials are actually present.
//
// Configuring the adapter with an empty password is worse than leaving it unconfigured: every
// send would throw, so a password reset would fail loudly instead of falling back to Payload's
// console adapter (which logs the attempt and keeps the request working). This way the code
// ships safely and starts sending the moment the credentials land in the environment.
const emailReady = Boolean(process.env.SMTP_PASS && process.env.EMAIL_FROM)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Magnifici Agentes Fidei',
      description: 'The editorial desk for the Magnifici Agentes Fidei publication.',
    },
  },
  collections: [Documents, DocParagraphs, Posts, Sources, PostSources, Topics, Media, Users],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // EN + ES, Spanish falling back to English until a translation exists (Q2, 2026-10-06).
  localization: {
    locales: ['en', 'es'],
    defaultLocale: 'en',
    fallback: true,
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    // Schema changes go through committed migrations only. With push enabled the dev
    // server auto-syncs the schema and `payload migrate:create` then emits an EMPTY
    // migration — but the same SQL must also create the production tables (task 2.11).
    push: false,
  }),
  sharp,
  // Transactional mail for password resets. SendGrid's SMTP relay, because the alternative —
  // a Mailcow mailbox on the publication's domain — would tie password resets to a mailbox
  // that routes into the helpdesk (support@catholic.work), which is the wrong place for a
  // reset link to land.
  ...(emailReady
    ? {
        email: nodemailerAdapter({
          defaultFromAddress: process.env.EMAIL_FROM as string,
          defaultFromName: 'Magnifici Agentes Fidei',
          transportOptions: {
            host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
            port: Number(process.env.SMTP_PORT || 587),
            // SendGrid's SMTP username is literally the string "apikey"; the password is the
            // API key itself.
            auth: {
              user: process.env.SMTP_USER || 'apikey',
              pass: process.env.SMTP_PASS as string,
            },
          },
        }),
      }
    : {}),
  plugins: [],
})
