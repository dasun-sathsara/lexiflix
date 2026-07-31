import "server-only";

import { z } from "zod";
import { CEFR_LEVELS, PHRASE_VOCABULARY_KINDS } from "@/lib/constants";
import { contextListSchema } from "@/lib/domain/contexts";

export const analysisLlmItemSchema = z.object({
  kind: z.enum(PHRASE_VOCABULARY_KINDS),
  text: z.string().min(1),
  displayText: z.string().min(1),
  /** Providers occasionally invent levels; keep the item and drop the level. */
  cefrLevel: z.enum(CEFR_LEVELS).nullable().optional().catch(null),
  representativeContext: z.string().min(1).nullable().optional(),
  contexts: contextListSchema,
  rationale: z.string().min(1).nullable().optional(),
});

export const analysisLlmResponseSchema = z.object({
  items: z.array(analysisLlmItemSchema),
});

export type AnalysisLlmItem = z.infer<typeof analysisLlmItemSchema>;

/**
 * Wire shape requested from providers that derive a JSON Schema from the schema object
 * (OpenAI/Azure structured outputs).
 *
 * It must stay free of transforms, defaults, catches and optionals: JSON Schema cannot
 * express a transform, and strict structured outputs require every property to be present.
 * `analysisLlmResponseSchema` above stays the lenient validation boundary for the response.
 */
export const analysisLlmWireResponseSchema = z.object({
  items: z.array(
    z.object({
      kind: z.enum(PHRASE_VOCABULARY_KINDS),
      text: z.string(),
      displayText: z.string(),
      cefrLevel: z.enum(CEFR_LEVELS).nullable(),
      representativeContext: z.string().nullable(),
      contexts: z.array(z.string()),
      rationale: z.string().nullable(),
    }),
  ),
});
