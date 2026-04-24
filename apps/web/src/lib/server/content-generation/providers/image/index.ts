import "server-only";

import type {
  EffectiveGenerationCapabilities,
  GeneratedBinaryArtifact,
  GeneratedTextItem,
} from "@/lib/server/content-generation/contracts";

export async function generateImageArtifacts(input: {
  textItems: GeneratedTextItem[];
  capabilities: EffectiveGenerationCapabilities;
}): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  if (!input.capabilities.imageGenerationEnabled) {
    return { artifacts: [], warnings: [] };
  }

  const eligible = input.textItems.filter(
    (item) => item.imageEligibility.eligible && item.imageBrief,
  );
  if (input.capabilities.imageMode !== "mock") {
    return {
      artifacts: [],
      warnings: [`Image provider '${input.capabilities.imageProvider}' is not implemented yet.`],
    };
  }

  return {
    artifacts: eligible.map((item) => ({
      itemKey: item.analysisItemId,
      bytes: new TextEncoder().encode(`mock image for ${item.imageBrief}`),
      mimeType: "image/webp",
      extension: "webp",
      metadata: {
        provider: input.capabilities.imageProvider,
        mode: input.capabilities.imageMode,
        imageBrief: item.imageBrief,
        imageEligibility: item.imageEligibility,
      },
    })),
    warnings: [],
  };
}
