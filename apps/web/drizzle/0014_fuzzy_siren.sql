LOCK TABLE "pack_generation_job", "session" IN SHARE ROW EXCLUSIVE MODE;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "generation_usage_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_generation_usage_count_non_negative_check" CHECK ("user"."generation_usage_count" >= 0);

--> statement-breakpoint
UPDATE "user"
SET "generation_usage_count" = usage."count"
FROM (
  SELECT "user_id", count(*)::integer AS "count"
  FROM "pack_generation_job"
  GROUP BY "user_id"
) AS usage
WHERE "user"."id" = usage."user_id";
--> statement-breakpoint
CREATE FUNCTION "reserve_pack_generation_quota"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  next_usage_count integer;
BEGIN
  UPDATE "user"
  SET "generation_usage_count" = "generation_usage_count" + 1
  WHERE "id" = NEW."user_id"
    AND (
      "generation_limit" IS NULL
      OR "generation_usage_count" < "generation_limit"
    )
  RETURNING "generation_usage_count" INTO next_usage_count;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pack generation limit reached for user %', NEW."user_id"
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "pack_generation_job_quota_guard"
AFTER INSERT ON "pack_generation_job"
FOR EACH ROW
EXECUTE FUNCTION "reserve_pack_generation_quota"();
--> statement-breakpoint
CREATE FUNCTION "reject_banned_user_session"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  account_banned boolean;
BEGIN
  SELECT "banned" INTO account_banned
  FROM "user"
  WHERE "id" = NEW."user_id"
  FOR SHARE;

  IF account_banned THEN
    RAISE EXCEPTION 'Disabled users cannot create sessions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "session_banned_user_guard"
BEFORE INSERT ON "session"
FOR EACH ROW
EXECUTE FUNCTION "reject_banned_user_session"();