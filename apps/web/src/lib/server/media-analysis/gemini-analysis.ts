import "server-only";

import { GoogleGenAI, type Schema, Type } from "@google/genai";
import { logger } from "@trigger.dev/sdk";

import { env } from "@/lib/env";
import {
  type AnalysisLlmItem,
  analysisLlmItemSchema,
  analysisLlmResponseSchema,
  cefrNumericFromLevel,
  MEDIA_ANALYSIS_PIPELINE_VERSION,
} from "@/lib/server/media-analysis/contracts";

const geminiClient = new GoogleGenAI({
  vertexai: true,
  apiKey: env.GOOGLE_CLOUD_API_KEY,
});

const analysisLlmSdkSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    required: ["kind", "text", "displayText"],
    properties: {
      kind: {
        type: Type.STRING,
        format: "enum",
        enum: ["phrasal_verb", "idiom", "slang"],
        description: "Vocabulary item kind.",
      },
      text: {
        type: Type.STRING,
        description: "Canonical English phrase in lemma form.",
      },
      displayText: {
        type: Type.STRING,
        description: "Human-readable phrase as it should appear in the UI.",
      },
      cefrLevel: {
        type: Type.STRING,
        nullable: true,
        format: "enum",
        enum: ["A1", "A2", "B1", "B2", "C1", "C2"],
      },
      representativeContext: {
        type: Type.STRING,
        nullable: true,
        description: "One concise subtitle excerpt that supports the phrase.",
      },
    },
  },
};

type AnalyzeWithGeminiInput = {
  chunkText: string;
  chunkIndex: number;
  totalChunks: number;
};

type AnalyzeWithGeminiResult = {
  items: Array<
    AnalysisLlmItem & {
      cefrNumeric: number | null;
    }
  >;
  warnings: string[];
};

function buildPrompt({ chunkText, chunkIndex, totalChunks }: AnalyzeWithGeminiInput) {
  return `
You are classifying reusable subtitle-analysis phrases for LexiFlix.

Only return structured JSON. Do not add prose.

Chunk ${chunkIndex + 1} of ${totalChunks}.

Extract only these reusable kinds:
- phrasal_verb
- idiom
- slang

Rules:
- Ignore single-word vocabulary. NLP owns that.
- Ignore filler and very basic expressions.
- Normalize each phrase to its canonical English form.
- Keep only items that would help an English learner studying movie or TV dialogue.
- representativeContext should be a short direct excerpt from the input chunk when possible.
- If nothing qualifies, return an empty array.

Subtitle chunk:
${chunkText}
`.trim();
}

function normalizeGeminiItems(rawItems: unknown[]) {
  const items: AnalysisLlmItem[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const rawItem of rawItems) {
    const normalized = normalizeGeminiItem(rawItem);
    if (!normalized) {
      warnings.push("Dropped one Gemini candidate because it did not match the internal schema.");
      continue;
    }

    const key = `${normalized.kind}:${normalized.text.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    items.push(normalized);
  }

  return { items, warnings };
}

function extractGeminiItems(parsedJson: unknown) {
  if (Array.isArray(parsedJson)) {
    return parsedJson;
  }

  if (
    parsedJson &&
    typeof parsedJson === "object" &&
    "items" in parsedJson &&
    Array.isArray((parsedJson as { items: unknown }).items)
  ) {
    return (parsedJson as { items: unknown[] }).items;
  }

  return [];
}

function normalizeGeminiItem(rawItem: unknown) {
  if (!rawItem || typeof rawItem !== "object") {
    return null;
  }

  const input = rawItem as Record<string, unknown>;
  const kind = normalizeKind(input.kind);
  const text = typeof input.text === "string" ? input.text.trim() : "";
  const displayText =
    typeof input.displayText === "string" && input.displayText.trim().length > 0
      ? input.displayText.trim()
      : text;
  const cefrLevel = normalizeCefrLevel(input.cefrLevel);
  const representativeContext =
    typeof input.representativeContext === "string" && input.representativeContext.trim().length > 0
      ? input.representativeContext.trim()
      : null;
  const rationale =
    typeof input.rationale === "string" && input.rationale.trim().length > 0
      ? input.rationale.trim()
      : null;

  const parsed = analysisLlmItemSchema.safeParse({
    kind,
    text,
    displayText,
    cefrLevel,
    representativeContext,
    contexts: representativeContext ? [{ text: representativeContext }] : [],
    rationale,
  });

  return parsed.success ? parsed.data : null;
}

function normalizeKind(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  switch (value.trim().toLowerCase()) {
    case "phrasal verb":
    case "phrasal_verb":
      return "phrasal_verb";
    case "idiom":
      return "idiom";
    case "slang":
      return "slang";
    default:
      return value;
  }
}

function normalizeCefrLevel(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return ["A1", "A2", "B1", "B2", "C1", "C2"].includes(normalized) ? normalized : null;
}

async function runLiveGeminiAnalysis(input: AnalyzeWithGeminiInput) {
  const prompt = buildPrompt(input);

  logger.info("[media-analysis:llm] sending live Gemini request", {
    chunkIndex: input.chunkIndex + 1,
    totalChunks: input.totalChunks,
    model: env.ANALYSIS_LLM_MODEL,
    pipelineVersion: MEDIA_ANALYSIS_PIPELINE_VERSION,
    chunkCharacters: input.chunkText.length,
    promptCharacters: prompt.length,
  });

  const response = await geminiClient.models.generateContent({
    model: env.ANALYSIS_LLM_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisLlmSdkSchema,
      temperature: 0,
    },
  });

  if (!response.text) {
    logger.info("[media-analysis:llm] Gemini returned empty text", {
      chunkIndex: input.chunkIndex + 1,
      totalChunks: input.totalChunks,
      model: env.ANALYSIS_LLM_MODEL,
    });

    return analysisLlmResponseSchema.parse({ items: [] });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(response.text);
  } catch {
    throw new Error("Gemini returned non-JSON output.");
  }

  const itemsArray = extractGeminiItems(parsedJson);
  const normalized = normalizeGeminiItems(itemsArray);

  logger.info("[media-analysis:llm] Gemini response parsed", {
    chunkIndex: input.chunkIndex + 1,
    totalChunks: input.totalChunks,
    rawItemCount: itemsArray.length,
    normalizedItemCount: normalized.items.length,
    warningCount: normalized.warnings.length,
  });

  return analysisLlmResponseSchema.parse({
    items: normalized.items,
  });
}

export async function analyzeChunkWithGemini(
  input: AnalyzeWithGeminiInput,
): Promise<AnalyzeWithGeminiResult> {
  logger.info("[media-analysis:llm] chunk started", {
    chunkIndex: input.chunkIndex + 1,
    totalChunks: input.totalChunks,
    model: env.ANALYSIS_LLM_MODEL,
    chunkCharacters: input.chunkText.length,
  });

  const response = await runLiveGeminiAnalysis(input);

  const normalized = response.items.map((item) => ({
    ...item,
    cefrNumeric: cefrNumericFromLevel(item.cefrLevel),
  }));

  const result = {
    items: normalized,
    warnings: [],
  };

  logger.info("[media-analysis:llm] chunk completed", {
    chunkIndex: input.chunkIndex + 1,
    totalChunks: input.totalChunks,
    itemCount: result.items.length,
    warningCount: result.warnings.length,
  });

  return result;
}
