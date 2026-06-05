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
import { buildPromptWindows } from "@/lib/server/media-analysis/providers/analysis-llm/windows";
import { mapWithConcurrency } from "@/lib/server/utils/concurrency";

export type AnalysisLlmPhrase = AnalysisLlmItem & {
  cefrNumeric: number | null;
};

export type AnalysisLlmResult = {
  provider: AnalysisLlmProviderConfig["provider"];
  model: string;
  /** Number of prompt windows the subtitle text was split into. */
  windowCount: number;
  phrases: AnalysisLlmPhrase[];
  warnings: string[];
};

export async function extractSubtitlePhrasesWithAdapter(input: {
  subtitleText: string;
  config: AnalysisLlmProviderConfig;
  adapter: AnalysisLlmAdapter;
}): Promise<AnalysisLlmResult> {
  const windows = buildPromptWindows(input.subtitleText);

  logger.info("[media-analysis:llm] starting phrase extraction", {
    provider: input.adapter.provider,
    model: input.config.model,
    windowCount: windows.length,
    subtitleCharacters: input.subtitleText.length,
    concurrency: ANALYSIS_LLM_CONCURRENCY,
  });

  const settledResults = await mapWithConcurrency(
    windows,
    ANALYSIS_LLM_CONCURRENCY,
    async (windowText, windowIndex) => {
      const prompt = buildPhraseExtractionPrompt({
        windowText,
        windowIndex,
        totalWindows: windows.length,
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
      logger.error("[media-analysis:llm] window extraction failed", {
        provider: input.adapter.provider,
        windowIndex: index,
        error: errorMessage,
      });
      warnings.push(`Subtitle window ${index + 1} analysis failed: ${errorMessage}`);
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
    failedWindowCount: warnings.length,
  });

  return {
    provider: input.adapter.provider,
    model: input.config.model,
    windowCount: windows.length,
    phrases,
    warnings,
  };
}
