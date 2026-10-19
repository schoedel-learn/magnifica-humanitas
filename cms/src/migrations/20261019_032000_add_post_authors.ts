import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `posts.authors` — the by-line.
 *
 * Nullable on purpose: blank means "credited to the publisher", which is what the site renders,
 * so no post needs a value for the by-line to appear. Both tables, because Posts has drafts —
 * Payload mirrors every column into `_posts_v` as `version_<column>`, and a save fails on a
 * version row whose column is missing.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "authors" varchar;`)
  await db.execute(sql`ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_authors" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_authors";`)
  await db.execute(sql`ALTER TABLE "posts" DROP COLUMN IF EXISTS "authors";`)
}
