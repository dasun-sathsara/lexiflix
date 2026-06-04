import "server-only";

import { logger } from "@trigger.dev/sdk";
import { env } from "@/lib/config/env";
import type {
  GeneratedTextItem,
  GenerationRequestSnapshot,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import { createSpeechSynthesisAdapter } from "@/lib/server/content-generation/providers/speech/factory";
import type {
  ActiveSpeechProviderConfig,
  SpeechProviderConfig,
} from "@/lib/server/content-generation/providers/speech/port";
import {
  generateSpeechArtifactsWithAdapter,
  type SpeechArtifactsResult,
} from "@/lib/server/content-generation/providers/speech/service";

export type { SpeechArtifactsResult } from "@/lib/server/content-generation/providers/speech/service";

const PROVIDER_LABELS: Record<ActiveSpeechProviderConfig["provider"], string> = {
  "aws-polly": "AWS Polly",
  "azure-mai": "Azure MAI",
};

function getSpeechProviderConfig(
  voiceGender: GenerationRequestSnapshot["audioVoiceGender"],
): SpeechProviderConfig {
  switch (env.CONTENT_GENERATION_AUDIO_PROVIDER) {
    case "disabled":
      return { provider: "disabled" };
    case "aws-polly":
      return {
        provider: "aws-polly",
        voice: voiceGender === "male" ? "Matthew" : "Joanna",
        engine: env.AWS_POLLY_ENGINE,
      };
    case "azure-mai":
      return {
        provider: "azure-mai",
        voice: voiceGender === "male" ? env.AZURE_MAI_VOICE_MALE : env.AZURE_MAI_VOICE_FEMALE,
        style: env.AZURE_MAI_VOICE_STYLE,
      };
  }
}

export async function generateSpeechArtifacts(input: {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
  voiceGender: GenerationRequestSnapshot["audioVoiceGender"];
}): Promise<SpeechArtifactsResult> {
  const config = getSpeechProviderConfig(input.voiceGender);

  logger.info("[content-generation:audio] started", {
    provider: config.provider,
    voice: config.provider === "disabled" ? undefined : config.voice,
    selectedItemCount: input.selectedItems.length,
    textItemCount: input.textItems.length,
  });

  if (config.provider === "disabled") {
    return {
      artifacts: [],
      warnings: ["Audio generation is disabled by server capability config."],
    };
  }

  try {
    const adapter = createSpeechSynthesisAdapter(config);
    return await generateSpeechArtifactsWithAdapter({
      selectedItems: input.selectedItems,
      textItems: input.textItems,
      adapter,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const label = PROVIDER_LABELS[config.provider];
    logger.error(`[content-generation:audio] ${label} fatal integration failure`, {
      error: errorMessage,
    });
    return {
      artifacts: [],
      warnings: [`Audio generation bypassed: ${label} integration failure (${errorMessage})`],
    };
  }
}
