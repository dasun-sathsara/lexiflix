CREATE TYPE "public"."artifact_access" AS ENUM('private', 'signed', 'public');--> statement-breakpoint
CREATE TYPE "public"."artifact_kind" AS ENUM('subtitle', 'audio', 'image', 'avatar');--> statement-breakpoint
CREATE TYPE "public"."assessment_attempt_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
CREATE TYPE "public"."card_state" AS ENUM('new', 'learning', 'due', 'mastered', 'removed');--> statement-breakpoint
CREATE TYPE "public"."cefr_level" AS ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2');--> statement-breakpoint
CREATE TYPE "public"."content_kind" AS ENUM('movie', 'season');--> statement-breakpoint
CREATE TYPE "public"."extraction_source" AS ENUM('nlp', 'llm');--> statement-breakpoint
CREATE TYPE "public"."frequency_preference" AS ENUM('balanced', 'common_first', 'challenge_first');--> statement-breakpoint
CREATE TYPE "public"."job_stage" AS ENUM('queued', 'fetching_subtitles', 'running_nlp', 'running_llm', 'generating_content', 'saving_pack', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'read', 'dismissed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('pack_ready', 'reviews_due', 'streak_risk', 'system');--> statement-breakpoint
CREATE TYPE "public"."pack_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."review_rating" AS ENUM('again', 'hard', 'good', 'easy');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('queued', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subtitle_availability_status" AS ENUM('available', 'unavailable', 'error');--> statement-breakpoint
CREATE TYPE "public"."subtitle_format" AS ENUM('srt', 'plain_text');--> statement-breakpoint
CREATE TYPE "public"."subtitle_provider" AS ENUM('opensubtitles', 'manual_upload');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('learner', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_term_state" AS ENUM('unseen', 'learning', 'known', 'ignored');--> statement-breakpoint
CREATE TYPE "public"."vocabulary_kind" AS ENUM('word', 'phrasal_verb', 'idiom', 'slang');--> statement-breakpoint
CREATE TABLE "artifact_object" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "artifact_kind" NOT NULL,
	"access" "artifact_access" DEFAULT 'private' NOT NULL,
	"provider" text DEFAULT 'r2' NOT NULL,
	"bucket_name" text NOT NULL,
	"object_key" text NOT NULL,
	"public_url" text,
	"mime_type" text,
	"byte_size" integer,
	"checksum_sha256" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "content_kind" NOT NULL,
	"tmdb_movie_id" integer,
	"tmdb_show_id" integer,
	"tmdb_season_number" integer,
	"tmdb_season_id" integer,
	"title" text NOT NULL,
	"original_title" text,
	"overview" text,
	"original_language" text,
	"poster_path" text,
	"backdrop_path" text,
	"release_date" timestamp,
	"first_air_date" timestamp,
	"runtime_minutes" integer,
	"episode_count" integer,
	"vote_average" real,
	"vote_count" integer,
	"tmdb_raw" jsonb,
	"last_tmdb_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_movie_shape_check" CHECK (("content"."kind" <> 'movie') OR ("content"."tmdb_movie_id" IS NOT NULL AND "content"."tmdb_show_id" IS NULL AND "content"."tmdb_season_number" IS NULL)),
	CONSTRAINT "content_season_shape_check" CHECK (("content"."kind" <> 'season') OR ("content"."tmdb_show_id" IS NOT NULL AND "content"."tmdb_season_number" IS NOT NULL AND "content"."tmdb_movie_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "content_processing_run" (
	"id" text PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"source_snapshot_id" text NOT NULL,
	"status" "run_status" DEFAULT 'queued' NOT NULL,
	"pipeline_fingerprint" text NOT NULL,
	"nlp_pipeline_version" text NOT NULL,
	"llm_pipeline_version" text,
	"prompt_version" text,
	"warnings" jsonb,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_source_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"content_id" text NOT NULL,
	"provider" "subtitle_provider" NOT NULL,
	"format" "subtitle_format" DEFAULT 'srt' NOT NULL,
	"provider_external_id" text,
	"provider_version" text,
	"release_name" text,
	"supplied_by_user_id" text,
	"subtitle_artifact_id" text,
	"normalized_text_hash" text NOT NULL,
	"line_count" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_subtitle_availability" (
	"content_id" text NOT NULL,
	"provider" "subtitle_provider" NOT NULL,
	"status" "subtitle_availability_status" NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"retry_after" timestamp,
	"error_code" text,
	"error_message" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_subtitle_availability_pkey" PRIMARY KEY("content_id","provider")
);
--> statement-breakpoint
CREATE TABLE "content_vocabulary_item" (
	"id" text PRIMARY KEY NOT NULL,
	"processing_run_id" text NOT NULL,
	"content_id" text NOT NULL,
	"term_id" text NOT NULL,
	"extraction_source" "extraction_source" NOT NULL,
	"surface_form" text NOT NULL,
	"representative_context" text,
	"contexts" jsonb,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"frequency_rank" integer,
	"cefr_level" "cefr_level",
	"cefr_numeric" integer,
	"cefr_confidence" real,
	"cefr_note" text,
	"meaning" text,
	"example_sentences" jsonb,
	"audio_artifact_id" text,
	"image_artifact_id" text,
	"is_selectable" boolean DEFAULT true NOT NULL,
	"filtered_out_reason" text,
	"enriched_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_job" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content_id" text NOT NULL,
	"processing_run_id" text,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"stage" "job_stage" DEFAULT 'queued' NOT NULL,
	"progress_message" text,
	"idempotency_key" text NOT NULL,
	"trigger_workflow_id" text,
	"request_snapshot" jsonb NOT NULL,
	"error_code" text,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_job_event" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"stage" "job_stage" NOT NULL,
	"message" text,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"channel" "notification_channel" DEFAULT 'in_app' NOT NULL,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"payload" jsonb,
	"scheduled_for" timestamp,
	"sent_at" timestamp,
	"read_at" timestamp,
	"dismissed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pack" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"content_id" text NOT NULL,
	"source_job_id" text,
	"processing_run_id" text NOT NULL,
	"status" "pack_status" DEFAULT 'active' NOT NULL,
	"name" text NOT NULL,
	"learner_cefr_level_at_generation" "cefr_level",
	"frequency_preference_at_generation" "frequency_preference" NOT NULL,
	"selected_vocabulary_types" "vocabulary_kind"[] NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"estimated_study_minutes" integer,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pack_item" (
	"id" text PRIMARY KEY NOT NULL,
	"pack_id" text NOT NULL,
	"content_vocabulary_item_id" text NOT NULL,
	"term_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	"included_reason" text,
	"state" "card_state" DEFAULT 'new' NOT NULL,
	"due_at" timestamp,
	"last_reviewed_at" timestamp,
	"last_rating" "review_rating",
	"repetition_count" integer DEFAULT 0 NOT NULL,
	"lapse_count" integer DEFAULT 0 NOT NULL,
	"interval_days" integer,
	"ease_factor" real DEFAULT 2.5 NOT NULL,
	"first_studied_at" timestamp,
	"mastered_at" timestamp,
	"removed_at" timestamp,
	"removal_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"pack_item_id" text NOT NULL,
	"term_id" text NOT NULL,
	"rating" "review_rating" NOT NULL,
	"reviewed_at" timestamp DEFAULT now() NOT NULL,
	"response_time_ms" integer
);
--> statement-breakpoint
CREATE TABLE "user_streak" (
	"user_id" text PRIMARY KEY NOT NULL,
	"current_streak_days" integer DEFAULT 0 NOT NULL,
	"longest_streak_days" integer DEFAULT 0 NOT NULL,
	"last_study_at" timestamp,
	"streak_started_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_term_state" (
	"user_id" text NOT NULL,
	"term_id" text NOT NULL,
	"state" "user_term_state" DEFAULT 'unseen' NOT NULL,
	"source" text DEFAULT 'derived' NOT NULL,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"total_lapses" integer DEFAULT 0 NOT NULL,
	"last_pack_item_id" text,
	"first_seen_at" timestamp,
	"last_seen_at" timestamp,
	"last_reviewed_at" timestamp,
	"known_at" timestamp,
	"ignored_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_term_state_pkey" PRIMARY KEY("user_id","term_id")
);
--> statement-breakpoint
CREATE TABLE "vocabulary_term" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "vocabulary_kind" NOT NULL,
	"normalized_text" text NOT NULL,
	"lemma" text,
	"display_text" text NOT NULL,
	"part_of_speech" text,
	"base_cefr_level" "cefr_level",
	"base_cefr_numeric" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "cefr_assessment_attempt" ALTER COLUMN "status" SET DEFAULT 'in_progress'::"public"."assessment_attempt_status";--> statement-breakpoint
ALTER TABLE "cefr_assessment_attempt" ALTER COLUMN "status" SET DATA TYPE "public"."assessment_attempt_status" USING "status"::"public"."assessment_attempt_status";--> statement-breakpoint
ALTER TABLE "cefr_assessment_attempt" ALTER COLUMN "level" SET DATA TYPE "public"."cefr_level" USING "level"::"public"."cefr_level";--> statement-breakpoint
ALTER TABLE "cefr_assessment_response" ALTER COLUMN "item_level" SET DATA TYPE "public"."cefr_level" USING "item_level"::"public"."cefr_level";--> statement-breakpoint
ALTER TABLE "cefr_profile" ALTER COLUMN "assessed_level" SET DATA TYPE "public"."cefr_level" USING "assessed_level"::"public"."cefr_level";--> statement-breakpoint
ALTER TABLE "cefr_profile" ALTER COLUMN "manual_override_level" SET DATA TYPE "public"."cefr_level" USING "manual_override_level"::"public"."cefr_level";--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'learner'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "study_language_code" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "frequency_preference" "frequency_preference" DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "study_vocabulary_types" "vocabulary_kind"[] DEFAULT ARRAY['word', 'phrasal_verb', 'idiom', 'slang']::vocabulary_kind[] NOT NULL;--> statement-breakpoint
ALTER TABLE "content_processing_run" ADD CONSTRAINT "content_processing_run_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_processing_run" ADD CONSTRAINT "content_processing_run_source_snapshot_id_content_source_snapshot_id_fk" FOREIGN KEY ("source_snapshot_id") REFERENCES "public"."content_source_snapshot"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_source_snapshot" ADD CONSTRAINT "content_source_snapshot_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_source_snapshot" ADD CONSTRAINT "content_source_snapshot_supplied_by_user_id_user_id_fk" FOREIGN KEY ("supplied_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_source_snapshot" ADD CONSTRAINT "content_source_snapshot_subtitle_artifact_id_artifact_object_id_fk" FOREIGN KEY ("subtitle_artifact_id") REFERENCES "public"."artifact_object"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_subtitle_availability" ADD CONSTRAINT "content_subtitle_availability_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_vocabulary_item" ADD CONSTRAINT "content_vocabulary_item_processing_run_id_content_processing_run_id_fk" FOREIGN KEY ("processing_run_id") REFERENCES "public"."content_processing_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_vocabulary_item" ADD CONSTRAINT "content_vocabulary_item_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_vocabulary_item" ADD CONSTRAINT "content_vocabulary_item_term_id_vocabulary_term_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."vocabulary_term"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_vocabulary_item" ADD CONSTRAINT "content_vocabulary_item_audio_artifact_id_artifact_object_id_fk" FOREIGN KEY ("audio_artifact_id") REFERENCES "public"."artifact_object"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_vocabulary_item" ADD CONSTRAINT "content_vocabulary_item_image_artifact_id_artifact_object_id_fk" FOREIGN KEY ("image_artifact_id") REFERENCES "public"."artifact_object"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_job" ADD CONSTRAINT "generation_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_job" ADD CONSTRAINT "generation_job_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_job" ADD CONSTRAINT "generation_job_processing_run_id_content_processing_run_id_fk" FOREIGN KEY ("processing_run_id") REFERENCES "public"."content_processing_run"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_job_event" ADD CONSTRAINT "generation_job_event_job_id_generation_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack" ADD CONSTRAINT "pack_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack" ADD CONSTRAINT "pack_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack" ADD CONSTRAINT "pack_source_job_id_generation_job_id_fk" FOREIGN KEY ("source_job_id") REFERENCES "public"."generation_job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack" ADD CONSTRAINT "pack_processing_run_id_content_processing_run_id_fk" FOREIGN KEY ("processing_run_id") REFERENCES "public"."content_processing_run"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_item" ADD CONSTRAINT "pack_item_pack_id_pack_id_fk" FOREIGN KEY ("pack_id") REFERENCES "public"."pack"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_item" ADD CONSTRAINT "pack_item_content_vocabulary_item_id_content_vocabulary_item_id_fk" FOREIGN KEY ("content_vocabulary_item_id") REFERENCES "public"."content_vocabulary_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pack_item" ADD CONSTRAINT "pack_item_term_id_vocabulary_term_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."vocabulary_term"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_event" ADD CONSTRAINT "review_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_event" ADD CONSTRAINT "review_event_pack_item_id_pack_item_id_fk" FOREIGN KEY ("pack_item_id") REFERENCES "public"."pack_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_event" ADD CONSTRAINT "review_event_term_id_vocabulary_term_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."vocabulary_term"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streak" ADD CONSTRAINT "user_streak_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_term_state" ADD CONSTRAINT "user_term_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_term_state" ADD CONSTRAINT "user_term_state_term_id_vocabulary_term_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."vocabulary_term"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_term_state" ADD CONSTRAINT "user_term_state_last_pack_item_id_pack_item_id_fk" FOREIGN KEY ("last_pack_item_id") REFERENCES "public"."pack_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "artifact_object_bucket_key_unique" ON "artifact_object" USING btree ("bucket_name","object_key");--> statement-breakpoint
CREATE INDEX "artifact_object_kind_idx" ON "artifact_object" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "content_movie_tmdb_unique" ON "content" USING btree ("tmdb_movie_id") WHERE "content"."kind" = 'movie';--> statement-breakpoint
CREATE UNIQUE INDEX "content_season_tmdb_unique" ON "content" USING btree ("tmdb_show_id","tmdb_season_number") WHERE "content"."kind" = 'season';--> statement-breakpoint
CREATE INDEX "content_kind_idx" ON "content" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "content_processing_run_fingerprint_unique" ON "content_processing_run" USING btree ("content_id","pipeline_fingerprint");--> statement-breakpoint
CREATE INDEX "content_processing_run_status_idx" ON "content_processing_run" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "content_source_snapshot_active_content_unique" ON "content_source_snapshot" USING btree ("content_id") WHERE "content_source_snapshot"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "content_source_snapshot_content_hash_unique" ON "content_source_snapshot" USING btree ("content_id","normalized_text_hash");--> statement-breakpoint
CREATE INDEX "content_subtitle_availability_status_retry_idx" ON "content_subtitle_availability" USING btree ("status","retry_after");--> statement-breakpoint
CREATE UNIQUE INDEX "content_vocabulary_item_run_term_unique" ON "content_vocabulary_item" USING btree ("processing_run_id","term_id");--> statement-breakpoint
CREATE INDEX "content_vocabulary_item_content_idx" ON "content_vocabulary_item" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "content_vocabulary_item_term_idx" ON "content_vocabulary_item" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "content_vocabulary_item_source_idx" ON "content_vocabulary_item" USING btree ("extraction_source");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_job_user_idempotency_unique" ON "generation_job" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "generation_job_content_status_idx" ON "generation_job" USING btree ("content_id","status");--> statement-breakpoint
CREATE INDEX "generation_job_user_status_idx" ON "generation_job" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "generation_job_event_job_stage_idx" ON "generation_job_event" USING btree ("job_id","stage");--> statement-breakpoint
CREATE INDEX "notification_user_status_idx" ON "notification" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "notification_user_type_idx" ON "notification" USING btree ("user_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "pack_user_content_unique" ON "pack" USING btree ("user_id","content_id");--> statement-breakpoint
CREATE INDEX "pack_status_idx" ON "pack" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "pack_item_pack_candidate_unique" ON "pack_item" USING btree ("pack_id","content_vocabulary_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pack_item_pack_sort_order_unique" ON "pack_item" USING btree ("pack_id","sort_order");--> statement-breakpoint
CREATE INDEX "pack_item_pack_state_idx" ON "pack_item" USING btree ("pack_id","state");--> statement-breakpoint
CREATE INDEX "pack_item_due_idx" ON "pack_item" USING btree ("state","due_at");--> statement-breakpoint
CREATE INDEX "pack_item_term_idx" ON "pack_item" USING btree ("term_id");--> statement-breakpoint
CREATE INDEX "review_event_user_reviewed_at_idx" ON "review_event" USING btree ("user_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "review_event_pack_item_reviewed_at_idx" ON "review_event" USING btree ("pack_item_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "review_event_term_reviewed_at_idx" ON "review_event" USING btree ("term_id","reviewed_at");--> statement-breakpoint
CREATE INDEX "user_term_state_user_state_idx" ON "user_term_state" USING btree ("user_id","state");--> statement-breakpoint
CREATE UNIQUE INDEX "vocabulary_term_kind_text_unique" ON "vocabulary_term" USING btree ("kind","normalized_text");--> statement-breakpoint
CREATE INDEX "vocabulary_term_kind_idx" ON "vocabulary_term" USING btree ("kind");--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN "target_language";