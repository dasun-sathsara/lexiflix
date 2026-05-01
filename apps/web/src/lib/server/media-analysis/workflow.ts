import "server-only";

import { logger } from "@trigger.dev/sdk";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/server/db";
import type {
  ContentAnalysisSummary,
  NlpCandidateContext,
  StoredCefrLevel,
  StoredVocabularyKind,
} from "@/lib/server/db/json-contracts";
import {
  content,
  contentAnalysisItem,
  contentAnalysisRun,
  contentAnalysisRunEvent,
  vocabularyTerm,
} from "@/lib/server/db/schema";
import {
  type ContentAnalysisStage,
  cefrNumericFromLevel,
  MEDIA_ANALYSIS_PIPELINE_VERSION,
} from "@/lib/server/media-analysis/contracts";
import { analyzeChunkWithGemini } from "@/lib/server/media-analysis/gemini-analysis";
import { analyzeWithNlpService } from "@/lib/server/media-analysis/nlp-service";
import { recordContentAnalysisRunTransition } from "@/lib/server/media-analysis/runs";
import {
  buildPlainTextCorpus,
  buildSubtitleChunks,
  buildSubtitleCorpus,
  normalizeSubtitleText,
  type SubtitleLine,
} from "@/lib/server/media-analysis/subtitle-processing";

type ContentRow = typeof content.$inferSelect;
type ContentAnalysisRunRow = typeof contentAnalysisRun.$inferSelect;

type WorkflowRunContext = {
  run: ContentAnalysisRunRow;
  content: ContentRow;
};

type WorkflowAnalysisItem = {
  kind: StoredVocabularyKind;
  normalizedText: string;
  lemma: string | null;
  displayText: string;
  partOfSpeech: string | null;
  baseCefrLevel: StoredCefrLevel | null;
  baseCefrNumeric: number | null;
  notes: string | null;
  analysisSource: "nlp" | "analysis_llm";
  surfaceForm: string;
  representativeContext: string | null;
  contexts: NlpCandidateContext[];
  occurrenceCount: number;
  frequencyRank: number | null;
  cefrLevel: StoredCefrLevel | null;
  cefrNumeric: number | null;
  cefrConfidence: number | null;
  cefrNote: string | null;
  isSelectable: boolean;
  filteredOutReason: string | null;
};

type WorkflowResult = {
  runId: string;
  contentId: string;
  status: "completed";
  summary: ContentAnalysisSummary;
  warningCount: number;
  itemCount: number;
};

const MAX_CONTEXTS_PER_ITEM = 5;

function normalizeTermText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "")
    .replace(/\s+/g, " ");
}

function averageCefrLevel(levels: number[]) {
  if (levels.length === 0) {
    return null;
  }

  const average = levels.reduce((sum, value) => sum + value, 0) / levels.length;
  const rounded = Math.min(6, Math.max(1, Math.round(average)));

  switch (rounded) {
    case 1:
      return "A1";
    case 2:
      return "A2";
    case 3:
      return "B1";
    case 4:
      return "B2";
    case 5:
      return "C1";
    case 6:
      return "C2";
    default:
      return null;
  }
}

function dedupeContexts(contexts: NlpCandidateContext[]) {
  const unique: NlpCandidateContext[] = [];
  const seen = new Set<string>();

  for (const context of contexts) {
    const normalized = normalizeSubtitleText(context.text);
    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push({ text: normalized });

    if (unique.length >= MAX_CONTEXTS_PER_ITEM) {
      break;
    }
  }

  return unique;
}

async function getRunContext(runId: string): Promise<WorkflowRunContext> {
  const [row] = await db
    .select({
      run: contentAnalysisRun,
      content,
    })
    .from(contentAnalysisRun)
    .innerJoin(content, eq(contentAnalysisRun.contentId, content.id))
    .where(eq(contentAnalysisRun.id, runId))
    .limit(1);

  if (!row) {
    throw new Error(`Content analysis run ${runId} was not found.`);
  }

  return row;
}

function createWorkflowItemKey(kind: StoredVocabularyKind, normalizedText: string) {
  return `${kind}:${normalizedText}`;
}

function mergeWorkflowItem(target: WorkflowAnalysisItem, incoming: WorkflowAnalysisItem) {
  target.occurrenceCount += incoming.occurrenceCount;
  target.contexts = dedupeContexts([...target.contexts, ...incoming.contexts]);
  target.representativeContext ??= incoming.representativeContext;
  target.cefrLevel ??= incoming.cefrLevel;
  target.cefrNumeric ??= incoming.cefrNumeric;
  target.cefrConfidence =
    Math.max(target.cefrConfidence ?? 0, incoming.cefrConfidence ?? 0) || null;
  target.cefrNote ??= incoming.cefrNote;
  target.notes ??= incoming.notes;
}

function createNlpWorkflowItems(
  response: Awaited<ReturnType<typeof analyzeWithNlpService>>,
): WorkflowAnalysisItem[] {
  const items: WorkflowAnalysisItem[] = [];

  for (const candidate of response.candidates) {
    const normalizedText = normalizeTermText(candidate.lemma || candidate.text);
    if (!normalizedText) {
      continue;
    }

    const contexts = dedupeContexts(candidate.contexts);
    items.push({
      kind: "word",
      normalizedText,
      lemma: normalizeTermText(candidate.lemma) || candidate.lemma,
      displayText: candidate.lemma || candidate.text,
      partOfSpeech: candidate.type,
      baseCefrLevel: candidate.cefr_level ?? null,
      baseCefrNumeric: candidate.cefr_numeric ?? cefrNumericFromLevel(candidate.cefr_level ?? null),
      notes: candidate.notes ?? null,
      analysisSource: "nlp",
      surfaceForm: candidate.text,
      representativeContext: contexts[0]?.text ?? null,
      contexts,
      occurrenceCount: candidate.count,
      frequencyRank: null,
      cefrLevel: candidate.cefr_level ?? null,
      cefrNumeric: candidate.cefr_numeric ?? cefrNumericFromLevel(candidate.cefr_level ?? null),
      cefrConfidence: candidate.confidence ?? null,
      cefrNote: candidate.notes ?? null,
      isSelectable: true,
      filteredOutReason: null,
    });
  }

  return items;
}

function createLlmWorkflowItems(
  response: Awaited<ReturnType<typeof analyzeChunkWithGemini>>,
): WorkflowAnalysisItem[] {
  const items: WorkflowAnalysisItem[] = [];

  for (const item of response.items) {
    const normalizedText = normalizeTermText(item.text);
    if (!normalizedText) {
      continue;
    }

    const contexts = dedupeContexts(item.contexts);
    items.push({
      kind: item.kind,
      normalizedText,
      lemma: normalizedText,
      displayText: item.displayText,
      partOfSpeech: null,
      baseCefrLevel: item.cefrLevel ?? null,
      baseCefrNumeric: item.cefrNumeric,
      notes: item.rationale ?? null,
      analysisSource: "analysis_llm",
      surfaceForm: item.displayText,
      representativeContext: item.representativeContext ?? contexts[0]?.text ?? null,
      contexts,
      occurrenceCount: 1,
      frequencyRank: null,
      cefrLevel: item.cefrLevel ?? null,
      cefrNumeric: item.cefrNumeric,
      cefrConfidence: null,
      cefrNote: item.rationale ?? null,
      isSelectable: true,
      filteredOutReason: null,
    });
  }

  return items;
}

function mergeAnalysisItems(
  nlpResponse: Awaited<ReturnType<typeof analyzeWithNlpService>>,
  llmResponses: Array<Awaited<ReturnType<typeof analyzeChunkWithGemini>>>,
) {
  const warnings = [...nlpResponse.warnings];
  const byKey = new Map<string, WorkflowAnalysisItem>();

  for (const item of createNlpWorkflowItems(nlpResponse)) {
    const key = createWorkflowItemKey(item.kind, item.normalizedText);
    const existing = byKey.get(key);

    if (existing) {
      mergeWorkflowItem(existing, item);
      continue;
    }

    byKey.set(key, { ...item });
  }

  for (const response of llmResponses) {
    warnings.push(...response.warnings);

    for (const item of createLlmWorkflowItems(response)) {
      const key = createWorkflowItemKey(item.kind, item.normalizedText);
      const existing = byKey.get(key);

      if (existing) {
        mergeWorkflowItem(existing, item);
        continue;
      }

      byKey.set(key, { ...item });
    }
  }

  const items = [...byKey.values()].sort((left, right) => {
    if (left.occurrenceCount !== right.occurrenceCount) {
      return right.occurrenceCount - left.occurrenceCount;
    }

    if (left.kind !== right.kind) {
      return left.kind.localeCompare(right.kind);
    }

    return left.normalizedText.localeCompare(right.normalizedText);
  });

  for (const [index, item] of items.entries()) {
    item.frequencyRank = index + 1;
  }

  return {
    items,
    warnings,
  };
}

function buildSummary(
  lines: SubtitleLine[],
  nlpResponse: Awaited<ReturnType<typeof analyzeWithNlpService>>,
  items: WorkflowAnalysisItem[],
) {
  const totalWordCount = buildPlainTextCorpus(lines)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean).length;
  const uniqueLemmaCount = new Set(
    nlpResponse.candidates
      .map((candidate) => normalizeTermText(candidate.lemma || candidate.text))
      .filter(Boolean),
  ).size;
  const selectableItems = items.filter((item) => item.isSelectable);
  const kindCounts = items.reduce<Partial<Record<StoredVocabularyKind, number>>>((acc, item) => {
    acc[item.kind] = (acc[item.kind] ?? 0) + 1;
    return acc;
  }, {});
  const cefrDistribution = selectableItems.reduce<Partial<Record<StoredCefrLevel, number>>>(
    (acc, item) => {
      if (!item.cefrLevel) {
        return acc;
      }

      acc[item.cefrLevel] = (acc[item.cefrLevel] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const cefrValues = selectableItems
    .map((item) => item.cefrNumeric)
    .filter((value): value is number => typeof value === "number");
  const totalDurationSeconds =
    lines.length > 0 ? lines[lines.length - 1].endSeconds - lines[0].startSeconds : 0;

  return {
    totalWordCount,
    uniqueLemmaCount,
    extractedItemCount: items.length,
    selectableItemCount: selectableItems.length,
    kindCounts,
    cefrDistribution,
    averageCefrLevel: averageCefrLevel(cefrValues),
    speechRateWpm:
      totalDurationSeconds > 0 ? Math.round((totalWordCount / totalDurationSeconds) * 60) : null,
    subtitleLineCount: lines.length,
  } satisfies ContentAnalysisSummary;
}

async function resolveVocabularyTerm(item: WorkflowAnalysisItem) {
  const [existing] = await db
    .select()
    .from(vocabularyTerm)
    .where(
      and(
        eq(vocabularyTerm.kind, item.kind),
        eq(vocabularyTerm.normalizedText, item.normalizedText),
      ),
    )
    .limit(1);

  const values = {
    kind: item.kind,
    normalizedText: item.normalizedText,
    lemma: item.lemma,
    displayText: item.displayText,
    partOfSpeech: item.partOfSpeech,
    baseCefrLevel: item.baseCefrLevel,
    baseCefrNumeric: item.baseCefrNumeric,
    notes: item.notes,
  };

  if (existing) {
    const [updated] = await db
      .update(vocabularyTerm)
      .set(values)
      .where(eq(vocabularyTerm.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(vocabularyTerm)
    .values({
      id: crypto.randomUUID(),
      ...values,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    return inserted;
  }

  const [collided] = await db
    .select()
    .from(vocabularyTerm)
    .where(
      and(
        eq(vocabularyTerm.kind, item.kind),
        eq(vocabularyTerm.normalizedText, item.normalizedText),
      ),
    )
    .limit(1);

  if (!collided) {
    throw new Error(`Failed to resolve vocabulary term ${item.kind}:${item.normalizedText}.`);
  }

  return collided;
}

async function persistAnalysisOutput(input: {
  context: WorkflowRunContext;
  items: WorkflowAnalysisItem[];
  warnings: string[];
  summary: ContentAnalysisSummary;
}) {
  const completedAt = new Date();

  await db
    .delete(contentAnalysisItem)
    .where(eq(contentAnalysisItem.analysisRunId, input.context.run.id));

  for (const item of input.items) {
    const term = await resolveVocabularyTerm(item);

    await db.insert(contentAnalysisItem).values({
      id: crypto.randomUUID(),
      analysisRunId: input.context.run.id,
      contentId: input.context.content.id,
      termId: term.id,
      analysisSource: item.analysisSource,
      surfaceForm: item.surfaceForm,
      representativeContext: item.representativeContext,
      contexts: item.contexts,
      occurrenceCount: item.occurrenceCount,
      frequencyRank: item.frequencyRank,
      cefrLevel: item.cefrLevel,
      cefrNumeric: item.cefrNumeric,
      cefrConfidence: item.cefrConfidence,
      cefrNote: item.cefrNote,
      isSelectable: item.isSelectable,
      filteredOutReason: item.filteredOutReason,
      analyzedAt: completedAt,
    });
  }

  const [updated] = await db
    .update(contentAnalysisRun)
    .set({
      status: "completed",
      stage: "completed",
      progressMessage: "Analysis completed.",
      summary: input.summary,
      warnings: input.warnings,
      errorCode: null,
      errorMessage: null,
      completedAt,
    })
    .where(eq(contentAnalysisRun.id, input.context.run.id))
    .returning();

  if (!updated) {
    throw new Error(`Content analysis run ${input.context.run.id} disappeared during save.`);
  }

  await db.insert(contentAnalysisRunEvent).values({
    id: crypto.randomUUID(),
    runId: input.context.run.id,
    stage: "completed",
    message: "Analysis completed.",
    payload: {
      itemCount: input.items.length,
      warningCount: input.warnings.length,
    },
  });
}

async function transitionRun(input: {
  runId: string;
  stage: ContentAnalysisStage;
  message: string;
  payload?: Record<string, unknown>;
  progressMessage?: string;
  warnings?: string[];
  startedAt?: Date | null;
  completedAt?: Date | null;
}) {
  const stageStatus =
    input.stage === "completed" ? "completed" : input.stage === "failed" ? "failed" : "running";

  await recordContentAnalysisRunTransition({
    runId: input.runId,
    status: stageStatus,
    stage: input.stage,
    message: input.message,
    payload: input.payload,
    progressMessage: input.progressMessage,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    warnings: input.warnings,
  });
}

/** Orchestrate the full media analysis pipeline: subtitle fetch → NLP processing → Gemini enrichment → persistence. */
export async function runMediaAnalysisWorkflow(runId: string): Promise<WorkflowResult> {
  const startedAt = new Date();
  let context: WorkflowRunContext | null = null;

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

    await transitionRun({
      runId,
      stage: "fetching_subtitles",
      message: "Fetching subtitles from OpenSubtitles.",
      progressMessage: "Fetching subtitles...",
      startedAt,
    });

    const subtitleCorpus = await buildSubtitleCorpus(context.content);
    const plainTextCorpus = buildPlainTextCorpus(subtitleCorpus.lines);
    const chunks = buildSubtitleChunks(subtitleCorpus.lines);

    logger.info("[media-analysis] subtitles ready", {
      runId,
      subtitleLineCount: subtitleCorpus.lines.length,
      subtitleSourceCount: subtitleCorpus.sourceCount,
      warningCount: subtitleCorpus.warnings.length,
      plainTextCharacters: plainTextCorpus.length,
      chunkCount: chunks.length,
    });

    await transitionRun({
      runId,
      stage: "running_nlp",
      message: "Running NLP analysis on normalized subtitles.",
      progressMessage: "Running subtitle NLP analysis...",
      payload: {
        subtitleLineCount: subtitleCorpus.lines.length,
        subtitleSourceCount: subtitleCorpus.sourceCount,
      },
      warnings: subtitleCorpus.warnings,
    });

    const nlpResponse = await analyzeWithNlpService({
      job_id: runId,
      content: plainTextCorpus,
      content_type: "plain_text",
      pipeline_version: MEDIA_ANALYSIS_PIPELINE_VERSION,
      options: {
        include_propn: false,
        dedup_lines: true,
        batch_size: 200,
      },
    });

    logger.info("[media-analysis] NLP service completed", {
      runId,
      candidateCount: nlpResponse.candidates.length,
      warningCount: nlpResponse.warnings.length,
    });

    await transitionRun({
      runId,
      stage: "running_llm",
      message: "Running phrase extraction across subtitle chunks.",
      progressMessage: "Analyzing subtitle phrases with Gemini...",
      payload: {
        chunkCount: chunks.length,
      },
      warnings: [...subtitleCorpus.warnings, ...nlpResponse.warnings],
    });

    const llmResponses: Array<Awaited<ReturnType<typeof analyzeChunkWithGemini>>> = [];

    for (const chunk of chunks) {
      llmResponses.push(
        await analyzeChunkWithGemini({
          chunkText: chunk.text,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunks.length,
        }),
      );
    }

    logger.info("[media-analysis] phrase analysis completed", {
      runId,
      chunkCount: llmResponses.length,
      warningCount: llmResponses.reduce((count, response) => count + response.warnings.length, 0),
    });

    await transitionRun({
      runId,
      stage: "merging_analysis",
      message: "Merging reusable vocabulary and phrase analysis.",
      progressMessage: "Merging analysis results...",
      payload: {
        nlpCandidateCount: nlpResponse.candidates.length,
        llmChunkCount: llmResponses.length,
      },
      warnings: [...subtitleCorpus.warnings, ...nlpResponse.warnings],
    });

    const merged = mergeAnalysisItems(nlpResponse, llmResponses);
    const summary = buildSummary(subtitleCorpus.lines, nlpResponse, merged.items);
    const warnings = [...subtitleCorpus.warnings, ...merged.warnings];

    logger.info("[media-analysis] merged analysis", {
      runId,
      itemCount: merged.items.length,
      warningCount: warnings.length,
      selectableItemCount: summary.selectableItemCount,
      totalWordCount: summary.totalWordCount,
    });

    await transitionRun({
      runId,
      stage: "saving_analysis",
      message: "Saving reusable analysis output.",
      progressMessage: "Saving reusable analysis...",
      payload: {
        itemCount: merged.items.length,
      },
      warnings,
    });

    await persistAnalysisOutput({
      context,
      items: merged.items,
      warnings,
      summary,
    });

    logger.info("[media-analysis] workflow completed", {
      runId: context.run.id,
      contentId: context.content.id,
      itemCount: merged.items.length,
      warningCount: warnings.length,
    });

    return {
      runId: context.run.id,
      contentId: context.content.id,
      status: "completed",
      summary,
      warningCount: warnings.length,
      itemCount: merged.items.length,
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
        status: "failed",
        stage: "failed",
        message,
        progressMessage: message,
        errorCode: "WORKFLOW_FAILED",
        errorMessage: message,
        completedAt: new Date(),
        payload: { error },
      });
    }

    throw error;
  }
}
