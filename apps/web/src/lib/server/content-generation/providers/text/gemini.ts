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

const geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

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

export async function generateTextContent(input: {
  items: SelectedGenerationItem[];
  requestSnapshot: GenerationRequestSnapshot;
  model: string;
}): Promise<GeneratedTextItem[]> {
  logger.info("[content-generation:text] started", {
    model: input.model,
    itemCount: input.items.length,
    packSize: input.requestSnapshot.packSize,
    exampleSentenceCount: input.requestSnapshot.exampleSentenceCount,
  });

  const prompt = buildPrompt(input);
  logger.info("[content-generation:text] sending Gemini request", {
    model: input.model,
    itemCount: input.items.length,
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

  const parsed = generatedTextBatchSchema.parse(JSON.parse(response.text ?? "{}")).items;
  logger.info("[content-generation:text] Gemini response parsed", {
    model: input.model,
    itemCount: parsed.length,
    warningCount: parsed.reduce((count, item) => count + item.warnings.length, 0),
  });

  return parsed;
}
