import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add the `site_settings` global, so the footer note can be edited from the CMS.
 *
 * Written by hand from the generator's output rather than committed as generated, because
 * Payload's diff for this change also re-emitted four statements belonging to earlier work:
 *
 *   ALTER TABLE "sources" ALTER COLUMN "authors" DROP NOT NULL;
 *   ALTER TABLE "doc_paragraphs_locales" ADD COLUMN "extract" varchar;
 *   ALTER TABLE "sources" ADD COLUMN "edition" varchar;
 *   ALTER TABLE "sources" ADD COLUMN "published_on" timestamp(3) with time zone;
 *   ALTER TABLE "doc_paragraphs" DROP COLUMN "extract";
 *
 * They reappear because production's `payload_migrations` never recorded
 * `20261010_120000_add_source_published_on` or `20261010_140000_add_source_edition` — the columns
 * were added by hand at the time — so the differ sees them as missing. Verified against the live
 * database before trimming: `sources.edition` and `sources.published_on` exist,
 * `doc_paragraphs.extract` does not, and `doc_paragraphs_locales.extract` does. Shipping the
 * generated form would fail on the first ADD (duplicate column) and, had it reached the DROP,
 * taken the localized extracts with it.
 *
 * `sources.authors` is NOT NULL in production and nullable in the config; relaxing it is not part
 * of this change and is deliberately left alone.
 *
 * The two tables match what Payload's generator produced for a localized `textarea` in a global:
 * the parent row plus a `_locales` side table, keyed by `_parent_id` and constrained to one row
 * per locale.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "site_settings" (
      "id" serial PRIMARY KEY NOT NULL,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    CREATE TABLE IF NOT EXISTS "site_settings_locales" (
      "footer_note" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    ALTER TABLE "site_settings_locales"
      DROP CONSTRAINT IF EXISTS "site_settings_locales_parent_id_fk";
    ALTER TABLE "site_settings_locales"
      ADD CONSTRAINT "site_settings_locales_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id")
      ON DELETE cascade ON UPDATE no action;

    CREATE UNIQUE INDEX IF NOT EXISTS "site_settings_locales_locale_parent_id_unique"
      ON "site_settings_locales" USING btree ("_locale", "_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "site_settings_locales" CASCADE;
    DROP TABLE IF EXISTS "site_settings" CASCADE;`)
}
