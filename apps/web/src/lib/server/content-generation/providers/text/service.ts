import "server-only";

import { logger } from "@trigger.dev/sdk";
import type {
  GeneratedTextItem,
  GenerationRequestSnapshot,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import type {
  TextGenerationAdapter,
  TextGenerationProviderConfig,
} from "@/lib/server/content-generation/providers/text/port";
import { buildTextGenerationPrompt } from "@/lib/server/content-generation/providers/text/prompt";
import { generatedTextBatchSchema } from "@/lib/server/content-generation/providers/text/schema";
import { mapWithConcurrency } from "@/lib/server/utils/concurrency";

const TEXT_BATCH_SIZE = 8;
const TEXT_CONCURRENCY = 2;

export async function generateTextContentWithAdapter(input: {
  items: SelectedGenerationItem[];
  requestSnapshot: GenerationRequestSnapshot;
  config: TextGenerationProviderConfig;
  adapter: TextGenerationAdapter;
}): Promise<GeneratedTextItem[]> {
  logger.info("[content-generation:text] starting batched text generation", {
    provider: input.adapter.provider,
    model: input.config.model,
    totalItemCount: input.items.length,
    batchSize: TEXT_BATCH_SIZE,
    packSize: input.requestSnapshot.packSize,
    exampleSentenceCount: input.requestSnapshot.exampleSentenceCount,
  });

  const batches: SelectedGenerationItem[][] = [];
  for (let i = 0; i < input.items.length; i += TEXT_BATCH_SIZE) {
    batches.push(input.items.slice(i, i + TEXT_BATCH_SIZE));
  }

  const settledResults = await mapWithConcurrency<SelectedGenerationItem[], GeneratedTextItem[]>(
    batches,
    TEXT_CONCURRENCY,
    async (batch, index) => {
      const prompt = buildTextGenerationPrompt({
        items: batch,
        requestSnapshot: input.requestSnapshot,
      });

      logger.info(`[content-generation:text] sending batch ${index + 1}/${batches.length}`, {
        provider: input.adapter.provider,
        model: input.config.model,
        itemCount: batch.length,
        promptCharacters: prompt.length,
      });

      const response = await input.adapter.generateBatch({
        model: input.config.model,
        prompt,
      });

      return generatedTextBatchSchema.parse(response).items;
    },
  );

  const generatedItems: GeneratedTextItem[] = [];

  for (const [index, result] of settledResults.entries()) {
    if (result.status === "fulfilled") {
      generatedItems.push(...result.value);
      continue;
    }

    const errorMessage =
      result.reason instanceof Error ? result.reason.message : String(result.reason);
    logger.error("[content-generation:text] batch text generation failed", {
      provider: input.adapter.provider,
      batchIndex: index,
      error: errorMessage,
    });
    throw new Error(`Text content generation failed on batch ${index + 1}: ${errorMessage}`);
  }

  logger.info("[content-generation:text] completed batched content generation", {
    provider: input.adapter.provider,
    model: input.config.model,
    totalGenerated: generatedItems.length,
    warningCount: generatedItems.reduce((count, item) => count + item.warnings.length, 0),
  });

  return generatedItems;
}
