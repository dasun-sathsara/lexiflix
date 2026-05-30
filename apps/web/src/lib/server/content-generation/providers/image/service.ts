import "server-only";

import { logger } from "@trigger.dev/sdk";
import type {
  GeneratedBinaryArtifact,
  GeneratedTextItem,
} from "@/lib/server/content-generation/contracts";
import type {
  ImageGenerationAdapter,
  ImageGenerationProviderConfig,
} from "@/lib/server/content-generation/providers/image/port";

const REQUEST_DELAY_MS = 10_000;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateImageArtifactsWithAdapter(input: {
  textItems: GeneratedTextItem[];
  config: ImageGenerationProviderConfig;
  adapter: ImageGenerationAdapter;
}): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  const eligibleItems = input.textItems.filter(
    (item) => item.imageEligibility.eligible && Boolean(item.imageBrief?.trim()),
  );

  logger.info("[content-generation:image] started", {
    provider: input.adapter.provider,
    model: input.config.model,
    totalItemCount: input.textItems.length,
    eligibleItemCount: eligibleItems.length,
  });

  const artifacts: GeneratedBinaryArtifact[] = [];
  const warnings: string[] = [];

  for (const [index, item] of eligibleItems.entries()) {
    if (index > 0) {
      await delay(REQUEST_DELAY_MS);
    }

    logger.info(
      `[content-generation:image] generating image ${index + 1}/${eligibleItems.length}`,
      {
        provider: input.adapter.provider,
        analysisItemId: item.analysisItemId,
        termId: item.termId,
        brief: item.imageBrief,
      },
    );

    try {
      const result = await input.adapter.generate({ prompt: item.imageBrief as string });
      artifacts.push({
        itemKey: item.analysisItemId,
        bytes: result.bytes,
        mimeType: result.mimeType,
        extension: result.extension,
        metadata: {
          ...result.metadata,
          prompt: item.imageBrief,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`[content-generation:image] ${input.adapter.provider} item skipped`, {
        analysisItemId: item.analysisItemId,
        errorMessage,
      });
      warnings.push(`Image skipped for '${item.analysisItemId}': ${errorMessage}`);
    }
  }

  return { artifacts, warnings };
}
