CREATE TYPE "public"."curated_media_type" AS ENUM('movie', 'tv');--> statement-breakpoint
CREATE TYPE "public"."curated_source_provider" AS ENUM('tmdb');--> statement-breakpoint
CREATE TYPE "public"."curation_scope" AS ENUM('movie', 'show', 'season');--> statement-breakpoint
CREATE TABLE "curated_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"source_provider" "curated_source_provider" DEFAULT 'tmdb' NOT NULL,
	"media_type" "curated_media_type" NOT NULL,
	"curation_scope" "curation_scope" NOT NULL,
	"tmdb_id" integer NOT NULL,
	"tmdb_tv_id" integer,
	"tmdb_season_number" integer,
	"tmdb_season_id" integer,
	"title" text NOT NULL,
	"original_title" text NOT NULL,
	"display_subtitle" text,
	"overview" text,
	"release_date" date,
	"release_year" integer,
	"decade" integer,
	"poster_path" text,
	"backdrop_path" text,
	"original_language" text,
	"origin_countries" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"genre_ids" integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
	"genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"imdb_id" text,
	"content_rating" text,
	"tmdb_popularity" numeric(10, 3),
	"vote_average" numeric(4, 2),
	"vote_count" integer,
	"season_count_snapshot" integer,
	"tmdb_snapshot" jsonb NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"featured_rank" integer,
	"content_id" text,
	"curated_by_user_id" text,
	"curated_at" timestamp,
	"last_tmdb_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "curated_entry_movie_scope_check" CHECK (("curated_entry"."curation_scope" <> 'movie') OR ("curated_entry"."media_type" = 'movie' AND "curated_entry"."tmdb_tv_id" IS NULL AND "curated_entry"."tmdb_season_number" IS NULL AND "curated_entry"."tmdb_season_id" IS NULL)),
	CONSTRAINT "curated_entry_show_scope_check" CHECK (("curated_entry"."curation_scope" <> 'show') OR ("curated_entry"."media_type" = 'tv' AND "curated_entry"."tmdb_season_number" IS NULL AND "curated_entry"."tmdb_season_id" IS NULL)),
	CONSTRAINT "curated_entry_season_scope_check" CHECK (("curated_entry"."curation_scope" <> 'season') OR ("curated_entry"."media_type" = 'tv' AND "curated_entry"."tmdb_tv_id" IS NOT NULL AND "curated_entry"."tmdb_season_number" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "curated_entry" ADD CONSTRAINT "curated_entry_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curated_entry" ADD CONSTRAINT "curated_entry_curated_by_user_id_user_id_fk" FOREIGN KEY ("curated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "curated_entry_media_tmdb_unique" ON "curated_entry" USING btree ("media_type","tmdb_id");--> statement-breakpoint
CREATE INDEX "curated_entry_published_rank_idx" ON "curated_entry" USING btree ("is_published","featured_rank");--> statement-breakpoint
CREATE INDEX "curated_entry_media_type_idx" ON "curated_entry" USING btree ("media_type");--> statement-breakpoint
CREATE INDEX "curated_entry_scope_idx" ON "curated_entry" USING btree ("curation_scope");--> statement-breakpoint
CREATE INDEX "curated_entry_content_id_idx" ON "curated_entry" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "curated_entry_curated_by_user_id_idx" ON "curated_entry" USING btree ("curated_by_user_id");