import "server-only";

import { logger } from "@trigger.dev/sdk";
import type {
  EffectiveGenerationCapabilities,
  GeneratedBinaryArtifact,
  GeneratedTextItem,
} from "@/lib/server/content-generation/contracts";

export async function generateImageArtifacts(input: {
  textItems: GeneratedTextItem[];
  capabilities: EffectiveGenerationCapabilities;
}): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  logger.info("[content-generation:image] started", {
    enabled: input.capabilities.imageGenerationEnabled,
    provider: input.capabilities.imageProvider,
    textItemCount: input.textItems.length,
  });

  if (!input.capabilities.imageGenerationEnabled) {
    logger.info("[content-generation:image] skipped disabled image generation", {
      textItemCount: input.textItems.length,
    });

    return { artifacts: [], warnings: [] };
  }

  const eligible = input.textItems.filter(
    (item) => item.imageEligibility.eligible && item.imageBrief,
  );
  logger.info("[content-generation:image] resolved image eligibility", {
    eligibleCount: eligible.length,
    ineligibleCount: input.textItems.length - eligible.length,
  });

  if (input.capabilities.imageProvider !== "mock") {
    logger.warn("[content-generation:image] provider not implemented", {
      provider: input.capabilities.imageProvider,
      eligibleCount: eligible.length,
    });

    return {
      artifacts: [],
      warnings: [`Image provider '${input.capabilities.imageProvider}' is not implemented yet.`],
    };
  }

  const artifacts = eligible.map((item) => ({
    itemKey: item.analysisItemId,
    bytes: new TextEncoder().encode(`mock image for ${item.imageBrief}`),
    mimeType: "image/webp",
    extension: "webp",
    metadata: {
      provider: input.capabilities.imageProvider,
      imageBrief: item.imageBrief,
      imageEligibility: item.imageEligibility,
    },
  }));

  logger.info("[content-generation:image] mock artifacts generated", {
    artifactCount: artifacts.length,
  });

  return {
    artifacts,
    warnings: [],
  };
}
