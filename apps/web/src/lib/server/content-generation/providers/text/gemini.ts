import "server-only";

import { GoogleGenAI, type Schema, Type } from "@google/genai";
import { logger } from "@trigger.dev/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import type {
  GeneratedTextItem,
  GenerationRequestSnapshot,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";

const geminiClient = new GoogleGenAI({
  vertexai: true,
  apiKey: env.GOOGLE_CLOUD_API_KEY,
});

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

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          analysisItemId: { type: Type.STRING },
          termId: { type: Type.STRING },
          meaning: { type: Type.STRING },
          exampleSentences: { type: Type.ARRAY, items: { type: Type.STRING } },
          imageBrief: { type: Type.STRING, nullable: true },
          imageEligibility: {
            type: Type.OBJECT,
            properties: {
              eligible: { type: Type.BOOLEAN },
              reason: { type: Type.STRING },
            },
            required: ["eligible", "reason"],
          },
          warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["analysisItemId", "termId", "meaning", "exampleSentences", "imageEligibility"],
      },
    },
  },
  required: ["items"],
};

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
  logger.info("[content-generation:text] starting batched text generation", {
    model: input.model,
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
    async (batch: SelectedGenerationItem[], index: number): Promise<GeneratedTextItem[]> => {
      const prompt = buildPrompt({
        items: batch,
        requestSnapshot: input.requestSnapshot,
      });

      logger.info(`[content-generation:text] sending batch ${index + 1}/${batches.length}`, {
        model: input.model,
        itemCount: batch.length,
        promptCharacters: prompt.length,
      });

      const response = await geminiClient.models.generateContent({
        model: input.model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      if (!response.text) {
        throw new Error(`Batch ${index + 1} returned empty content.`);
      }

      const parsedBatch = generatedTextBatchSchema.parse(JSON.parse(response.text)).items;
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
      logger.error("[content-generation:text] batch text generation failed", {
        batchIndex: index,
        error: errorMsg,
      });
      throw new Error(`Text content generation failed on batch ${index + 1}: ${errorMsg}`);
    }
  }

  logger.info("[content-generation:text] completed batched content generation", {
    model: input.model,
    totalGenerated: allGeneratedItems.length,
    warningCount: allGeneratedItems.reduce((count, item) => count + item.warnings.length, 0),
  });

  return allGeneratedItems;
}
