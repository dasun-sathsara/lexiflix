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
