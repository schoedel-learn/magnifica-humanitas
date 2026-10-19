import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `posts.affiliation` — the author's organizational affiliation, printed under the by-line.
 *
 * Distinct from the publisher: the by-line already says who publishes the post, and this says
 * where the author works. Cannot be folded into `authors` without losing the distinction, and
 * cannot be a site-wide constant because an outside contributor's affiliation is their own.
 *
 * Both tables: Posts has drafts, so `_posts_v` mirrors every column as `version_<column>`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "affiliation" varchar;`)
  await db.execute(sql`ALTER TABLE "_posts_v" ADD COLUMN IF NOT EXISTS "version_affiliation" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "_posts_v" DROP COLUMN IF EXISTS "version_affiliation";`)
  await db.execute(sql`ALTER TABLE "posts" DROP COLUMN IF EXISTS "affiliation";`)
}
