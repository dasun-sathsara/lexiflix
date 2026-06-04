import "server-only";

import { z } from "zod";

export const CONTENT_ANALYSIS_RUN_STATUSES = ["queued", "running", "completed", "failed"] as const;

export const CONTENT_ANALYSIS_STAGES = [
  "queued",
  "fetching_subtitles",
  "running_nlp",
  "running_llm",
  "merging_analysis",
  "saving_analysis",
  "completed",
  "failed",
] as const;

export type ContentAnalysisRunStatus = (typeof CONTENT_ANALYSIS_RUN_STATUSES)[number];
export type ContentAnalysisStage = (typeof CONTENT_ANALYSIS_STAGES)[number];

export const resolveContentTargetInputSchema = z.object({
  mediaType: z.enum(["movie", "tv"]),
  tmdbId: z.number().int().positive(),
  seasonNumber: z.number().int().positive().optional(),
});

export const contentAnalysisTransitionSchema = z.object({
  runId: z.string().min(1),
  /** Derived from `stage` when omitted. */
  status: z.enum(CONTENT_ANALYSIS_RUN_STATUSES).optional(),
  stage: z.enum(CONTENT_ANALYSIS_STAGES),
  message: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  progressMessage: z.string().min(1).nullable().optional(),
  errorCode: z.string().min(1).nullable().optional(),
  errorMessage: z.string().min(1).nullable().optional(),
  startedAt: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  warnings: z.array(z.string()).nullable().optional(),
});

export type ResolveContentTargetInput = z.infer<typeof resolveContentTargetInputSchema>;
export type ContentAnalysisTransitionInput = z.infer<typeof contentAnalysisTransitionSchema>;
