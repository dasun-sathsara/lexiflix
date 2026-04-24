import "server-only";

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI, type Schema, Type } from "@google/genai";
import { logger } from "@trigger.dev/sdk";
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
  logger.info("[content-generation:text] started", {
    mode: input.capabilities.textMode,
    model: input.capabilities.textModel,
    itemCount: input.items.length,
    packSize: input.requestSnapshot.packSize,
    exampleSentenceCount: input.requestSnapshot.exampleSentenceCount,
  });

  if (input.capabilities.textMode === "mock") {
    const items = input.items.map((item) => buildMockItem(item, input.requestSnapshot));
    logger.info("[content-generation:text] mock content generated", {
      itemCount: items.length,
      warningCount: items.reduce((count, item) => count + item.warnings.length, 0),
    });
    return items;
  }

  const fingerprint = requestFingerprint(input);
  if (input.capabilities.textMode === "replay") {
    logger.info("[content-generation:text] loading replay fixture", { fingerprint });
    const items = await readFixture(fingerprint);
    logger.info("[content-generation:text] replay fixture loaded", {
      fingerprint,
      itemCount: items.length,
    });
    return items;
  }

  const prompt = buildPrompt(input);
  logger.info("[content-generation:text] sending Gemini request", {
    mode: input.capabilities.textMode,
    model: input.capabilities.textModel,
    fingerprint,
    itemCount: input.items.length,
    promptCharacters: prompt.length,
  });

  const response = await geminiClient.models.generateContent({
    model: input.capabilities.textModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const parsed = generatedTextBatchSchema.parse(JSON.parse(response.text ?? "{}")).items;
  logger.info("[content-generation:text] Gemini response parsed", {
    mode: input.capabilities.textMode,
    model: input.capabilities.textModel,
    fingerprint,
    itemCount: parsed.length,
    warningCount: parsed.reduce((count, item) => count + item.warnings.length, 0),
  });

  if (input.capabilities.textMode === "record") {
    await writeFixture(fingerprint, parsed);
    logger.info("[content-generation:text] response recorded", {
      fingerprint,
      itemCount: parsed.length,
    });
  }

  return parsed;
}
