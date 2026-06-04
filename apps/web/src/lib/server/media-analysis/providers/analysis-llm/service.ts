import "server-only";

import { logger } from "@trigger.dev/sdk";
import { ANALYSIS_LLM_CONCURRENCY } from "@/lib/constants";
import { cefrNumericFromLevel } from "@/lib/domain/cefr";
import type {
  AnalysisLlmAdapter,
  AnalysisLlmProviderConfig,
} from "@/lib/server/media-analysis/providers/analysis-llm/port";
import { buildPhraseExtractionPrompt } from "@/lib/server/media-analysis/providers/analysis-llm/prompt";
import {
  type AnalysisLlmItem,
  analysisLlmResponseSchema,
} from "@/lib/server/media-analysis/providers/analysis-llm/schema";
import { mapWithConcurrency } from "@/lib/server/utils/concurrency";

/** Minimal chunk shape the provider needs, so it stays decoupled from subtitle types. */
export type AnalysisLlmChunk = {
  chunkIndex: number;
  text: string;
};

export type AnalysisLlmPhrase = AnalysisLlmItem & {
  cefrNumeric: number | null;
};

export type AnalysisLlmResult = {
  provider: AnalysisLlmProviderConfig["provider"];
  model: string;
  phrases: AnalysisLlmPhrase[];
  warnings: string[];
};

export async function extractSubtitlePhrasesWithAdapter(input: {
  chunks: AnalysisLlmChunk[];
  config: AnalysisLlmProviderConfig;
  adapter: AnalysisLlmAdapter;
}): Promise<AnalysisLlmResult> {
  logger.info("[media-analysis:llm] starting phrase extraction", {
    provider: input.adapter.provider,
    model: input.config.model,
    chunkCount: input.chunks.length,
    concurrency: ANALYSIS_LLM_CONCURRENCY,
  });

  const settledResults = await mapWithConcurrency(
    input.chunks,
    ANALYSIS_LLM_CONCURRENCY,
    async (chunk) => {
      const prompt = buildPhraseExtractionPrompt({
        chunkText: chunk.text,
        chunkIndex: chunk.chunkIndex,
        totalChunks: input.chunks.length,
      });

      const payload = await input.adapter.extractPhrases({
        model: input.config.model,
        prompt,
      });

      return analysisLlmResponseSchema.parse(payload).items;
    },
  );

  const phrases: AnalysisLlmPhrase[] = [];
  const warnings: string[] = [];

  for (const [index, result] of settledResults.entries()) {
    if (result.status === "rejected") {
      const errorMessage =
        result.reason instanceof Error ? result.reason.message : String(result.reason);
      logger.error("[media-analysis:llm] chunk extraction failed", {
        provider: input.adapter.provider,
        chunkIndex: index,
        error: errorMessage,
      });
      warnings.push(`Chunk ${index + 1} analysis failed: ${errorMessage}`);
      continue;
    }

    for (const item of result.value) {
      phrases.push({
        ...item,
        cefrNumeric: cefrNumericFromLevel(item.cefrLevel),
      });
    }
  }

  logger.info("[media-analysis:llm] phrase extraction completed", {
    provider: input.adapter.provider,
    model: input.config.model,
    phraseCount: phrases.length,
    failedChunkCount: warnings.length,
  });

  return {
    provider: input.adapter.provider,
    model: input.config.model,
    phrases,
    warnings,
  };
}
