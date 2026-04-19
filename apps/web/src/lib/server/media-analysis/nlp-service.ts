import "server-only";

import { env } from "@/lib/env";
import {
  type NlpAnalysisRequest,
  nlpAnalysisRequestSchema,
  nlpAnalysisResponseSchema,
} from "@/lib/server/media-analysis/contracts";

type NlpServiceErrorCode = "REQUEST_FAILED" | "INVALID_RESPONSE" | "UNAVAILABLE";

export class NlpServiceClientError extends Error {
  constructor(
    message: string,
    readonly code: NlpServiceErrorCode,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "NlpServiceClientError";
  }
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function readJsonSafely(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function analyzeWithNlpService(input: NlpAnalysisRequest) {
  const payload = nlpAnalysisRequestSchema.parse(input);
  const { signal, clear } = createTimeoutSignal(env.NLP_SERVICE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.NLP_SERVICE_BASE_URL.replace(/\/$/, "")}/api/v1/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal,
      cache: "no-store",
    });
    const raw = await readJsonSafely(response);

    if (!response.ok) {
      throw new NlpServiceClientError(
        "NLP service request failed.",
        response.status >= 500 ? "UNAVAILABLE" : "REQUEST_FAILED",
        response.status,
        raw,
      );
    }

    const parsed = nlpAnalysisResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new NlpServiceClientError(
        "NLP service returned an invalid response contract.",
        "INVALID_RESPONSE",
        response.status,
        parsed.error.flatten(),
      );
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof NlpServiceClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new NlpServiceClientError("NLP service request timed out.", "UNAVAILABLE");
    }

    throw new NlpServiceClientError(
      "NLP service request could not be completed.",
      "UNAVAILABLE",
      undefined,
      error instanceof Error ? error.message : error,
    );
  } finally {
    clear();
  }
}
