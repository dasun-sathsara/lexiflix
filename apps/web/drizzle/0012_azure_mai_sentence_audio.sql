ALTER TABLE "pack_item_content" ADD COLUMN "example_sentence_audio_artifact_ids" jsonb;--> statement-breakpoint
CREATE INDEX "pack_item_content_example_sentence_audio_idx" ON "pack_item_content" USING gin ("example_sentence_audio_artifact_ids");
