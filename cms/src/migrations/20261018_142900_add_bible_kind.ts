import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `bible` becomes a `sources.kind`, separate from `book`.
 *
 * Why a new value rather than renaming the display heading: the bibliography renders a section
 * per kind, so a Bible filed under `book` shares a section with every other book. A dedicated
 * kind gives Scripture its own "Bibles" section, where another translation can be added beside
 * the New American Bible.
 *
 * `ADD VALUE` cannot be undone — Postgres has no `DROP VALUE` — so `down()` is a no-op rather
 * than a lie. Removing the kind would mean recreating the enum and rewriting every row that
 * uses it.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(`ALTER TYPE "enum_sources_kind" ADD VALUE IF NOT EXISTS 'bible'`))
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Intentional no-op: Postgres cannot remove an enum value.
}
