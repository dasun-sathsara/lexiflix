import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { CONTENT_GENERATION_PIPELINE_VERSION } from "@/lib/constants";
import type {
  ContentGenerationStage,
  GenerationRequestSnapshot,
  PackGenerationStatus,
} from "@/lib/server/content-generation/contracts";
import { db } from "@/lib/server/db";
import type { WorkflowEventPayload } from "@/lib/server/db/json-contracts";
import { packGenerationJob, packGenerationJobEvent, user } from "@/lib/server/db/schema";

export type PackGenerationJobRow = typeof packGenerationJob.$inferSelect;

export function computePackGenerationIdempotencyKey(input: {
  userId: string;
  contentId: string;
  analysisRunId: string;
  requestSnapshot: GenerationRequestSnapshot;
}) {
  if (input.requestSnapshot.forceRegenerate) {
    return `${input.userId}:${input.contentId}:${crypto.randomUUID()}`;
  }

  const snapshot = input.requestSnapshot;
  const signature = [
    snapshot.learnerCefrLevel ?? "auto",
    snapshot.frequencyPreference,
    [...snapshot.selectedVocabularyTypes].sort().join(","),
    snapshot.cefrWindowMode,
    snapshot.packSize,
    snapshot.knownTermHandling,
    snapshot.exampleSentenceCount,
    snapshot.audioVoiceGender,
  ].join("|");

  return `${input.userId}:${input.contentId}:${CONTENT_GENERATION_PIPELINE_VERSION}:${input.analysisRunId}:${signature}`;
}

async function getJobByIdempotencyKey(userId: string, idempotencyKey: string) {
  return db.query.packGenerationJob.findFirst({
    where: and(
      eq(packGenerationJob.userId, userId),
      eq(packGenerationJob.idempotencyKey, idempotencyKey),
    ),
  });
}

async function getGenerationQuota(userId: string) {
  const [quota] = await db
    .select({
      generationLimit: user.generationLimit,
      generationsUsed: user.generationUsageCount,
    })
    .from(user)
    .where(eq(user.id, userId));

  return quota ?? null;
}

function hasExhaustedGenerationQuota(quota: {
  generationLimit: number | null;
  generationsUsed: number;
}) {
  return quota.generationLimit !== null && quota.generationsUsed >= quota.generationLimit;
}

function generationQuotaError(limit: number) {
  return new Error(`You have reached your lifetime generation limit of ${limit.toLocaleString()}.`);
}

export async function createOrReusePackGenerationJob(input: {
  userId: string;
  contentId: string;
  analysisRunId: string;
  requestSnapshot: GenerationRequestSnapshot;
  idempotencyKey: string;
}) {
  const existing = await getJobByIdempotencyKey(input.userId, input.idempotencyKey);
  if (existing) {
    return { job: existing, wasCreated: false };
  }

  const quota = await getGenerationQuota(input.userId);
  if (!quota) {
    throw new Error("User account was not found.");
  }

  if (hasExhaustedGenerationQuota(quota) && quota.generationLimit !== null) {
    // A concurrent request may have consumed the last slot and created this exact job.
    const reused = await getJobByIdempotencyKey(input.userId, input.idempotencyKey);
    if (reused) {
      return { job: reused, wasCreated: false };
    }

    throw generationQuotaError(quota.generationLimit);
  }

  let job: PackGenerationJobRow | undefined;

  try {
    [job] = await db
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
      .onConflictDoNothing({
        target: [packGenerationJob.userId, packGenerationJob.idempotencyKey],
      })
      .returning();
  } catch (error) {
    // A database-side quota trigger can reject the insert; re-check before surfacing the raw error.
    const latestQuota = await getGenerationQuota(input.userId);
    if (
      latestQuota &&
      latestQuota.generationLimit !== null &&
      hasExhaustedGenerationQuota(latestQuota)
    ) {
      throw generationQuotaError(latestQuota.generationLimit);
    }

    throw error;
  }

  if (!job) {
    const reused = await getJobByIdempotencyKey(input.userId, input.idempotencyKey);
    if (!reused) {
      throw new Error("Failed to create pack generation job.");
    }

    return { job: reused, wasCreated: false };
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
    payload: { retry: true },
  });

  return { job: updated, wasReset: true };
}

export async function recordPackGenerationJobTransition(input: {
  jobId: string;
  status: PackGenerationStatus;
  stage: ContentGenerationStage;
  message: string;
  payload?: WorkflowEventPayload;
  errorCode?: string;
  errorMessage?: string;
  triggerWorkflowId?: string;
}) {
  const now = new Date();
  const hasFailed = input.status === "failed";
  const update: Partial<typeof packGenerationJob.$inferInsert> = {
    status: input.status,
    stage: input.stage,
    progressMessage: input.message,
    updatedAt: now,
    errorCode: input.errorCode ?? (hasFailed ? "PACK_GENERATION_FAILED" : undefined),
    errorMessage: input.errorMessage ?? (hasFailed ? input.message : undefined),
  };

  if (input.status === "running") {
    update.startedAt = now;
  }
  if (input.status === "completed" || hasFailed) {
    update.completedAt = now;
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
