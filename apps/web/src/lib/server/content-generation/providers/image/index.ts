import "server-only";

import { logger } from "@trigger.dev/sdk";
import type {
  GeneratedBinaryArtifact,
  GeneratedTextItem,
} from "@/lib/server/content-generation/contracts";

export async function generateImageArtifacts(input: {
  textItems: GeneratedTextItem[];
  imageEnabled: boolean;
  imageProvider?: string;
}): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  logger.info("[content-generation:image] started", {
    enabled: input.imageEnabled,
    provider: input.imageProvider,
    textItemCount: input.textItems.length,
  });

  if (!input.imageEnabled) {
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

  logger.warn("[content-generation:image] provider not implemented", {
    provider: input.imageProvider,
    eligibleCount: eligible.length,
  });

  return {
    artifacts: [],
    warnings: [`Image provider '${input.imageProvider}' is not implemented yet.`],
  };
}
