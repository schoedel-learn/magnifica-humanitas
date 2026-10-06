import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "documents" DROP COLUMN "status";
  ALTER TABLE "_documents_v" DROP COLUMN "version_status";
  ALTER TABLE "posts" DROP COLUMN "status";
  ALTER TABLE "_posts_v" DROP COLUMN "version_status";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "documents" ADD COLUMN "status" "enum_documents_status" DEFAULT 'draft';
  ALTER TABLE "_documents_v" ADD COLUMN "version_status" "enum__documents_v_version_status" DEFAULT 'draft';
  ALTER TABLE "posts" ADD COLUMN "status" "enum_posts_status" DEFAULT 'draft';
  ALTER TABLE "_posts_v" ADD COLUMN "version_status" "enum__posts_v_version_status" DEFAULT 'draft';`)
}
