import "server-only";

import { logger } from "@trigger.dev/sdk";
import { env } from "@/lib/config/env";
import type { ResolvedAiCredentials } from "@/lib/server/ai-credentials/types";
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

function getSpeechProviderConfig(input: {
  voiceGender: GenerationRequestSnapshot["audioVoiceGender"];
  aiCredentials: ResolvedAiCredentials;
}): SpeechProviderConfig {
  switch (env.CONTENT_GENERATION_AUDIO_PROVIDER) {
    case "disabled":
      return { provider: "disabled" };
    case "aws-polly": {
      const credentials = input.aiCredentials.awsPolly.credentials;
      if (!credentials) {
        throw new Error("No AWS Polly credentials are available for audio generation.");
      }

      return {
        provider: "aws-polly",
        voice: input.voiceGender === "male" ? "Matthew" : "Joanna",
        engine: env.AWS_POLLY_ENGINE,
        credentials,
      };
    }
    case "azure-mai": {
      const credentials = input.aiCredentials.azureMai.credentials;
      if (!credentials) {
        throw new Error("No Azure Speech credentials are available for audio generation.");
      }

      return {
        provider: "azure-mai",
        voice: input.voiceGender === "male" ? env.AZURE_MAI_VOICE_MALE : env.AZURE_MAI_VOICE_FEMALE,
        style: env.AZURE_MAI_VOICE_STYLE,
        credentials,
      };
    }
  }
}

export async function generateSpeechArtifacts(input: {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
  voiceGender: GenerationRequestSnapshot["audioVoiceGender"];
  aiCredentials: ResolvedAiCredentials;
}): Promise<SpeechArtifactsResult> {
  let config: SpeechProviderConfig;
  try {
    config = getSpeechProviderConfig({
      voiceGender: input.voiceGender,
      aiCredentials: input.aiCredentials,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[content-generation:audio] no usable credentials", { error: errorMessage });
    return { artifacts: [], warnings: [`Audio generation bypassed: ${errorMessage}`] };
  }

  logger.info("[content-generation:audio] started", {
    provider: config.provider,
    voice: config.provider === "disabled" ? undefined : config.voice,
    credentialSource:
      config.provider === "aws-polly"
        ? input.aiCredentials.awsPolly.source
        : config.provider === "azure-mai"
          ? input.aiCredentials.azureMai.source
          : undefined,
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
