CREATE TYPE "public"."ai_provider" AS ENUM('gemini', 'azure-foundry', 'aws-polly', 'azure-mai');--> statement-breakpoint
CREATE TABLE "ai_credential_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"enforce_system_credentials" boolean DEFAULT false NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_credential_policy_singleton_check" CHECK ("ai_credential_policy"."id" = 'global')
);
--> statement-breakpoint
CREATE TABLE "user_ai_credential" (
	"user_id" text NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"secret_ciphertext" text NOT NULL,
	"secret_hint" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_ai_credential_user_id_provider_pk" PRIMARY KEY("user_id","provider")
);
--> statement-breakpoint
ALTER TABLE "ai_credential_policy" ADD CONSTRAINT "ai_credential_policy_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ai_credential" ADD CONSTRAINT "user_ai_credential_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_ai_credential_user_idx" ON "user_ai_credential" USING btree ("user_id");