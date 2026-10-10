import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `sources.edition` — the edition statement (e.g. `2nd ed.`) kept in its own column rather
 * than folded into `title`, because APA 7 prints it after the title and *outside* the
 * italics: folding it into the title would italicise it. Nullable, since only works cited by
 * edition carry one.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "edition" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sources" DROP COLUMN IF EXISTS "edition";`)
}
