import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { GoogleGenAI, type Schema, Type } from "@google/genai";
import { logger } from "@trigger.dev/sdk";

import { env } from "@/lib/env";
import {
  type AnalysisLlmExecutionMode,
  type AnalysisLlmItem,
  analysisLlmItemSchema,
  analysisLlmRecordingSchema,
  analysisLlmResponseSchema,
  cefrNumericFromLevel,
  MEDIA_ANALYSIS_LLM_PROMPT_VERSION,
  MEDIA_ANALYSIS_LLM_SCHEMA_VERSION,
  toRepresentativeContexts,
} from "@/lib/server/media-analysis/contracts";

const geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

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
      rationale: {
        type: Type.STRING,
        nullable: true,
        description: "Short explanation for why the item matters to learners.",
      },
    },
  },
};

type AnalyzeWithGeminiInput = {
  chunkText: string;
  chunkIndex: number;
  totalChunks: number;
  mode?: AnalysisLlmExecutionMode;
};

type AnalyzeWithGeminiResult = {
  executionMode: AnalysisLlmExecutionMode;
  model: string;
  promptVersion: string;
  schemaVersion: string;
  requestFingerprint: string;
  items: Array<
    AnalysisLlmItem & {
      cefrNumeric: number | null;
    }
  >;
  warnings: string[];
};

export class GeminiAnalysisError extends Error {
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "GeminiAnalysisError";
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function hashValue(value: unknown) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

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
    contexts: toRepresentativeContexts(representativeContext),
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

function getExecutionMode(mode?: AnalysisLlmExecutionMode) {
  return mode ?? env.ANALYSIS_LLM_MODE;
}

function getRecordingDirectory() {
  return env.ANALYSIS_LLM_RECORDING_DIR
    ? resolve(env.ANALYSIS_LLM_RECORDING_DIR)
    : resolve(process.cwd(), ".cache", "analysis-llm-recordings");
}

function buildRequestFingerprint(input: AnalyzeWithGeminiInput) {
  return hashValue({
    promptVersion: MEDIA_ANALYSIS_LLM_PROMPT_VERSION,
    schemaVersion: MEDIA_ANALYSIS_LLM_SCHEMA_VERSION,
    model: env.ANALYSIS_LLM_MODEL,
    input: {
      chunkIndex: input.chunkIndex,
      totalChunks: input.totalChunks,
      chunkText: input.chunkText.trim(),
    },
  });
}

async function readRecordedResponse(requestFingerprint: string) {
  const filePath = resolve(getRecordingDirectory(), `${requestFingerprint}.json`);
  const raw = await readFile(filePath, "utf8");
  const parsed = analysisLlmRecordingSchema.safeParse(JSON.parse(raw));

  if (!parsed.success) {
    throw new GeminiAnalysisError("Gemini replay fixture is invalid.", parsed.error.flatten());
  }

  return parsed.data;
}

async function writeRecordedResponse(
  requestFingerprint: string,
  response: ReturnType<typeof analysisLlmResponseSchema.parse>,
) {
  const filePath = resolve(getRecordingDirectory(), `${requestFingerprint}.json`);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    JSON.stringify(
      {
        requestFingerprint,
        promptVersion: MEDIA_ANALYSIS_LLM_PROMPT_VERSION,
        schemaVersion: MEDIA_ANALYSIS_LLM_SCHEMA_VERSION,
        model: env.ANALYSIS_LLM_MODEL,
        recordedAt: new Date().toISOString(),
        response,
      },
      null,
      2,
    ),
    "utf8",
  );
}

function buildMockItems(input: AnalyzeWithGeminiInput) {
  const sampleItems: AnalysisLlmItem[] = [
    {
      kind: "phrasal_verb",
      text: "figure out",
      displayText: "figure out",
      cefrLevel: "B1",
      representativeContext: input.chunkText.split(/[.!?]/)[0]?.trim() || null,
      contexts: toRepresentativeContexts(input.chunkText.split(/[.!?]/)[0]?.trim() || null),
      rationale: "Common dialogue phrasal verb with non-literal meaning.",
    },
    {
      kind: "idiom",
      text: "spill the beans",
      displayText: "spill the beans",
      cefrLevel: "B2",
      representativeContext: input.chunkText.split(/[.!?]/)[0]?.trim() || null,
      contexts: toRepresentativeContexts(input.chunkText.split(/[.!?]/)[0]?.trim() || null),
      rationale: "Recognizable idiom useful in conversational media.",
    },
    {
      kind: "slang",
      text: "low-key",
      displayText: "low-key",
      cefrLevel: "B2",
      representativeContext: input.chunkText.split(/[.!?]/)[0]?.trim() || null,
      contexts: toRepresentativeContexts(input.chunkText.split(/[.!?]/)[0]?.trim() || null),
      rationale: "Informal spoken expression common in modern dialogue.",
    },
  ];
  const count = Math.min(
    sampleItems.length,
    (parseInt(hashValue(input.chunkText).slice(0, 2), 16) % 3) + 1,
  );

  return sampleItems.slice(0, count);
}

async function runLiveGeminiAnalysis(input: AnalyzeWithGeminiInput) {
  const prompt = buildPrompt(input);

  logger.info("[media-analysis:llm] sending live Gemini request", {
    chunkIndex: input.chunkIndex + 1,
    totalChunks: input.totalChunks,
    model: env.ANALYSIS_LLM_MODEL,
    promptVersion: MEDIA_ANALYSIS_LLM_PROMPT_VERSION,
    schemaVersion: MEDIA_ANALYSIS_LLM_SCHEMA_VERSION,
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
  } catch (error) {
    throw new GeminiAnalysisError("Gemini returned non-JSON analysis output.", error);
  }

  const itemsArray = Array.isArray(parsedJson) ? parsedJson : [];
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
  const executionMode = getExecutionMode(input.mode);
  const requestFingerprint = buildRequestFingerprint(input);
  const warnings: string[] = [];
  let response = analysisLlmResponseSchema.parse({ items: [] });

  logger.info("[media-analysis:llm] chunk started", {
    chunkIndex: input.chunkIndex + 1,
    totalChunks: input.totalChunks,
    mode: executionMode,
    model: env.ANALYSIS_LLM_MODEL,
    requestFingerprint,
    chunkCharacters: input.chunkText.length,
  });

  if (executionMode === "mock") {
    response = analysisLlmResponseSchema.parse({ items: buildMockItems(input) });
    logger.info("[media-analysis:llm] mock response generated", {
      chunkIndex: input.chunkIndex + 1,
      totalChunks: input.totalChunks,
      itemCount: response.items.length,
    });
  } else if (executionMode === "replay") {
    const recorded = await readRecordedResponse(requestFingerprint);
    response = recorded.response;
    logger.info("[media-analysis:llm] replay response loaded", {
      chunkIndex: input.chunkIndex + 1,
      totalChunks: input.totalChunks,
      itemCount: response.items.length,
      requestFingerprint,
    });
  } else {
    response = await runLiveGeminiAnalysis(input);

    if (executionMode === "record") {
      await writeRecordedResponse(requestFingerprint, response);
      logger.info("[media-analysis:llm] response recorded", {
        chunkIndex: input.chunkIndex + 1,
        totalChunks: input.totalChunks,
        itemCount: response.items.length,
        requestFingerprint,
      });
    }
  }

  const normalized = response.items.map((item) => ({
    ...item,
    cefrNumeric: cefrNumericFromLevel(item.cefrLevel),
  }));

  const result = {
    executionMode,
    model: env.ANALYSIS_LLM_MODEL,
    promptVersion: MEDIA_ANALYSIS_LLM_PROMPT_VERSION,
    schemaVersion: MEDIA_ANALYSIS_LLM_SCHEMA_VERSION,
    requestFingerprint,
    items: normalized,
    warnings,
  };

  logger.info("[media-analysis:llm] chunk completed", {
    chunkIndex: input.chunkIndex + 1,
    totalChunks: input.totalChunks,
    mode: executionMode,
    itemCount: result.items.length,
    warningCount: result.warnings.length,
    requestFingerprint,
  });

  return result;
}
