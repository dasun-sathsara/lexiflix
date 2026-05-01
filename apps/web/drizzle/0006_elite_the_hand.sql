ALTER TABLE "user_preferences" ADD COLUMN "generation_pack_size_default" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "generation_cefr_window_mode" text DEFAULT 'same_level' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "generation_known_term_handling" text DEFAULT 'exclude_known' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "generation_example_sentence_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "generation_custom_instructions_default" text;