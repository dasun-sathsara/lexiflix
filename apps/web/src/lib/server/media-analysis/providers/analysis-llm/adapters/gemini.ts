import "server-only";

import { GoogleGenAI, type Schema, Type } from "@google/genai";
import { env } from "@/lib/config/env";
import { CEFR_LEVELS, PHRASE_VOCABULARY_KINDS } from "@/lib/constants";
import type { AnalysisLlmAdapter } from "@/lib/server/media-analysis/providers/analysis-llm/port";

const geminiClient = new GoogleGenAI({
  vertexai: true,
  apiKey: env.GOOGLE_CLOUD_API_KEY,
});

const responseSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    required: ["kind", "text", "displayText"],
    properties: {
      kind: {
        type: Type.STRING,
        format: "enum",
        enum: [...PHRASE_VOCABULARY_KINDS],
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
        enum: [...CEFR_LEVELS],
      },
      representativeContext: {
        type: Type.STRING,
        nullable: true,
        description: "One concise subtitle excerpt that supports the phrase.",
      },
    },
  },
};

const KIND_ALIASES: Record<string, string> = {
  "phrasal verb": "phrasal_verb",
  phrasalverb: "phrasal_verb",
};

/** Gemini answers with a bare array and occasionally uses spaced kind labels. */
function normalizePayload(payload: unknown) {
  const rawItems = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { items?: unknown }).items)
      ? ((payload as { items: unknown[] }).items ?? [])
      : [];

  const items = rawItems.map((rawItem) => {
    if (!rawItem || typeof rawItem !== "object") {
      return rawItem;
    }

    const item = rawItem as Record<string, unknown>;
    const kind = typeof item.kind === "string" ? item.kind.trim().toLowerCase() : item.kind;
    const text = typeof item.text === "string" ? item.text.trim() : item.text;
    const displayText =
      typeof item.displayText === "string" && item.displayText.trim()
        ? item.displayText.trim()
        : text;
    const representativeContext =
      typeof item.representativeContext === "string" ? item.representativeContext.trim() : null;

    return {
      ...item,
      kind: typeof kind === "string" ? (KIND_ALIASES[kind] ?? kind) : kind,
      text,
      displayText,
      cefrLevel: typeof item.cefrLevel === "string" ? item.cefrLevel.trim().toUpperCase() : null,
      representativeContext: representativeContext || null,
      contexts: representativeContext ? [representativeContext] : [],
    };
  });

  return { items };
}

export function createGeminiAnalysisLlmAdapter(): AnalysisLlmAdapter {
  return {
    provider: "gemini",
    async extractPhrases(request) {
      const response = await geminiClient.models.generateContent({
        model: request.model,
        contents: request.prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0,
        },
      });

      if (!response.text) {
        return { items: [] };
      }

      try {
        return normalizePayload(JSON.parse(response.text));
      } catch {
        throw new Error("Gemini returned non-JSON output.");
      }
    },
  };
}
