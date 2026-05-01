import "server-only";

import { logger } from "@trigger.dev/sdk";
import type {
  GeneratedBinaryArtifact,
  GeneratedTextItem,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import { generateSpeechWithPolly } from "@/lib/server/content-generation/providers/speech/aws-polly";
import { generateSpeechWithAzureMai } from "@/lib/server/content-generation/providers/speech/azure-mai";

type AudioConfig = {
  audioProvider: string;
  audioVoice: string;
  audioEngine?: "standard" | "neural";
  audioStyle: string;
};

export async function generateSpeechArtifacts(input: {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
  audioConfig: AudioConfig;
}): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  const audioEnabled = input.audioConfig.audioProvider !== "disabled";

  logger.info("[content-generation:audio] started", {
    enabled: audioEnabled,
    provider: input.audioConfig.audioProvider,
    voice: input.audioConfig.audioVoice,
    selectedItemCount: input.selectedItems.length,
    textItemCount: input.textItems.length,
  });

  if (!audioEnabled) {
    logger.info("[content-generation:audio] skipped disabled audio generation", {
      selectedItemCount: input.selectedItems.length,
    });

    return {
      artifacts: [],
      warnings: ["Audio generation is disabled by server capability config."],
    };
  }

  if (input.audioConfig.audioProvider === "aws-polly") {
    try {
      return await generateSpeechWithPolly({
        ...input,
        audioConfig: {
          audioVoice: input.audioConfig.audioVoice,
          audioEngine: input.audioConfig.audioEngine ?? "standard",
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[content-generation:audio] AWS Polly fatal integration failure", {
        error: errorMessage,
      });
      return {
        artifacts: [],
        warnings: [`Audio generation bypassed: AWS Polly integration failure (${errorMessage})`],
      };
    }
  }

  if (input.audioConfig.audioProvider === "azure-mai") {
    try {
      return await generateSpeechWithAzureMai(input);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("[content-generation:audio] Azure MAI fatal integration failure", {
        error: errorMessage,
      });
      return {
        artifacts: [],
        warnings: [`Audio generation bypassed: Azure MAI integration failure (${errorMessage})`],
      };
    }
  }

  logger.warn("[content-generation:audio] provider not implemented", {
    provider: input.audioConfig.audioProvider,
  });

  return {
    artifacts: [],
    warnings: [`Audio provider '${input.audioConfig.audioProvider}' is not implemented yet.`],
  };
}
