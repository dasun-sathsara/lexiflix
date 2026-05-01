import "server-only";

import { logger } from "@trigger.dev/sdk";
import { env } from "@/lib/env";
import type {
  GeneratedBinaryArtifact,
  GeneratedTextItem,
  SelectedGenerationItem,
  SpeechArtifactTarget,
} from "@/lib/server/content-generation/contracts";
import {
  buildSpeechRequests,
  delay,
  mapWithConcurrency,
  type SpeechSynthesisRequest,
  speechArtifactItemKey,
  speechArtifactMetadata,
} from "@/lib/server/content-generation/providers/speech/helpers";

type AzureMaiConfig = {
  audioVoice: string;
  audioStyle: string;
};

type SpeechInput = {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
  audioConfig: AzureMaiConfig;
};

const AZURE_TTS_OUTPUT_FORMAT = "audio-24khz-160kbitrate-mono-mp3";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildSsml(input: { voice: string; style: string; text: string }) {
  const escapedText = escapeXml(input.text);
  const escapedVoice = escapeXml(input.voice);
  const escapedStyle = escapeXml(input.style);

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US"><voice name="${escapedVoice}"><mstts:express-as style="${escapedStyle}">${escapedText}</mstts:express-as></voice></speak>`;
}

function createEndpoint() {
  return `https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
}

function artifactFromBytes(input: {
  target: SpeechArtifactTarget;
  bytes: Uint8Array;
  audioConfig: AzureMaiConfig;
  requestCharacters: number;
}): GeneratedBinaryArtifact {
  return {
    itemKey: speechArtifactItemKey(input.target),
    bytes: input.bytes,
    mimeType: "audio/mpeg",
    extension: "mp3",
    metadata: {
      ...speechArtifactMetadata(input.target),
      provider: "azure-mai",
      model: "MAI-Voice-1",
      voice: input.audioConfig.audioVoice,
      style: input.audioConfig.audioStyle,
      region: env.AZURE_SPEECH_REGION,
      outputFormat: AZURE_TTS_OUTPUT_FORMAT,
      requestCharacters: input.requestCharacters,
    },
  };
}

function isAzureRetryable(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

async function synthesizeWithRetry(input: {
  request: SpeechSynthesisRequest;
  audioConfig: AzureMaiConfig;
}) {
  let attempt = 0;

  while (true) {
    const response = await fetch(createEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/ssml+xml",
        "Ocp-Apim-Subscription-Key": env.AZURE_SPEECH_API_KEY ?? "",
        "User-Agent": "lexiflix-content-generation",
        "X-Microsoft-OutputFormat": AZURE_TTS_OUTPUT_FORMAT,
      },
      body: buildSsml({
        voice: input.audioConfig.audioVoice,
        style: input.audioConfig.audioStyle,
        text: input.request.target.script,
      }),
    });

    if (response.ok) {
      return {
        request: input.request,
        bytes: new Uint8Array(await response.arrayBuffer()),
        requestCharacters: input.request.target.script.length,
      };
    }

    const errorBody = (await response.text()).slice(0, 500);
    const retryable = isAzureRetryable(response.status);
    if (attempt >= env.AZURE_SPEECH_MAX_RETRIES || !retryable) {
      throw new Error(
        `Azure MAI TTS failed with HTTP ${response.status}${errorBody ? `: ${errorBody}` : ""}`,
      );
    }

    attempt += 1;
    const retryAfterSeconds = Number(response.headers.get("retry-after"));
    const retryAfterMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : null;
    await delay(retryAfterMs ?? 300 * 2 ** (attempt - 1));
  }
}

export async function generateSpeechWithAzureMai(
  input: SpeechInput,
): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  if (!env.AZURE_SPEECH_API_KEY) {
    throw new Error("AZURE_SPEECH_API_KEY is required for Azure MAI audio generation.");
  }

  const requests = buildSpeechRequests(input);

  logger.info("[content-generation:audio] azure-mai started", {
    voice: input.audioConfig.audioVoice,
    style: input.audioConfig.audioStyle,
    region: env.AZURE_SPEECH_REGION,
    selectedItemCount: input.selectedItems.length,
    textItemCount: input.textItems.length,
    requestCount: requests.length,
  });

  const results = await mapWithConcurrency(requests, env.AZURE_SPEECH_CONCURRENCY, (request) =>
    synthesizeWithRetry({ request, audioConfig: input.audioConfig }),
  );

  const artifacts: GeneratedBinaryArtifact[] = [];
  const warnings: string[] = [];

  results.forEach((result, index) => {
    const request = requests[index];
    if (result.status === "rejected") {
      const error =
        result.reason instanceof Error ? result.reason : new Error(String(result.reason));
      logger.warn("[content-generation:audio] azure-mai item skipped", {
        analysisItemId: request.target.analysisItemId,
        speechTarget: request.target.kind,
        exampleIndex:
          request.target.kind === "example_sentence" ? request.target.exampleIndex : undefined,
        errorMessage: error.message,
      });
      warnings.push(`Audio skipped for '${request.target.script}': ${error.message}`);
      return;
    }

    artifacts.push(
      artifactFromBytes({
        target: result.value.request.target,
        bytes: result.value.bytes,
        audioConfig: input.audioConfig,
        requestCharacters: result.value.requestCharacters,
      }),
    );
  });

  logger.info("[content-generation:audio] azure-mai completed", {
    artifactCount: artifacts.length,
    warningCount: warnings.length,
  });

  return { artifacts, warnings };
}
