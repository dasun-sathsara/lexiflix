import "server-only";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

import { env } from "@/lib/config/env";
import type { SpeechArtifactTarget } from "@/lib/server/content-generation/contracts";
import { delay } from "@/lib/server/content-generation/providers/speech/helpers";
import type {
  ActiveSpeechProviderConfig,
  SpeechSynthesisAdapter,
} from "@/lib/server/content-generation/providers/speech/port";

type AzureMaiConfig = Extract<ActiveSpeechProviderConfig, { provider: "azure-mai" }>;

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

function isAzureRetryable(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

async function synthesizeWithRetry(input: {
  target: SpeechArtifactTarget;
  config: AzureMaiConfig;
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
        voice: input.config.voice,
        style: input.config.style,
        text: input.target.script,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      return new Uint8Array(await response.arrayBuffer());
    }

    const errorBody = (await response.text()).slice(0, 500);
    if (attempt >= env.AZURE_SPEECH_MAX_RETRIES || !isAzureRetryable(response.status)) {
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

export function createAzureMaiSpeechAdapter(config: AzureMaiConfig): SpeechSynthesisAdapter {
  if (!env.AZURE_SPEECH_API_KEY) {
    throw new Error("AZURE_SPEECH_API_KEY is required for Azure MAI audio generation.");
  }

  return {
    provider: "azure-mai",
    voice: config.voice,
    concurrency: env.AZURE_SPEECH_CONCURRENCY,
    async synthesize(target) {
      return {
        bytes: await synthesizeWithRetry({ target, config }),
        mimeType: "audio/mpeg",
        extension: "mp3",
        requestCharacters: target.script.length,
        metadata: {
          provider: "azure-mai",
          model: "MAI-Voice-1",
          voice: config.voice,
          style: config.style,
          region: env.AZURE_SPEECH_REGION,
          outputFormat: AZURE_TTS_OUTPUT_FORMAT,
        },
      };
    },
  };
}
