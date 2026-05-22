import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { contentAnalysisRun, contentAnalysisRunEvent } from "@/lib/server/db/schema";
import {
  type ContentAnalysisTransitionInput,
  contentAnalysisTransitionSchema,
} from "@/lib/server/media-analysis/contracts";

type ContentAnalysisRunRow = typeof contentAnalysisRun.$inferSelect;

type MediaAnalysisPipelineDescriptor = {
  version: string;
};

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

async function getContentAnalysisRunById(runId: string) {
  const [row] = await db
    .select()
    .from(contentAnalysisRun)
    .where(eq(contentAnalysisRun.id, runId))
    .limit(1);
  return row ?? null;
}

export async function getContentAnalysisRunByFingerprint(
  contentId: string,
  pipelineFingerprint: string,
) {
  const [row] = await db
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
  const existing = await getContentAnalysisRunByFingerprint(
    input.contentId,
    input.pipelineFingerprint,
  );
  if (existing) {
    return {
      run: existing,
      wasCreated: false,
    };
  }

  const queuedMessage = input.queuedMessage ?? "Analysis queued.";
  const [inserted] = await db
    .insert(contentAnalysisRun)
    .values({
      id: crypto.randomUUID(),
      contentId: input.contentId,
      status: "queued",
      stage: "queued",
      progressMessage: queuedMessage,
      pipelineFingerprint: input.pipelineFingerprint,
      nlpPipelineVersion: input.pipelineDescriptor.version,
      analysisLlmPipelineVersion: input.pipelineDescriptor.version,
      analysisLlmPromptVersion: input.pipelineDescriptor.version,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted) {
    await db.insert(contentAnalysisRunEvent).values({
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
  );
  if (!collided) {
    throw new Error("Failed to resolve content analysis run after insert collision.");
  }

  return {
    run: collided,
    wasCreated: false,
  };
}

export async function recordContentAnalysisRunTransition(input: ContentAnalysisTransitionInput) {
  const parsed = contentAnalysisTransitionSchema.parse(input);

  const [updated] = await db
    .update(contentAnalysisRun)
    .set({
      status: parsed.status,
      stage: parsed.stage,
      progressMessage: parsed.progressMessage ?? parsed.message,
      errorCode: parsed.errorCode ?? (parsed.status === "failed" ? "WORKFLOW_FAILED" : null),
      errorMessage: parsed.errorMessage ?? (parsed.status === "failed" ? parsed.message : null),
      startedAt: parsed.startedAt,
      completedAt: parsed.completedAt,
      warnings: parsed.warnings ?? undefined,
    })
    .where(eq(contentAnalysisRun.id, parsed.runId))
    .returning();

  if (!updated) {
    throw new Error(`Content analysis run ${parsed.runId} was not found.`);
  }

  await db.insert(contentAnalysisRunEvent).values({
    id: crypto.randomUUID(),
    runId: parsed.runId,
    stage: parsed.stage,
    message: parsed.message,
    payload: parsed.payload,
  });

  return updated;
}

export async function resetFailedContentAnalysisRunForRetry(
  runId: string,
  retryMessage: string = "Analysis retry queued.",
) {
  const existing = await getContentAnalysisRunById(runId);
  if (!existing) {
    throw new Error(`Content analysis run ${runId} was not found.`);
  }

  if (existing.status !== "failed") {
    return {
      run: existing,
      wasReset: false,
    };
  }

  const [updated] = await db
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

  await db.insert(contentAnalysisRunEvent).values({
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
}
