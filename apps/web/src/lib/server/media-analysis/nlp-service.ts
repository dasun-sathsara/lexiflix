import "server-only";

import { env } from "@/lib/env";
import {
  type NlpAnalysisRequest,
  nlpAnalysisRequestSchema,
  nlpAnalysisResponseSchema,
} from "@/lib/server/media-analysis/contracts";
import { createTimeoutSignal, readJsonSafely } from "@/lib/server/request-utils";

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
  } finally {
    clear();
  }
}
