import "server-only";

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
  if (!input.capabilities.audioGenerationEnabled) {
    return {
      artifacts: [],
      warnings: ["Audio generation is disabled by server capability config."],
    };
  }

  if (input.capabilities.audioMode !== "mock") {
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

  return { artifacts, warnings: [] };
}
