import "server-only";

import { logger } from "@trigger.dev/sdk";
import type {
  EffectiveGenerationCapabilities,
  GeneratedBinaryArtifact,
  GeneratedTextItem,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";

export async function generateSpeechArtifacts(input: {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
  capabilities: EffectiveGenerationCapabilities;
}): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  logger.info("[content-generation:audio] started", {
    enabled: input.capabilities.audioGenerationEnabled,
    mode: input.capabilities.audioMode,
    provider: input.capabilities.audioProvider,
    voice: input.capabilities.audioVoice,
    selectedItemCount: input.selectedItems.length,
    textItemCount: input.textItems.length,
  });

  if (!input.capabilities.audioGenerationEnabled) {
    logger.info("[content-generation:audio] skipped disabled audio generation", {
      selectedItemCount: input.selectedItems.length,
    });

    return {
      artifacts: [],
      warnings: ["Audio generation is disabled by server capability config."],
    };
  }

  if (input.capabilities.audioMode !== "mock") {
    logger.warn("[content-generation:audio] provider not implemented", {
      mode: input.capabilities.audioMode,
      provider: input.capabilities.audioProvider,
    });

    return {
      artifacts: [],
      warnings: [`Audio provider '${input.capabilities.audioProvider}' is not implemented yet.`],
    };
  }

  const artifacts = input.selectedItems.map((item) => ({
    itemKey: item.analysisItemId,
    bytes: new TextEncoder().encode(`mock audio for ${item.displayText}`),
    mimeType: "audio/mpeg",
    extension: "mp3",
    metadata: {
      provider: input.capabilities.audioProvider,
      voice: input.capabilities.audioVoice,
      script: item.displayText,
      mode: input.capabilities.audioMode,
    },
  }));

  logger.info("[content-generation:audio] mock artifacts generated", {
    artifactCount: artifacts.length,
  });

  return { artifacts, warnings: [] };
}
