import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { contentAnalysisRun, contentAnalysisRunEvent } from "@/lib/server/db/schema";
import {
  type ContentAnalysisTransitionInput,
  contentAnalysisTransitionSchema,
} from "@/lib/server/media-analysis/contracts";
import type { MediaAnalysisPipelineDescriptor } from "@/lib/server/media-analysis/pipeline-fingerprint";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type ContentAnalysisRunRow = typeof contentAnalysisRun.$inferSelect;

type CreateOrReuseContentAnalysisRunInput = {
  contentId: string;
  pipelineFingerprint: string;
  pipelineDescriptor: MediaAnalysisPipelineDescriptor;
  queuedMessage?: string;
};

type CreateOrReuseContentAnalysisRunResult = {
  run: ContentAnalysisRunRow;
  wasCreated: boolean;
};

async function getContentAnalysisRunById(runId: string, tx: DbTransaction | typeof db = db) {
  const [row] = await tx
    .select()
    .from(contentAnalysisRun)
    .where(eq(contentAnalysisRun.id, runId))
    .limit(1);
  return row ?? null;
}

export async function getContentAnalysisRunByFingerprint(
  contentId: string,
  pipelineFingerprint: string,
  tx: DbTransaction | typeof db = db,
) {
  const [row] = await tx
    .select()
    .from(contentAnalysisRun)
    .where(
      and(
        eq(contentAnalysisRun.contentId, contentId),
        eq(contentAnalysisRun.pipelineFingerprint, pipelineFingerprint),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function createOrReuseContentAnalysisRun(
  input: CreateOrReuseContentAnalysisRunInput,
): Promise<CreateOrReuseContentAnalysisRunResult> {
  return db.transaction(async (tx) => {
    const existing = await getContentAnalysisRunByFingerprint(
      input.contentId,
      input.pipelineFingerprint,
      tx,
    );
    if (existing) {
      return {
        run: existing,
        wasCreated: false,
      };
    }

    const queuedMessage = input.queuedMessage ?? "Analysis queued.";
    const [inserted] = await tx
      .insert(contentAnalysisRun)
      .values({
        id: crypto.randomUUID(),
        contentId: input.contentId,
        status: "queued",
        stage: "queued",
        progressMessage: queuedMessage,
        pipelineFingerprint: input.pipelineFingerprint,
        nlpPipelineVersion: input.pipelineDescriptor.nlpPipelineVersion,
        analysisLlmPipelineVersion: input.pipelineDescriptor.analysisLlmPipelineVersion,
        analysisLlmPromptVersion: input.pipelineDescriptor.analysisLlmPromptVersion,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted) {
      await tx.insert(contentAnalysisRunEvent).values({
        id: crypto.randomUUID(),
        runId: inserted.id,
        stage: "queued",
        message: queuedMessage,
      });

      return {
        run: inserted,
        wasCreated: true,
      };
    }

    const collided = await getContentAnalysisRunByFingerprint(
      input.contentId,
      input.pipelineFingerprint,
      tx,
    );
    if (!collided) {
      throw new Error("Failed to resolve content analysis run after insert collision.");
    }

    return {
      run: collided,
      wasCreated: false,
    };
  });
}

export async function recordContentAnalysisRunTransition(input: ContentAnalysisTransitionInput) {
  const parsed = contentAnalysisTransitionSchema.parse(input);

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(contentAnalysisRun)
      .set({
        status: parsed.status,
        stage: parsed.stage,
        progressMessage: parsed.progressMessage ?? parsed.message,
        errorCode: parsed.errorCode ?? null,
        errorMessage: parsed.errorMessage ?? null,
        startedAt: parsed.startedAt,
        completedAt: parsed.completedAt,
        warnings: parsed.warnings ?? undefined,
      })
      .where(eq(contentAnalysisRun.id, parsed.runId))
      .returning();

    if (!updated) {
      throw new Error(`Content analysis run ${parsed.runId} was not found.`);
    }

    await tx.insert(contentAnalysisRunEvent).values({
      id: crypto.randomUUID(),
      runId: parsed.runId,
      stage: parsed.stage,
      message: parsed.message,
      payload: parsed.payload,
    });

    return updated;
  });
}

export async function resetFailedContentAnalysisRunForRetry(
  runId: string,
  retryMessage: string = "Analysis retry queued.",
) {
  return db.transaction(async (tx) => {
    const existing = await getContentAnalysisRunById(runId, tx);
    if (!existing) {
      throw new Error(`Content analysis run ${runId} was not found.`);
    }

    if (existing.status !== "failed") {
      return {
        run: existing,
        wasReset: false,
      };
    }

    const [updated] = await tx
      .update(contentAnalysisRun)
      .set({
        status: "queued",
        stage: "queued",
        progressMessage: retryMessage,
        errorCode: null,
        errorMessage: null,
        summary: null,
        warnings: null,
        startedAt: null,
        completedAt: null,
      })
      .where(eq(contentAnalysisRun.id, runId))
      .returning();

    await tx.insert(contentAnalysisRunEvent).values({
      id: crypto.randomUUID(),
      runId,
      stage: "queued",
      message: retryMessage,
      payload: {
        retry: true,
      },
    });

    return {
      run: updated,
      wasReset: true,
    };
  });
}
