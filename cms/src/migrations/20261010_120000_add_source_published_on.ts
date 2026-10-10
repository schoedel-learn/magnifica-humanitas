import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `sources.published_on` — the exact publication date of a source when the source publishes
 * one, so the bibliography can render APA 7's most-specific-date form `(2026, May 25)` for
 * news and web pages instead of a bare year. Nullable: every existing row keeps its `year`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "published_on" timestamp(3) with time zone;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "sources" DROP COLUMN IF EXISTS "published_on";`)
}
