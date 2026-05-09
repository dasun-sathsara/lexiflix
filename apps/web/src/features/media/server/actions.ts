"use server";

import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import {
  getAnalysisSnapshotByRunId,
  getAnalysisSnapshotForRunAndContent,
  getPackGenerationSnapshotByJobId,
} from "@/features/media/server/analysis";
import type {
  AnalysisStatusActionResult,
  PackGenerationStatusActionResult,
  StartAnalysisActionResult,
  StartAnalysisInput,
  StartPackGenerationActionResult,
  StartPackGenerationInput,
} from "@/features/media/types";
import { PUBLIC_GENERATION_FAILURE_MESSAGE } from "@/features/pack-generation/lib/status";
import { getSettingsPreferences } from "@/features/settings/server/preferences";
import { requireSession } from "@/lib/auth-guards";
import { env } from "@/lib/env";
import { generationRequestSchema } from "@/lib/server/content-generation/contracts";
import {
  computePackGenerationIdempotencyKey,
  createOrReusePackGenerationJob,
  recordPackGenerationJobTransition,
} from "@/lib/server/content-generation/jobs";
import { resolveOrCreateContentTarget } from "@/lib/server/media-analysis/content-targets";
import { MEDIA_ANALYSIS_PIPELINE_VERSION } from "@/lib/server/media-analysis/contracts";
import {
  createOrReuseContentAnalysisRun,
  getContentAnalysisRunByFingerprint,
  recordContentAnalysisRunTransition,
  resetFailedContentAnalysisRunForRetry,
} from "@/lib/server/media-analysis/runs";
import type { analyzeMediaSubtitlesTask } from "@/trigger/analyze-media-subtitles";
import type { generateContentPackTask } from "@/trigger/generate-content-pack";

const startAnalysisInputSchema = z.discriminatedUnion("mediaType", [
  z.object({
    mediaType: z.literal("movie"),
    tmdbId: z.number().int().positive(),
  }),
  z.object({
    mediaType: z.literal("tv"),
    tmdbId: z.number().int().positive(),
    seasonNumber: z.number().int().positive().nullable().optional(),
  }),
]);

const statusInputSchema = z.object({
  runId: z.string().min(1),
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
  seasonNumber: z.number().int().positive().nullable().optional(),
});

const startGenerationInputSchema = startAnalysisInputSchema.and(
  z.object({
    request: generationRequestSchema.partial().extend({
      forceRegenerate: z.boolean().optional(),
    }),
  }),
);

const generationStatusInputSchema = z.object({
  jobId: z.string().min(1),
});

const MEDIA_ANALYSIS_FINGERPRINT = `media-analysis:${MEDIA_ANALYSIS_PIPELINE_VERSION}`;

async function triggerAnalysisRun(runId: string) {
  try {
    await tasks.trigger<typeof analyzeMediaSubtitlesTask>("analyze-media-subtitles", { runId });
  } catch (error) {
    await recordContentAnalysisRunTransition({
      runId,
      status: "failed",
      stage: "failed",
      message: "Failed to trigger reusable subtitle analysis.",
      progressMessage: "Failed to trigger reusable subtitle analysis.",
      errorCode: "WORKFLOW_TRIGGER_FAILED",
      errorMessage:
        error instanceof Error ? error.message : "Failed to trigger reusable subtitle analysis.",
      completedAt: new Date(),
      payload: {
        triggerApiUrl: process.env.TRIGGER_API_URL ?? "https://api.trigger.dev",
        triggerSecretConfigured: Boolean(env.TRIGGER_SECRET_KEY),
      },
    });

    throw error;
  }
}

async function triggerPackGenerationJob(jobId: string) {
  try {
    await tasks.trigger<typeof generateContentPackTask>("generate-content-pack", { jobId });
  } catch (error) {
    await recordPackGenerationJobTransition({
      jobId,
      status: "failed",
      stage: "failed",
      message: "Failed to trigger pack generation.",
      errorCode: "WORKFLOW_TRIGGER_FAILED",
      errorMessage: error instanceof Error ? error.message : PUBLIC_GENERATION_FAILURE_MESSAGE,
      payload: {
        triggerApiUrl: process.env.TRIGGER_API_URL ?? "https://api.trigger.dev",
        triggerSecretConfigured: Boolean(env.TRIGGER_SECRET_KEY),
      },
    });
  }
}

export async function startAnalysisAction(
  input: StartAnalysisInput,
): Promise<StartAnalysisActionResult> {
  await requireSession();

  const parsed = startAnalysisInputSchema.parse(input);
  const target = await resolveOrCreateContentTarget({
    mediaType: parsed.mediaType,
    tmdbId: parsed.tmdbId,
    ...(parsed.mediaType === "tv" && parsed.seasonNumber
      ? { seasonNumber: parsed.seasonNumber }
      : {}),
  });

  if (target.status !== "resolved") {
    return {
      ok: false,
      error: "Choose a season before starting TV subtitle analysis.",
    };
  }

  const existing = await getContentAnalysisRunByFingerprint(
    target.content.id,
    MEDIA_ANALYSIS_FINGERPRINT,
  );

  if (
    existing?.status === "completed" ||
    existing?.status === "queued" ||
    existing?.status === "running"
  ) {
    const snapshot = await getAnalysisSnapshotByRunId(existing.id);
    if (!snapshot) {
      throw new Error(
        `Content analysis run ${existing.id} disappeared before it could be returned.`,
      );
    }

    return {
      ok: true,
      data: { analysis: snapshot },
    };
  }

  let runId: string;
  let shouldTrigger = false;

  if (existing?.status === "failed") {
    const resetRun = await resetFailedContentAnalysisRunForRetry(existing.id);
    runId = resetRun.run.id;
    shouldTrigger = resetRun.wasReset;
  } else {
    const created = await createOrReuseContentAnalysisRun({
      contentId: target.content.id,
      pipelineFingerprint: MEDIA_ANALYSIS_FINGERPRINT,
      pipelineDescriptor: { version: MEDIA_ANALYSIS_PIPELINE_VERSION },
      queuedMessage: "Subtitle analysis queued.",
    });
    runId = created.run.id;
    shouldTrigger = created.wasCreated;
  }

  if (shouldTrigger) {
    await triggerAnalysisRun(runId);
  }

  const snapshot = await getAnalysisSnapshotByRunId(runId);
  if (!snapshot) {
    throw new Error(`Content analysis run ${runId} disappeared after being triggered.`);
  }

  return {
    ok: true,
    data: { analysis: snapshot },
  };
}

export async function getAnalysisStatusAction(input: {
  runId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  seasonNumber?: number | null;
}): Promise<AnalysisStatusActionResult> {
  await requireSession();

  const parsed = statusInputSchema.parse(input);
  const snapshot = await getAnalysisSnapshotForRunAndContent({
    runId: parsed.runId,
    tmdbId: parsed.tmdbId,
    mediaType: parsed.mediaType,
    seasonNumber: parsed.seasonNumber ?? null,
  });

  if (!snapshot) {
    return {
      ok: false,
      error: "Analysis run not found for this media target.",
    };
  }

  return {
    ok: true,
    data: { analysis: snapshot },
  };
}

export async function startPackGenerationAction(
  input: StartPackGenerationInput,
): Promise<StartPackGenerationActionResult> {
  const session = await requireSession();
  const parsed = startGenerationInputSchema.parse(input);
  const target = await resolveOrCreateContentTarget({
    mediaType: parsed.mediaType,
    tmdbId: parsed.tmdbId,
    ...(parsed.mediaType === "tv" && parsed.seasonNumber
      ? { seasonNumber: parsed.seasonNumber }
      : {}),
  });

  if (target.status !== "resolved") {
    return { ok: false, error: "Choose a season before generating a pack." };
  }

  const analysisRun = await getContentAnalysisRunByFingerprint(
    target.content.id,
    MEDIA_ANALYSIS_FINGERPRINT,
  );
  if (!analysisRun || analysisRun.status !== "completed") {
    return {
      ok: false,
      error: "Reusable subtitle analysis must complete before pack generation.",
    };
  }

  const preferences = await getSettingsPreferences(session.user.id);
  const requestSnapshot = generationRequestSchema.parse({
    learnerCefrLevel: parsed.request.learnerCefrLevel ?? null,
    frequencyPreference: parsed.request.frequencyPreference ?? preferences.frequencyPreference,
    selectedVocabularyTypes:
      parsed.request.selectedVocabularyTypes ?? preferences.studyVocabularyTypes,
    cefrWindowMode: parsed.request.cefrWindowMode ?? preferences.generationCefrWindowMode,
    packSize: parsed.request.packSize ?? preferences.generationPackSizeDefault,
    knownTermHandling: parsed.request.knownTermHandling ?? preferences.generationKnownTermHandling,
    audioVoiceGender:
      parsed.request.audioVoiceGender ?? preferences.generationAudioVoiceGenderDefault,
    exampleSentenceCount:
      parsed.request.exampleSentenceCount ?? preferences.generationExampleSentenceCount,
    customInstructions:
      parsed.request.customInstructions ?? preferences.generationCustomInstructionsDefault,
    forceRegenerate: parsed.request.forceRegenerate ?? false,
  });

  const idempotencyKey = computePackGenerationIdempotencyKey({
    userId: session.user.id,
    contentId: target.content.id,
    analysisRunId: analysisRun.id,
    requestSnapshot,
  });

  const { job, wasCreated } = await createOrReusePackGenerationJob({
    userId: session.user.id,
    contentId: target.content.id,
    analysisRunId: analysisRun.id,
    requestSnapshot,
    idempotencyKey,
  });

  if (wasCreated) {
    await triggerPackGenerationJob(job.id);
  }

  const generation = await getPackGenerationSnapshotByJobId({
    userId: session.user.id,
    jobId: job.id,
  });

  if (!generation) {
    throw new Error(`Pack generation job ${job.id} disappeared after creation.`);
  }

  return { ok: true, data: { generation } };
}

export async function getPackGenerationStatusAction(input: {
  jobId: string;
}): Promise<PackGenerationStatusActionResult> {
  const session = await requireSession();
  const parsed = generationStatusInputSchema.parse(input);
  const generation = await getPackGenerationSnapshotByJobId({
    userId: session.user.id,
    jobId: parsed.jobId,
  });

  if (!generation) {
    return { ok: false, error: "Pack generation job was not found." };
  }

  return { ok: true, data: { generation } };
}
