import "server-only";

import { logger } from "@trigger.dev/sdk";
import { delay } from "@/lib/server/utils/async";

const TRANSIENT_STATUS_CODES = new Set([429, 502, 503, 504]);

export async function readJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export type FetchWithRetryOptions = {
  /** Log prefix used for retry diagnostics, e.g. `[nlp-service]`. */
  label: string;
  timeoutMs: number;
  retries?: number;
  backoffMs?: number;
};

/**
 * Performs an outbound request with a per-attempt timeout and exponential backoff on
 * transient failures (network errors and 429/502/503/504 responses).
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: FetchWithRetryOptions,
): Promise<Response> {
  const retries = options.retries ?? 3;
  const backoffMs = options.backoffMs ?? 1_500;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(options.timeoutMs),
      });

      if (response.ok || !TRANSIENT_STATUS_CODES.has(response.status) || attempt === retries) {
        return response;
      }
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
    }

    const waitMs = Math.round(backoffMs * 2 ** (attempt - 1) + Math.random() * 300);
    logger.warn(`${options.label} transient request failure; retrying in ${waitMs}ms`, {
      attempt,
      url,
    });
    await delay(waitMs);
  }

  throw new Error(`${options.label} outbound retries exhausted.`);
}
