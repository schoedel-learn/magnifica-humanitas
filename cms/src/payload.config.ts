import { postgresAdapter } from '@payloadcms/db-postgres'
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

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Documents, DocParagraphs, Posts, Sources, PostSources, Topics, Media, Users],
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
  plugins: [],
})
