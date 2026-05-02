"use server";

import { tasks } from "@trigger.dev/sdk";
import { z } from "zod";
import { requireSession } from "@/lib/auth-guards";
import { env } from "@/lib/env";
import {
  recordPackGenerationJobTransition,
  resetFailedPackGenerationJobForRetry,
} from "@/lib/server/content-generation/jobs";
import { generateContentPackTask } from "@/trigger/generate-content-pack";
import type {
  ListPackGenerationJobsActionResult,
  PackGenerationProgressActionResult,
  PackGenerationRetryActionResult,
} from "../types";
import { getPackGenerationProgressView, listPackGenerationProgressForDecks } from "./queries";

const jobInputSchema = z.object({
  jobId: z.string().min(1),
  includeEvents: z.boolean().optional(),
});

export async function getPackGenerationProgressAction(
  input: z.input<typeof jobInputSchema>,
): Promise<PackGenerationProgressActionResult> {
  const session = await requireSession();
  const parsed = jobInputSchema.parse(input);
  const generation = await getPackGenerationProgressView({
    userId: session.user.id,
    jobId: parsed.jobId,
    includeEvents: parsed.includeEvents ?? false,
  });

  if (!generation) {
    return { ok: false, error: "Generation job was not found." };
  }

  return { ok: true, data: { generation } };
}

export async function listGenerationJobsAction(): Promise<ListPackGenerationJobsActionResult> {
  const session = await requireSession();
  return {
    ok: true,
    data: {
      jobs: await listPackGenerationProgressForDecks({ userId: session.user.id }),
    },
  };
}

const retryInputSchema = z.object({
  jobId: z.string().min(1),
});

export async function retryPackGenerationAction(
  input: z.input<typeof retryInputSchema>,
): Promise<PackGenerationRetryActionResult> {
  const session = await requireSession();
  const parsed = retryInputSchema.parse(input);

  const generation = await getPackGenerationProgressView({
    userId: session.user.id,
    jobId: parsed.jobId,
  });

  if (!generation) {
    return { ok: false, error: "Generation job was not found." };
  }

  if (generation.status !== "failed") {
    return { ok: false, error: "This generation job is not in a failed state." };
  }

  const reset = await resetFailedPackGenerationJobForRetry(parsed.jobId);

  if (!reset.wasReset) {
    return { ok: false, error: "Failed to reset the generation job for retry." };
  }

  try {
    await tasks.trigger<typeof generateContentPackTask>("generate-content-pack", { jobId: parsed.jobId });
  } catch (error) {
    await recordPackGenerationJobTransition({
      jobId: parsed.jobId,
      status: "failed",
      stage: "failed",
      message: "Failed to trigger pack generation retry.",
      errorCode: "WORKFLOW_TRIGGER_FAILED",
      errorMessage:
        error instanceof Error ? error.message : "Failed to trigger pack generation retry.",
      payload: {
        triggerApiUrl: process.env.TRIGGER_API_URL ?? "https://api.trigger.dev",
        triggerSecretConfigured: Boolean(env.TRIGGER_SECRET_KEY),
      },
    });
    throw error;
  }

  const updated = await getPackGenerationProgressView({
    userId: session.user.id,
    jobId: parsed.jobId,
    includeEvents: true,
  });

  if (!updated) {
    return { ok: false, error: "Generation job disappeared after retry was queued." };
  }

  return { ok: true, data: { generation: updated } };
}
