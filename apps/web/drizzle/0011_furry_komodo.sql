ALTER TABLE "curated_entry" ADD COLUMN IF NOT EXISTS "level" "cefr_level";--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "generation_audio_voice_gender_default" text DEFAULT 'female' NOT NULL;
