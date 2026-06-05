import "server-only";

import { tasks } from "@trigger.dev/sdk";
import { env } from "@/lib/config/env";

type FailureRecorder = (payload: {
  errorCode: "WORKFLOW_TRIGGER_FAILED";
  errorMessage: string;
  payload: { triggerApiUrl: string; triggerSecretConfigured: boolean };
}) => Promise<void>;

/**
 * Dispatches a Trigger.dev task and, on failure, invokes the caller-supplied failure
 * recorder with the standard `WORKFLOW_TRIGGER_FAILED` diagnostics payload, then rethrows.
 */
export async function dispatchTriggerTask<TInput>(
  taskId: string,
  input: TInput,
  recordFailure: FailureRecorder,
): Promise<void> {
  try {
    await tasks.trigger(taskId, input);
  } catch (error) {
    await recordFailure({
      errorCode: "WORKFLOW_TRIGGER_FAILED",
      errorMessage: error instanceof Error ? error.message : "Failed to trigger workflow.",
      payload: {
        triggerApiUrl: process.env.TRIGGER_API_URL ?? "https://api.trigger.dev",
        triggerSecretConfigured: Boolean(env.TRIGGER_SECRET_KEY),
      },
    });
    throw error;
  }
}
