ALTER TABLE "curated_entry" ADD COLUMN "level" "cefr_level";--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "generation_audio_voice_gender_default" text DEFAULT 'female' NOT NULL;