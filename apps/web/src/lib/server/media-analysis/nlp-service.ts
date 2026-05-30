import "server-only";

import { logger } from "@trigger.dev/sdk";

import { env } from "@/lib/env";
import {
  type NlpAnalysisRequest,
  nlpAnalysisRequestSchema,
  nlpAnalysisResponseSchema,
} from "@/lib/server/media-analysis/contracts";
import { createTimeoutSignal, readJsonSafely } from "@/lib/server/request-utils";

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  retries = 3,
  backoffMs = 1500,
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const { signal, clear } = createTimeoutSignal(timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal });

      if (response.ok) {
        return response;
      }

      // Retry only on transient errors (429, 502, 503, 504)
      if (![429, 502, 503, 504].includes(response.status) || attempt === retries) {
        return response;
      }
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
    } finally {
      clear();
    }

    const jitter = Math.random() * 300;
    const delayTime = backoffMs * 2 ** (attempt - 1) + jitter;
    logger.warn(
      `[nlp-service] Transient request error. Retrying in ${Math.round(delayTime)}ms...`,
      {
        attempt,
        url,
      },
    );
    await new Promise((resolve) => setTimeout(resolve, delayTime));
  }
  throw new Error("Outbound retries exhausted.");
}

export async function analyzeWithNlpService(input: NlpAnalysisRequest) {
  const payload = nlpAnalysisRequestSchema.parse(input);

  try {
    const response = await fetchWithRetry(
      `${env.NLP_SERVICE_BASE_URL.replace(/\/$/, "")}/api/v1/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${env.NLP_SERVICE_API_KEY}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
      env.NLP_SERVICE_REQUEST_TIMEOUT_MS,
    );
    const raw = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error("NLP service request failed.");
    }

    const parsed = nlpAnalysisResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("NLP service returned an invalid response contract.");
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("NLP service request timed out.");
    }

    throw new Error(
      error instanceof Error ? error.message : "NLP service request could not be completed.",
    );
  }
}
