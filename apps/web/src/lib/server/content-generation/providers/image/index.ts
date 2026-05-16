import "server-only";

import { logger } from "@trigger.dev/sdk";
import type {
  GeneratedBinaryArtifact,
  GeneratedTextItem,
} from "@/lib/server/content-generation/contracts";

/**
 * Image asset generation is not implemented yet.
 * Short-circuit immediately — do not run eligibility filtering.
 */
export async function generateImageArtifacts(input: {
  textItems: GeneratedTextItem[];
  imageEnabled: boolean;
  imageProvider?: string;
}): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  if (!input.imageEnabled) {
    return { artifacts: [], warnings: [] };
  }

  logger.warn("[content-generation:image] provider not implemented", {
    provider: input.imageProvider,
    textItemCount: input.textItems.length,
  });

  return {
    artifacts: [],
    warnings: [`Image provider '${input.imageProvider ?? "unknown"}' is not implemented yet.`],
  };
}
