import "server-only";

import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import type { EffectiveGenerationCapabilities } from "@/lib/server/content-generation/contracts";

export function resolveEffectiveGenerationCapabilities(): EffectiveGenerationCapabilities {
  const imageMode = env.CONTENT_GENERATION_IMAGE_ENABLED
    ? env.CONTENT_GENERATION_IMAGE_MODE
    : "disabled";
  const audioVoice =
    env.CONTENT_GENERATION_AUDIO_PROVIDER === "aws-polly"
      ? env.AWS_POLLY_ENGINE === "neural"
        ? env.AWS_POLLY_NEURAL_VOICE_ID
        : env.AWS_POLLY_STANDARD_VOICE_ID
      : env.CONTENT_GENERATION_AUDIO_VOICE;

  return {
    textProvider: "gemini",
    textMode: env.CONTENT_GENERATION_TEXT_MODE,
    textModel: env.CONTENT_GENERATION_TEXT_MODEL,
    audioGenerationEnabled: env.CONTENT_GENERATION_AUDIO_MODE !== "disabled",
    audioMode: env.CONTENT_GENERATION_AUDIO_MODE,
    audioProvider: env.CONTENT_GENERATION_AUDIO_PROVIDER,
    audioVoice,
    audioEngine: env.AWS_POLLY_ENGINE,
    imageGenerationEnabled: env.CONTENT_GENERATION_IMAGE_ENABLED && imageMode !== "disabled",
    imageSelectionMode: "eligible_items",
    imageMode,
    imageProvider: env.CONTENT_GENERATION_IMAGE_PROVIDER,
    imageConcurrency: env.CONTENT_GENERATION_IMAGE_CONCURRENCY,
  };
}

export function fingerprintCapabilities(capabilities: EffectiveGenerationCapabilities) {
  return createHash("sha256").update(JSON.stringify(capabilities)).digest("hex").slice(0, 24);
}
