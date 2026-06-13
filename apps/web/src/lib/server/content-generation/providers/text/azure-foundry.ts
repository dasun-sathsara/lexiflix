import "server-only";

import { logger } from "@trigger.dev/sdk";
import { AzureOpenAI } from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { env } from "@/lib/env";
import type {
  GeneratedTextItem,
  GenerationRequestSnapshot,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";

// Dynamically initialized only if configured
let openaiClient: AzureOpenAI | null = null;
function getOpenAIClient(): AzureOpenAI {
  if (!openaiClient) {
    if (!env.AZURE_AI_FOUNDRY_API_KEY || !env.AZURE_AI_FOUNDRY_ENDPOINT) {
      throw new Error(
        "Azure AI Foundry credentials (AZURE_AI_FOUNDRY_API_KEY, AZURE_AI_FOUNDRY_ENDPOINT) are not configured.",
      );
    }
    openaiClient = new AzureOpenAI({
      apiKey: env.AZURE_AI_FOUNDRY_API_KEY,
      endpoint: env.AZURE_AI_FOUNDRY_ENDPOINT,
      apiVersion: "2024-05-01-preview",
      deployment: env.AZURE_AI_FOUNDRY_MODEL ?? "gpt-5-4-nano-deploy",
    });
  }
  return openaiClient;
}

const generatedTextItemSchema = z.object({
  analysisItemId: z.string(),
  termId: z.string(),
  meaning: z.string().min(1),
  exampleSentences: z.array(z.string().min(1)).min(1).max(3),
  imageBrief: z.string().nullable().default(null),
  imageEligibility: z.object({
    eligible: z.boolean(),
    reason: z.string(),
  }),
  warnings: z.array(z.string()).default([]),
});

const generatedTextBatchSchema = z.object({
  items: z.array(generatedTextItemSchema),
});

function buildPrompt(input: {
  items: SelectedGenerationItem[];
  requestSnapshot: GenerationRequestSnapshot;
}) {
  return [
    "Generate learner-specific English study content for subtitle vocabulary.",
    "Prompt version: content-generation-text-v1.",
    `Learner CEFR: ${input.requestSnapshot.learnerCefrLevel ?? "unknown"}.`,
    `Examples per item: ${input.requestSnapshot.exampleSentenceCount}.`,
    "Meanings must be English-only. Generate new example sentences, not copied subtitle lines.",
    "Use subtitle evidence for grounding, but do not mention internal ids.",
    "Return JSON only in the requested schema.",
    input.requestSnapshot.customInstructions
      ? `Custom instructions: ${input.requestSnapshot.customInstructions}`
      : "",
    JSON.stringify({
      items: input.items.map((item) => ({
        analysisItemId: item.analysisItemId,
        termId: item.termId,
        term: item.displayText,
        kind: item.kind,
        cefrLevel: item.cefrLevel,
        representativeContext: item.representativeContext,
        contexts: item.contexts.slice(0, 3),
      })),
    }),
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await Promise.resolve(mapper(items[currentIndex], currentIndex)).then(
        (value) => ({ status: "fulfilled" as const, value }),
        (reason) => ({ status: "rejected" as const, reason }),
      );
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));

  return results;
}

const TEXT_BATCH_SIZE = 8;
const TEXT_CONCURRENCY = 2;

export async function generateTextContent(input: {
  items: SelectedGenerationItem[];
  requestSnapshot: GenerationRequestSnapshot;
  model: string;
}): Promise<GeneratedTextItem[]> {
  logger.info("[content-generation:text] starting batched text generation (Azure AI Foundry)", {
    model: input.model,
    totalItemCount: input.items.length,
    batchSize: TEXT_BATCH_SIZE,
    packSize: input.requestSnapshot.packSize,
    exampleSentenceCount: input.requestSnapshot.exampleSentenceCount,
  });

  const openai = getOpenAIClient();
  const batches: SelectedGenerationItem[][] = [];
  for (let i = 0; i < input.items.length; i += TEXT_BATCH_SIZE) {
    batches.push(input.items.slice(i, i + TEXT_BATCH_SIZE));
  }

  const settledResults = await mapWithConcurrency<SelectedGenerationItem[], GeneratedTextItem[]>(
    batches,
    TEXT_CONCURRENCY,
    async (batch: SelectedGenerationItem[], index: number): Promise<GeneratedTextItem[]> => {
      const prompt = buildPrompt({
        items: batch,
        requestSnapshot: input.requestSnapshot,
      });

      logger.info(
        `[content-generation:text] sending batch ${index + 1}/${batches.length} to Azure AI Foundry`,
        {
          model: input.model,
          itemCount: batch.length,
          promptCharacters: prompt.length,
        },
      );

      const response = await openai.chat.completions.create({
        model: input.model,
        messages: [{ role: "user", content: prompt }],
        response_format: zodResponseFormat(generatedTextBatchSchema, "generatedTextBatch"),
      });

      const text = response.choices[0]?.message?.content;
      if (!text) {
        throw new Error(`Batch ${index + 1} returned empty content.`);
      }

      const parsedBatch = generatedTextBatchSchema.parse(JSON.parse(text)).items;
      return parsedBatch;
    },
  );

  const allGeneratedItems: GeneratedTextItem[] = [];

  for (const [index, result] of settledResults.entries()) {
    if (result.status === "fulfilled") {
      allGeneratedItems.push(...result.value);
    } else {
      const errorMsg =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      logger.error("[content-generation:text] batch text generation failed (Azure AI Foundry)", {
        batchIndex: index,
        error: errorMsg,
      });
      throw new Error(`Text content generation failed on batch ${index + 1}: ${errorMsg}`);
    }
  }

  logger.info("[content-generation:text] completed batched content generation (Azure AI Foundry)", {
    model: input.model,
    totalGenerated: allGeneratedItems.length,
    warningCount: allGeneratedItems.reduce((count, item) => count + item.warnings.length, 0),
  });

  return allGeneratedItems;
}
