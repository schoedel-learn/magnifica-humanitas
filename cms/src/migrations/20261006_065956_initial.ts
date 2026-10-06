import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'es');
  CREATE TYPE "public"."enum_documents_doc_type" AS ENUM('encyclical', 'apostolic-exhortation', 'audience', 'letter', 'homily', 'other');
  CREATE TYPE "public"."enum_documents_language_of_original" AS ENUM('la', 'en', 'it', 'es');
  CREATE TYPE "public"."enum_documents_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__documents_v_version_doc_type" AS ENUM('encyclical', 'apostolic-exhortation', 'audience', 'letter', 'homily', 'other');
  CREATE TYPE "public"."enum__documents_v_version_language_of_original" AS ENUM('la', 'en', 'it', 'es');
  CREATE TYPE "public"."enum__documents_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__documents_v_published_locale" AS ENUM('en', 'es');
  CREATE TYPE "public"."enum_posts_post_type" AS ENUM('essay', 'note', 'review', 'analysis');
  CREATE TYPE "public"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_version_post_type" AS ENUM('essay', 'note', 'review', 'analysis');
  CREATE TYPE "public"."enum__posts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__posts_v_published_locale" AS ENUM('en', 'es');
  CREATE TYPE "public"."enum_sources_kind" AS ENUM('magisterial', 'book', 'journal-article', 'chapter', 'web', 'magazine', 'thesis');
  CREATE TABLE "documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"abbreviation" varchar,
  	"slug" varchar,
  	"doc_type" "enum_documents_doc_type" DEFAULT 'encyclical',
  	"signed_date" timestamp(3) with time zone,
  	"published_date" timestamp(3) with time zone,
  	"vatican_url" varchar,
  	"language_of_original" "enum_documents_language_of_original" DEFAULT 'la',
  	"status" "enum_documents_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_documents_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "documents_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_documents_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_abbreviation" varchar,
  	"version_slug" varchar,
  	"version_doc_type" "enum__documents_v_version_doc_type" DEFAULT 'encyclical',
  	"version_signed_date" timestamp(3) with time zone,
  	"version_published_date" timestamp(3) with time zone,
  	"version_vatican_url" varchar,
  	"version_language_of_original" "enum__documents_v_version_language_of_original" DEFAULT 'la',
  	"version_status" "enum__documents_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__documents_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__documents_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_documents_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "doc_paragraphs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"document_id" integer NOT NULL,
  	"number" numeric NOT NULL,
  	"extract" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "doc_paragraphs_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "doc_paragraphs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer
  );
  
  CREATE TABLE "posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"post_type" "enum_posts_post_type" DEFAULT 'essay',
  	"hero_id" integer,
  	"status" "enum_posts_status" DEFAULT 'draft',
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_posts_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "posts_locales" (
  	"title" varchar,
  	"abstract" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "posts_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer,
  	"documents_id" integer
  );
  
  CREATE TABLE "_posts_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_post_type" "enum__posts_v_version_post_type" DEFAULT 'essay',
  	"version_hero_id" integer,
  	"version_status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"version_published_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__posts_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__posts_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_posts_v_locales" (
  	"version_title" varchar,
  	"version_abstract" varchar,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_posts_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topics_id" integer,
  	"documents_id" integer
  );
  
  CREATE TABLE "sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_sources_kind" DEFAULT 'book' NOT NULL,
  	"authors" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"year" numeric,
  	"publisher" varchar,
  	"journal" varchar,
  	"volume" varchar,
  	"issue" varchar,
  	"pages" varchar,
  	"doi" varchar,
  	"url" varchar,
  	"accessed_on" timestamp(3) with time zone,
  	"verified_on" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sources_locales" (
  	"note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "post_sources" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"post_id" integer NOT NULL,
  	"source_id" integer NOT NULL,
  	"locator" varchar NOT NULL,
  	"quoted_passage" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "post_sources_locales" (
  	"claim" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "topics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "topics_locales" (
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"credit" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar,
  	"sizes_wide_url" varchar,
  	"sizes_wide_width" numeric,
  	"sizes_wide_height" numeric,
  	"sizes_wide_mime_type" varchar,
  	"sizes_wide_filesize" numeric,
  	"sizes_wide_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"documents_id" integer,
  	"doc_paragraphs_id" integer,
  	"posts_id" integer,
  	"sources_id" integer,
  	"post_sources_id" integer,
  	"topics_id" integer,
  	"media_id" integer,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "documents_locales" ADD CONSTRAINT "documents_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_documents_v" ADD CONSTRAINT "_documents_v_parent_id_documents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_documents_v_locales" ADD CONSTRAINT "_documents_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_documents_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doc_paragraphs" ADD CONSTRAINT "doc_paragraphs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doc_paragraphs_locales" ADD CONSTRAINT "doc_paragraphs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doc_paragraphs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doc_paragraphs_rels" ADD CONSTRAINT "doc_paragraphs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."doc_paragraphs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doc_paragraphs_rels" ADD CONSTRAINT "doc_paragraphs_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_hero_id_media_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_locales" ADD CONSTRAINT "posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_parent_id_posts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_hero_id_media_id_fk" FOREIGN KEY ("version_hero_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_locales" ADD CONSTRAINT "_posts_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sources_locales" ADD CONSTRAINT "sources_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "post_sources" ADD CONSTRAINT "post_sources_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "post_sources" ADD CONSTRAINT "post_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "post_sources_locales" ADD CONSTRAINT "post_sources_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."post_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "topics_locales" ADD CONSTRAINT "topics_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_doc_paragraphs_fk" FOREIGN KEY ("doc_paragraphs_id") REFERENCES "public"."doc_paragraphs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sources_fk" FOREIGN KEY ("sources_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_post_sources_fk" FOREIGN KEY ("post_sources_id") REFERENCES "public"."post_sources"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_topics_fk" FOREIGN KEY ("topics_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "documents_slug_idx" ON "documents" USING btree ("slug");
  CREATE INDEX "documents_updated_at_idx" ON "documents" USING btree ("updated_at");
  CREATE INDEX "documents_created_at_idx" ON "documents" USING btree ("created_at");
  CREATE INDEX "documents__status_idx" ON "documents" USING btree ("_status");
  CREATE UNIQUE INDEX "documents_locales_locale_parent_id_unique" ON "documents_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_documents_v_parent_idx" ON "_documents_v" USING btree ("parent_id");
  CREATE INDEX "_documents_v_version_version_slug_idx" ON "_documents_v" USING btree ("version_slug");
  CREATE INDEX "_documents_v_version_version_updated_at_idx" ON "_documents_v" USING btree ("version_updated_at");
  CREATE INDEX "_documents_v_version_version_created_at_idx" ON "_documents_v" USING btree ("version_created_at");
  CREATE INDEX "_documents_v_version_version__status_idx" ON "_documents_v" USING btree ("version__status");
  CREATE INDEX "_documents_v_created_at_idx" ON "_documents_v" USING btree ("created_at");
  CREATE INDEX "_documents_v_updated_at_idx" ON "_documents_v" USING btree ("updated_at");
  CREATE INDEX "_documents_v_snapshot_idx" ON "_documents_v" USING btree ("snapshot");
  CREATE INDEX "_documents_v_published_locale_idx" ON "_documents_v" USING btree ("published_locale");
  CREATE INDEX "_documents_v_latest_idx" ON "_documents_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_documents_v_locales_locale_parent_id_unique" ON "_documents_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "doc_paragraphs_document_idx" ON "doc_paragraphs" USING btree ("document_id");
  CREATE INDEX "doc_paragraphs_updated_at_idx" ON "doc_paragraphs" USING btree ("updated_at");
  CREATE INDEX "doc_paragraphs_created_at_idx" ON "doc_paragraphs" USING btree ("created_at");
  CREATE UNIQUE INDEX "doc_paragraphs_locales_locale_parent_id_unique" ON "doc_paragraphs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "doc_paragraphs_rels_order_idx" ON "doc_paragraphs_rels" USING btree ("order");
  CREATE INDEX "doc_paragraphs_rels_parent_idx" ON "doc_paragraphs_rels" USING btree ("parent_id");
  CREATE INDEX "doc_paragraphs_rels_path_idx" ON "doc_paragraphs_rels" USING btree ("path");
  CREATE INDEX "doc_paragraphs_rels_topics_id_idx" ON "doc_paragraphs_rels" USING btree ("topics_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "posts" USING btree ("slug");
  CREATE INDEX "posts_hero_idx" ON "posts" USING btree ("hero_id");
  CREATE INDEX "posts_updated_at_idx" ON "posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");
  CREATE INDEX "posts__status_idx" ON "posts" USING btree ("_status");
  CREATE UNIQUE INDEX "posts_locales_locale_parent_id_unique" ON "posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_rels_order_idx" ON "posts_rels" USING btree ("order");
  CREATE INDEX "posts_rels_parent_idx" ON "posts_rels" USING btree ("parent_id");
  CREATE INDEX "posts_rels_path_idx" ON "posts_rels" USING btree ("path");
  CREATE INDEX "posts_rels_topics_id_idx" ON "posts_rels" USING btree ("topics_id");
  CREATE INDEX "posts_rels_documents_id_idx" ON "posts_rels" USING btree ("documents_id");
  CREATE INDEX "_posts_v_parent_idx" ON "_posts_v" USING btree ("parent_id");
  CREATE INDEX "_posts_v_version_version_slug_idx" ON "_posts_v" USING btree ("version_slug");
  CREATE INDEX "_posts_v_version_version_hero_idx" ON "_posts_v" USING btree ("version_hero_id");
  CREATE INDEX "_posts_v_version_version_updated_at_idx" ON "_posts_v" USING btree ("version_updated_at");
  CREATE INDEX "_posts_v_version_version_created_at_idx" ON "_posts_v" USING btree ("version_created_at");
  CREATE INDEX "_posts_v_version_version__status_idx" ON "_posts_v" USING btree ("version__status");
  CREATE INDEX "_posts_v_created_at_idx" ON "_posts_v" USING btree ("created_at");
  CREATE INDEX "_posts_v_updated_at_idx" ON "_posts_v" USING btree ("updated_at");
  CREATE INDEX "_posts_v_snapshot_idx" ON "_posts_v" USING btree ("snapshot");
  CREATE INDEX "_posts_v_published_locale_idx" ON "_posts_v" USING btree ("published_locale");
  CREATE INDEX "_posts_v_latest_idx" ON "_posts_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_posts_v_locales_locale_parent_id_unique" ON "_posts_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_posts_v_rels_order_idx" ON "_posts_v_rels" USING btree ("order");
  CREATE INDEX "_posts_v_rels_parent_idx" ON "_posts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_posts_v_rels_path_idx" ON "_posts_v_rels" USING btree ("path");
  CREATE INDEX "_posts_v_rels_topics_id_idx" ON "_posts_v_rels" USING btree ("topics_id");
  CREATE INDEX "_posts_v_rels_documents_id_idx" ON "_posts_v_rels" USING btree ("documents_id");
  CREATE INDEX "sources_updated_at_idx" ON "sources" USING btree ("updated_at");
  CREATE INDEX "sources_created_at_idx" ON "sources" USING btree ("created_at");
  CREATE UNIQUE INDEX "sources_locales_locale_parent_id_unique" ON "sources_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "post_sources_post_idx" ON "post_sources" USING btree ("post_id");
  CREATE INDEX "post_sources_source_idx" ON "post_sources" USING btree ("source_id");
  CREATE INDEX "post_sources_updated_at_idx" ON "post_sources" USING btree ("updated_at");
  CREATE INDEX "post_sources_created_at_idx" ON "post_sources" USING btree ("created_at");
  CREATE UNIQUE INDEX "post_sources_locales_locale_parent_id_unique" ON "post_sources_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "topics_slug_idx" ON "topics" USING btree ("slug");
  CREATE INDEX "topics_updated_at_idx" ON "topics" USING btree ("updated_at");
  CREATE INDEX "topics_created_at_idx" ON "topics" USING btree ("created_at");
  CREATE UNIQUE INDEX "topics_locales_locale_parent_id_unique" ON "topics_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_wide_sizes_wide_filename_idx" ON "media" USING btree ("sizes_wide_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("documents_id");
  CREATE INDEX "payload_locked_documents_rels_doc_paragraphs_id_idx" ON "payload_locked_documents_rels" USING btree ("doc_paragraphs_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("sources_id");
  CREATE INDEX "payload_locked_documents_rels_post_sources_id_idx" ON "payload_locked_documents_rels" USING btree ("post_sources_id");
  CREATE INDEX "payload_locked_documents_rels_topics_id_idx" ON "payload_locked_documents_rels" USING btree ("topics_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "documents" CASCADE;
  DROP TABLE "documents_locales" CASCADE;
  DROP TABLE "_documents_v" CASCADE;
  DROP TABLE "_documents_v_locales" CASCADE;
  DROP TABLE "doc_paragraphs" CASCADE;
  DROP TABLE "doc_paragraphs_locales" CASCADE;
  DROP TABLE "doc_paragraphs_rels" CASCADE;
  DROP TABLE "posts" CASCADE;
  DROP TABLE "posts_locales" CASCADE;
  DROP TABLE "posts_rels" CASCADE;
  DROP TABLE "_posts_v" CASCADE;
  DROP TABLE "_posts_v_locales" CASCADE;
  DROP TABLE "_posts_v_rels" CASCADE;
  DROP TABLE "sources" CASCADE;
  DROP TABLE "sources_locales" CASCADE;
  DROP TABLE "post_sources" CASCADE;
  DROP TABLE "post_sources_locales" CASCADE;
  DROP TABLE "topics" CASCADE;
  DROP TABLE "topics_locales" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_documents_doc_type";
  DROP TYPE "public"."enum_documents_language_of_original";
  DROP TYPE "public"."enum_documents_status";
  DROP TYPE "public"."enum__documents_v_version_doc_type";
  DROP TYPE "public"."enum__documents_v_version_language_of_original";
  DROP TYPE "public"."enum__documents_v_version_status";
  DROP TYPE "public"."enum__documents_v_published_locale";
  DROP TYPE "public"."enum_posts_post_type";
  DROP TYPE "public"."enum_posts_status";
  DROP TYPE "public"."enum__posts_v_version_post_type";
  DROP TYPE "public"."enum__posts_v_version_status";
  DROP TYPE "public"."enum__posts_v_published_locale";
  DROP TYPE "public"."enum_sources_kind";`)
}
