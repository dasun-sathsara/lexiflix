import { z } from "zod";
import type { NlpCandidateContext } from "@/lib/server/db/json-contracts";

/**
 * Subtitle evidence contexts are produced by the NLP service and the analysis LLM, and are
 * persisted as plain strings. Older stored rows may still hold `{ text }` objects, so every
 * read path normalizes through these helpers.
 */

export function normalizeContextText(context: unknown): string | null {
  if (typeof context === "string") {
    return context.trim() || null;
  }

  if (context && typeof context === "object" && "text" in context) {
    const text = (context as { text: unknown }).text;
    return typeof text === "string" ? text.trim() || null : null;
  }

  return null;
}

/**
 * Normalizes, de-duplicates and optionally caps a raw context list.
 */
export function normalizeContextList(raw: unknown, limit?: number): NlpCandidateContext[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const contexts: NlpCandidateContext[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    const normalized = normalizeContextText(entry);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    contexts.push(normalized);

    if (limit !== undefined && contexts.length >= limit) {
      break;
    }
  }

  return contexts;
}

/** Zod field for provider payloads: accepts `string[]` and legacy `{ text }[]` rows. */
export const contextListSchema = z
  .array(z.union([z.string(), z.object({ text: z.string() })]))
  .default([])
  .transform((items) => normalizeContextList(items));
