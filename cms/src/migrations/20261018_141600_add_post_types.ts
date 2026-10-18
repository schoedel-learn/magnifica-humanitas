import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Four new `posts.post_type` values, adding the forms the restructure needs.
 *
 * `guide`    — the Agentes Veritatis page, a standing teaching page rather than a dated essay
 * `extracts` — the running set of quotations drawn out of the encyclical ("a post in progress")
 * `art`, `poem` — non-prose pieces, so a post does not have to be filed as an essay or a note
 *
 * The version table mirrors the enum (Payload keeps a `_posts_v_version_post_type` beside it) and
 * both must gain the values or the CMS refuses to save a version of a guide.
 *
 * `ADD VALUE` cannot be rolled back — Postgres has no `DROP VALUE` — so `down()` is deliberately
 * a no-op rather than a lie. Narrowing the enum would mean recreating the type and rewriting
 * every row and version that uses one of these values.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const type of ['enum_posts_post_type', 'enum__posts_v_version_post_type']) {
    await db.execute(sql.raw(`ALTER TYPE "${type}" ADD VALUE IF NOT EXISTS 'guide'`))
    await db.execute(sql.raw(`ALTER TYPE "${type}" ADD VALUE IF NOT EXISTS 'extracts'`))
    await db.execute(sql.raw(`ALTER TYPE "${type}" ADD VALUE IF NOT EXISTS 'art'`))
    await db.execute(sql.raw(`ALTER TYPE "${type}" ADD VALUE IF NOT EXISTS 'poem'`))
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Intentional no-op: Postgres cannot remove an enum value.
}
