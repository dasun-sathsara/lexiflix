import "server-only";

import { env } from "@/lib/config/env";
import {
  type NlpAnalysisRequest,
  type NlpAnalysisResponse,
  nlpAnalysisRequestSchema,
  nlpAnalysisResponseSchema,
} from "@/lib/integrations/nlp-service/contracts";
import { fetchWithRetry, readJsonSafely } from "@/lib/server/utils/request";

export type {
  NlpAnalysisRequest,
  NlpAnalysisResponse,
  NlpVocabularyCandidate,
} from "@/lib/integrations/nlp-service/contracts";

export async function analyzeWithNlpService(
  input: NlpAnalysisRequest,
): Promise<NlpAnalysisResponse> {
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
      { label: "[nlp-service]", timeoutMs: env.NLP_SERVICE_REQUEST_TIMEOUT_MS },
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
