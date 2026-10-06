import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Localize doc_paragraphs.extract.
 *
 * `extract` was a single shared column, so one paragraph could hold only one language's
 * quotation. The Spanish page quotes the official Spanish edition of the encyclical, which is
 * the same document issued in Spanish with its own settled wording rather than a translation of
 * the English — so the two must be able to coexist.
 *
 * Written by hand rather than generated, because Payload's generator for a field changing from
 * shared to localized adds the new column and drops the old one WITHOUT carrying the values
 * across, which would silently destroy all nine existing English extracts. The copy happens
 * between the ADD and the DROP.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "doc_paragraphs_locales" ADD COLUMN "extract" character varying;

    UPDATE "doc_paragraphs_locales" AS l
       SET "extract" = p."extract"
      FROM "doc_paragraphs" AS p
     WHERE l."_parent_id" = p."id"
       AND l."_locale" = 'en';

    ALTER TABLE "doc_paragraphs" DROP COLUMN "extract";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "doc_paragraphs" ADD COLUMN "extract" character varying;

    UPDATE "doc_paragraphs" AS p
       SET "extract" = l."extract"
      FROM "doc_paragraphs_locales" AS l
     WHERE l."_parent_id" = p."id"
       AND l."_locale" = 'en';

    ALTER TABLE "doc_paragraphs_locales" DROP COLUMN "extract";`)
}
