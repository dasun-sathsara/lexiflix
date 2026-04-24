import "server-only";

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI, type Schema, Type } from "@google/genai";
import { z } from "zod";
import { env } from "@/lib/env";
import type {
  EffectiveGenerationCapabilities,
  GeneratedTextItem,
  GenerationRequestSnapshot,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import { CONTENT_GENERATION_TEXT_PROMPT_VERSION } from "@/lib/server/content-generation/contracts";

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
    `Prompt version: ${CONTENT_GENERATION_TEXT_PROMPT_VERSION}.`,
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

function buildMockItem(
  item: SelectedGenerationItem,
  request: GenerationRequestSnapshot,
): GeneratedTextItem {
  const exampleBase = item.displayText.toLowerCase();
  return {
    analysisItemId: item.analysisItemId,
    termId: item.termId,
    meaning: `${item.displayText} means an idea or expression used in this title's dialogue.`,
    exampleSentences: Array.from({ length: request.exampleSentenceCount }, (_, index) =>
      index === 0
        ? `I heard "${exampleBase}" in a conversation and understood the scene better.`
        : `The phrase "${exampleBase}" can fit naturally in everyday English.`,
    ),
    imageBrief: `${item.displayText} shown in a clear contextual learning illustration`,
    imageEligibility: {
      eligible:
        item.kind === "word" &&
        (item.cefrLevel?.startsWith("A") === true || item.cefrLevel?.startsWith("B") === true),
      reason: "Concrete beginner and intermediate words are the safest V1 image candidates.",
    },
    warnings: [],
  };
}

function requestFingerprint(input: {
  items: SelectedGenerationItem[];
  requestSnapshot: GenerationRequestSnapshot;
  capabilities: EffectiveGenerationCapabilities;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        promptVersion: CONTENT_GENERATION_TEXT_PROMPT_VERSION,
        model: input.capabilities.textModel,
        requestSnapshot: input.requestSnapshot,
        items: input.items.map((item) => ({
          id: item.analysisItemId,
          termId: item.termId,
          text: item.displayText,
          context: item.representativeContext,
        })),
      }),
    )
    .digest("hex");
}

async function readFixture(fingerprint: string) {
  if (!env.CONTENT_GENERATION_RECORDING_DIR) {
    throw new Error(
      "CONTENT_GENERATION_RECORDING_DIR is required for content generation replay mode.",
    );
  }
  const filePath = path.join(env.CONTENT_GENERATION_RECORDING_DIR, "text", `${fingerprint}.json`);
  return generatedTextBatchSchema.parse(JSON.parse(await readFile(filePath, "utf8"))).items;
}

async function writeFixture(fingerprint: string, items: GeneratedTextItem[]) {
  if (!env.CONTENT_GENERATION_RECORDING_DIR) {
    return;
  }
  const filePath = path.join(env.CONTENT_GENERATION_RECORDING_DIR, "text", `${fingerprint}.json`);
  await writeFile(filePath, JSON.stringify({ items }, null, 2));
}

export async function generateTextContent(input: {
  items: SelectedGenerationItem[];
  requestSnapshot: GenerationRequestSnapshot;
  capabilities: EffectiveGenerationCapabilities;
}): Promise<GeneratedTextItem[]> {
  if (input.capabilities.textMode === "mock") {
    return input.items.map((item) => buildMockItem(item, input.requestSnapshot));
  }

  const fingerprint = requestFingerprint(input);
  if (input.capabilities.textMode === "replay") {
    return readFixture(fingerprint);
  }

  const response = await geminiClient.models.generateContent({
    model: input.capabilities.textModel,
    contents: buildPrompt(input),
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const parsed = generatedTextBatchSchema.parse(JSON.parse(response.text ?? "{}")).items;
  if (input.capabilities.textMode === "record") {
    await writeFixture(fingerprint, parsed);
  }
  return parsed;
}
