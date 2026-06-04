import { z } from "zod";
import { CEFR_LEVELS, NLP_ANALYSIS_BATCH_SIZE } from "@/lib/constants";
import { contextListSchema } from "@/lib/domain/contexts";

export const nlpAnalysisOptionsSchema = z.object({
  include_propn: z.boolean().default(false),
  dedup_lines: z.boolean().default(true),
  batch_size: z.number().int().min(1).max(10_000).default(NLP_ANALYSIS_BATCH_SIZE),
});

export const nlpAnalysisRequestSchema = z.object({
  job_id: z.string().min(1).nullable().optional(),
  content: z.string().min(1),
  content_type: z.enum(["srt", "plain_text"]).default("srt"),
  pipeline_version: z.string().min(1).nullable().optional(),
  options: nlpAnalysisOptionsSchema.prefault({}),
});

export const nlpVocabularyCandidateSchema = z.object({
  text: z.string().min(1),
  lemma: z.string().min(1),
  type: z.string().min(1),
  cefr_level: z.enum(CEFR_LEVELS).nullable().optional(),
  count: z.number().int().min(1),
  contexts: contextListSchema,
});

export const nlpAnalysisMetadataSchema = z.object({
  job_id: z.string().min(1).nullable().optional(),
  total_lines: z.number().int().min(0),
  total_characters: z.number().int().min(0),
  unique_candidates: z.number().int().min(0),
  spacy_model: z.string().min(1),
  pipeline_version: z.string().min(1).nullable().optional(),
});

export const nlpAnalysisResponseSchema = z.object({
  metadata: nlpAnalysisMetadataSchema,
  candidates: z.array(nlpVocabularyCandidateSchema),
  warnings: z.array(z.string()).default([]),
});

export type NlpAnalysisRequest = z.input<typeof nlpAnalysisRequestSchema>;
export type NlpVocabularyCandidate = z.infer<typeof nlpVocabularyCandidateSchema>;
export type NlpAnalysisResponse = z.infer<typeof nlpAnalysisResponseSchema>;
