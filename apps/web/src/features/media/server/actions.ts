"use server";

import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import {
  getAnalysisSnapshotByRunId,
  getAnalysisSnapshotForContentTarget,
  getAnalysisSnapshotForRunAndContent,
} from "@/features/media/server/analysis";
import type {
  AnalysisStatusActionResult,
  StartAnalysisActionResult,
  StartAnalysisInput,
} from "@/features/media/types";
import { requireSession } from "@/lib/auth-guards";
import { env } from "@/lib/env";
import { resolveOrCreateContentTarget } from "@/lib/server/media-analysis/content-targets";
import { computeMediaAnalysisPipelineFingerprint } from "@/lib/server/media-analysis/pipeline-fingerprint";
import {
  createOrReuseContentAnalysisRun,
  getContentAnalysisRunByFingerprint,
  recordContentAnalysisRunTransition,
  resetFailedContentAnalysisRunForRetry,
} from "@/lib/server/media-analysis/runs";
import type { analyzeMediaSubtitlesTask } from "@/trigger/analyze-media-subtitles";

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
      success: false,
      message: "Choose a season before starting TV subtitle analysis.",
      analysis: await getAnalysisSnapshotForContentTarget({
        tmdbId: parsed.tmdbId,
        mediaType: parsed.mediaType,
        seasonNumber: parsed.mediaType === "tv" ? (parsed.seasonNumber ?? null) : null,
      }),
    };
  }

  const { fingerprint, descriptor } = computeMediaAnalysisPipelineFingerprint();
  const existing = await getContentAnalysisRunByFingerprint(target.content.id, fingerprint);

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
      success: true,
      analysis: snapshot,
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
      pipelineFingerprint: fingerprint,
      pipelineDescriptor: descriptor,
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
    success: true,
    analysis: snapshot,
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
      success: false,
      message: "Analysis run not found for this media target.",
    };
  }

  return {
    success: true,
    analysis: snapshot,
  };
}
