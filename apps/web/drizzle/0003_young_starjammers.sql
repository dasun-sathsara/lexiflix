CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"target_language" text DEFAULT 'English' NOT NULL,
	"daily_words_goal" integer DEFAULT 20 NOT NULL,
	"email_reminders_enabled" boolean DEFAULT true NOT NULL,
	"streak_alerts_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;