CREATE TABLE "cefr_assessment_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"state" jsonb NOT NULL,
	"answered_count" integer DEFAULT 0 NOT NULL,
	"theta_mean" real,
	"theta_low" real,
	"theta_high" real,
	"level" text,
	"confidence" real,
	"borderline_label" text,
	"level_probabilities" jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cefr_assessment_response" (
	"id" text PRIMARY KEY NOT NULL,
	"attempt_id" text NOT NULL,
	"item_id" text NOT NULL,
	"item_level" text NOT NULL,
	"item_difficulty" real NOT NULL,
	"sequence" integer NOT NULL,
	"selected_index" integer,
	"is_dont_know" boolean DEFAULT false NOT NULL,
	"is_correct" boolean NOT NULL,
	"response_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cefr_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"assessed_level" text,
	"assessed_confidence" real,
	"assessed_at" timestamp,
	"manual_override_level" text,
	"manual_override_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cefr_assessment_attempt" ADD CONSTRAINT "cefr_assessment_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cefr_assessment_response" ADD CONSTRAINT "cefr_assessment_response_attempt_id_cefr_assessment_attempt_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."cefr_assessment_attempt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cefr_profile" ADD CONSTRAINT "cefr_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cefr_assessment_response_attempt_item_unique" ON "cefr_assessment_response" USING btree ("attempt_id","item_id");