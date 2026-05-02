import "server-only";

import { and, desc, eq } from "drizzle-orm";
import type { GenerationRequestSnapshot } from "@/lib/server/content-generation/contracts";
import { CONTENT_GENERATION_PIPELINE_VERSION } from "@/lib/server/content-generation/contracts";
import { db } from "@/lib/server/db";
import type { WorkflowEventPayload } from "@/lib/server/db/json-contracts";
import { packGenerationJob, packGenerationJobEvent } from "@/lib/server/db/schema";

export function computePackGenerationIdempotencyKey(input: {
  userId: string;
  contentId: string;
  analysisRunId: string;
  requestSnapshot: GenerationRequestSnapshot;
}) {
  if (input.requestSnapshot.forceRegenerate) {
    return `${input.userId}:${input.contentId}:${crypto.randomUUID()}`;
  }

  return `${input.userId}:${input.contentId}:${CONTENT_GENERATION_PIPELINE_VERSION}`;
}

export async function createOrReusePackGenerationJob(input: {
  userId: string;
  contentId: string;
  analysisRunId: string;
  requestSnapshot: GenerationRequestSnapshot;
  idempotencyKey: string;
}) {
  const existing = await db.query.packGenerationJob.findFirst({
    where: and(
      eq(packGenerationJob.userId, input.userId),
      eq(packGenerationJob.idempotencyKey, input.idempotencyKey),
    ),
  });

  if (existing) {
    return { job: existing, wasCreated: false };
  }

  const [job] = await db
    .insert(packGenerationJob)
    .values({
      id: crypto.randomUUID(),
      userId: input.userId,
      contentId: input.contentId,
      analysisRunId: input.analysisRunId,
      idempotencyKey: input.idempotencyKey,
      requestSnapshot: input.requestSnapshot,
      progressMessage: "Pack generation queued.",
    })
    .returning();

  if (!job) {
    throw new Error("Failed to create pack generation job.");
  }

  await recordPackGenerationJobTransition({
    jobId: job.id,
    status: "queued",
    stage: "queued",
    message: "Pack generation queued.",
  });

  return { job, wasCreated: true };
}

export async function getPackGenerationJobById(jobId: string) {
  return db.query.packGenerationJob.findFirst({
    where: eq(packGenerationJob.id, jobId),
  });
}

export async function getLatestPackGenerationJobForContent(input: {
  userId: string;
  contentId: string;
}) {
  return db.query.packGenerationJob.findFirst({
    where: and(
      eq(packGenerationJob.userId, input.userId),
      eq(packGenerationJob.contentId, input.contentId),
    ),
    orderBy: desc(packGenerationJob.createdAt),
  });
}

export async function resetFailedPackGenerationJobForRetry(
  jobId: string,
  retryMessage: string = "Pack generation retry queued.",
) {
  const existing = await getPackGenerationJobById(jobId);
  if (!existing) {
    throw new Error(`Pack generation job ${jobId} was not found.`);
  }

  if (existing.status !== "failed") {
    return { job: existing, wasReset: false };
  }

  const [updated] = await db
    .update(packGenerationJob)
    .set({
      status: "queued",
      stage: "queued",
      progressMessage: retryMessage,
      errorCode: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    })
    .where(eq(packGenerationJob.id, jobId))
    .returning();

  await db.insert(packGenerationJobEvent).values({
    id: crypto.randomUUID(),
    jobId,
    stage: "queued",
    message: retryMessage,
    payload: {
      retry: true,
    },
  });

  return { job: updated, wasReset: true };
}

export async function recordPackGenerationJobTransition(input: {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  stage:
    | "queued"
    | "selecting_terms"
    | "generating_content"
    | "generating_assets"
    | "saving_pack"
    | "completed"
    | "failed";
  message: string;
  payload?: WorkflowEventPayload;
  errorCode?: string;
  errorMessage?: string;
  triggerWorkflowId?: string;
}) {
  const now = new Date();
  const update: Partial<typeof packGenerationJob.$inferInsert> = {
    status: input.status,
    stage: input.stage,
    progressMessage: input.message,
    updatedAt: now,
  };

  if (input.status === "running") {
    update.startedAt = now;
  }
  if (input.status === "completed" || input.status === "failed") {
    update.completedAt = now;
  }
  if (input.errorCode) {
    update.errorCode = input.errorCode;
  }
  if (input.errorMessage) {
    update.errorMessage = input.errorMessage;
  }
  if (input.triggerWorkflowId) {
    update.triggerWorkflowId = input.triggerWorkflowId;
  }

  await db.update(packGenerationJob).set(update).where(eq(packGenerationJob.id, input.jobId));
  await db.insert(packGenerationJobEvent).values({
    id: crypto.randomUUID(),
    jobId: input.jobId,
    stage: input.stage,
    message: input.message,
    payload: input.payload,
  });
}
