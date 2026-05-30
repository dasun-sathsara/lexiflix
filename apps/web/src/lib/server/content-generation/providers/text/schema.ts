import "server-only";

import { z } from "zod";

export const generatedTextItemSchema = z.object({
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

export const generatedTextBatchSchema = z.object({
  items: z.array(generatedTextItemSchema),
});
