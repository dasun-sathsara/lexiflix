ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "generation_limit" integer;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_generation_limit_non_negative_check" CHECK ("user"."generation_limit" IS NULL OR "user"."generation_limit" >= 0);