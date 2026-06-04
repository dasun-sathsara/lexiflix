import "server-only";

import { logger } from "@trigger.dev/sdk";
import { eq } from "drizzle-orm";
import { MEDIA_ANALYSIS_PIPELINE_VERSION } from "@/lib/constants";
import { analyzeWithNlpService } from "@/lib/integrations/nlp-service/client";
import { db } from "@/lib/server/db";
import type { ContentAnalysisSummary } from "@/lib/server/db/json-contracts";
import { content, contentAnalysisRun } from "@/lib/server/db/schema";
import { mergeAnalysisItems } from "@/lib/server/media-analysis/merge";
import { persistAnalysisRunOutput } from "@/lib/server/media-analysis/persistence";
import { extractSubtitlePhrases } from "@/lib/server/media-analysis/providers/analysis-llm";
import {
  type ContentAnalysisRunRow,
  recordContentAnalysisRunTransition,
} from "@/lib/server/media-analysis/runs";
import { buildSubtitleChunks } from "@/lib/server/media-analysis/subtitles/chunks";
import { buildSubtitleCorpus } from "@/lib/server/media-analysis/subtitles/corpus";
import { buildPlainTextCorpus } from "@/lib/server/media-analysis/subtitles/parse";
import { buildAnalysisSummary } from "@/lib/server/media-analysis/summary";

type ContentRow = typeof content.$inferSelect;

type RunContext = {
  run: ContentAnalysisRunRow;
  content: ContentRow;
};

export type MediaAnalysisWorkflowResult = {
  runId: string;
  contentId: string;
  status: "completed";
  summary: ContentAnalysisSummary;
  warningCount: number;
  itemCount: number;
};

async function getRunContext(runId: string): Promise<RunContext> {
  const [row] = await db
    .select({ run: contentAnalysisRun, content })
    .from(contentAnalysisRun)
    .innerJoin(content, eq(contentAnalysisRun.contentId, content.id))
    .where(eq(contentAnalysisRun.id, runId))
    .limit(1);

  if (!row) {
    throw new Error(`Content analysis run ${runId} was not found.`);
  }

  return row;
}

/** Orchestrates subtitle fetch, NLP analysis, LLM phrase extraction, merge and persistence. */
export async function runMediaAnalysisWorkflow(
  runId: string,
): Promise<MediaAnalysisWorkflowResult> {
  const startedAt = new Date();
  let context: RunContext | null = null;

  try {
    logger.info("[media-analysis] starting workflow", { runId });

    context = await getRunContext(runId);

    if (context.run.status === "completed" && context.run.stage === "completed") {
      logger.info("[media-analysis] run already completed", { runId });

      return {
        runId: context.run.id,
        contentId: context.content.id,
        status: "completed",
        summary: context.run.summary ?? {},
        warningCount: context.run.warnings?.length ?? 0,
        itemCount: 0,
      };
    }

    await recordContentAnalysisRunTransition({
      runId,
      stage: "fetching_subtitles",
      message: "Fetching subtitles from OpenSubtitles.",
      progressMessage: "Fetching subtitles...",
      startedAt,
    });

    const corpus = await buildSubtitleCorpus(context.content);
    const chunks = buildSubtitleChunks(corpus.lines);
    const warnings = [...corpus.warnings];

    logger.info("[media-analysis] subtitles ready", {
      runId,
      subtitleLineCount: corpus.lines.length,
      subtitleSourceCount: corpus.sourceCount,
      warningCount: corpus.warnings.length,
      plainTextCharacters: buildPlainTextCorpus(corpus.lines).length,
      chunkCount: chunks.length,
    });

    await recordContentAnalysisRunTransition({
      runId,
      stage: "running_nlp",
      message: "Running NLP analysis on normalized subtitles.",
      progressMessage: "Running subtitle NLP analysis...",
      payload: {
        subtitleLineCount: corpus.lines.length,
        subtitleSourceCount: corpus.sourceCount,
      },
      warnings,
    });

    const nlpResponse = await analyzeWithNlpService({
      job_id: runId,
      content: corpus.rawSrtText,
      content_type: "srt",
      pipeline_version: MEDIA_ANALYSIS_PIPELINE_VERSION,
    });
    warnings.push(...nlpResponse.warnings);

    logger.info("[media-analysis] NLP service completed", {
      runId,
      candidateCount: nlpResponse.candidates.length,
      warningCount: nlpResponse.warnings.length,
    });

    await recordContentAnalysisRunTransition({
      runId,
      stage: "running_llm",
      message: "Running phrase extraction across subtitle chunks.",
      progressMessage: "Analyzing subtitle phrases...",
      payload: { chunkCount: chunks.length },
      warnings,
    });

    const llmResult = await extractSubtitlePhrases({ chunks });
    warnings.push(...llmResult.warnings);

    logger.info("[media-analysis] phrase analysis completed", {
      runId,
      provider: llmResult.provider,
      model: llmResult.model,
      phraseCount: llmResult.phrases.length,
      warningCount: llmResult.warnings.length,
    });

    await recordContentAnalysisRunTransition({
      runId,
      stage: "merging_analysis",
      message: "Merging reusable vocabulary and phrase analysis.",
      progressMessage: "Merging analysis results...",
      payload: {
        nlpCandidateCount: nlpResponse.candidates.length,
        llmPhraseCount: llmResult.phrases.length,
      },
      warnings,
    });

    const items = mergeAnalysisItems({ nlpResponse, phrases: llmResult.phrases });
    const summary = buildAnalysisSummary({
      lines: corpus.lines,
      nlpCandidates: nlpResponse.candidates,
      items,
    });

    logger.info("[media-analysis] merged analysis", {
      runId,
      itemCount: items.length,
      warningCount: warnings.length,
      selectableItemCount: summary.selectableItemCount,
      totalWordCount: summary.totalWordCount,
    });

    await recordContentAnalysisRunTransition({
      runId,
      stage: "saving_analysis",
      message: "Saving reusable analysis output.",
      progressMessage: "Saving reusable analysis...",
      payload: { itemCount: items.length },
      warnings,
    });

    try {
      await persistAnalysisRunOutput({
        runId: context.run.id,
        contentId: context.content.id,
        items,
        warnings,
        summary,
      });
    } catch (error) {
      await recordContentAnalysisRunTransition({
        runId: context.run.id,
        stage: "failed",
        message: `Saving analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        progressMessage: "Saving analysis failed.",
        warnings,
        completedAt: new Date(),
      });
      throw error;
    }

    logger.info("[media-analysis] workflow completed", {
      runId: context.run.id,
      contentId: context.content.id,
      itemCount: items.length,
      warningCount: warnings.length,
    });

    return {
      runId: context.run.id,
      contentId: context.content.id,
      status: "completed",
      summary,
      warningCount: warnings.length,
      itemCount: items.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media analysis workflow failed.";

    logger.error("[media-analysis] workflow failed", {
      runId,
      contentId: context?.content.id,
      message,
    });

    if (context) {
      await recordContentAnalysisRunTransition({
        runId: context.run.id,
        stage: "failed",
        message,
        progressMessage: "Subtitle analysis could not be completed.",
        errorCode: "WORKFLOW_FAILED",
        errorMessage: message,
        completedAt: new Date(),
        payload: { error: message },
      });
    }

    throw error;
  }
}
