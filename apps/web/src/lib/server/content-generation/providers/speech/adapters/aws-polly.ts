import "server-only";

import { PollyClient, SynthesizeSpeechCommand, type VoiceId } from "@aws-sdk/client-polly";
import { env } from "@/lib/config/env";
import type { SpeechArtifactTarget } from "@/lib/server/content-generation/contracts";
import { delay } from "@/lib/server/content-generation/providers/speech/helpers";
import type {
  ActiveSpeechProviderConfig,
  SpeechSynthesisAdapter,
} from "@/lib/server/content-generation/providers/speech/port";

type AwsPollyConfig = Extract<ActiveSpeechProviderConfig, { provider: "aws-polly" }>;

function createPollyClient() {
  if (!env.AWS_POLLY_ACCESS_KEY_ID || !env.AWS_POLLY_SECRET_ACCESS_KEY) {
    throw new Error("AWS Polly credentials are required for audio generation.");
  }

  return new PollyClient({
    region: env.AWS_POLLY_REGION,
    credentials: {
      accessKeyId: env.AWS_POLLY_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_POLLY_SECRET_ACCESS_KEY,
    },
  });
}

async function audioStreamToBytes(stream: unknown) {
  if (stream instanceof Uint8Array) {
    return stream;
  }

  if (stream instanceof Blob) {
    return new Uint8Array(await stream.arrayBuffer());
  }

  if (stream && typeof stream === "object" && Symbol.asyncIterator in stream) {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array | Buffer | string>) {
      chunks.push(
        typeof chunk === "string" ? new TextEncoder().encode(chunk) : new Uint8Array(chunk),
      );
    }
    return new Uint8Array(Buffer.concat(chunks));
  }

  throw new Error("AWS Polly response did not include a readable audio stream.");
}

function isPollyRetryable(error: unknown): boolean {
  const name = error instanceof Error ? error.name : undefined;
  const fatal = new Set([
    "EngineNotSupportedException",
    "TextLengthExceededException",
    "InvalidSsmlException",
    "LanguageNotSupportedException",
  ]);
  return !fatal.has(name ?? "");
}

async function synthesizeWithRetry(input: {
  client: PollyClient;
  target: SpeechArtifactTarget;
  config: AwsPollyConfig;
}): Promise<{ bytes: Uint8Array; requestCharacters?: number }> {
  let attempt = 0;

  while (true) {
    try {
      const response = await input.client.send(
        new SynthesizeSpeechCommand({
          Text: input.target.script,
          VoiceId: input.config.voice as VoiceId,
          Engine: input.config.engine,
          OutputFormat: "mp3",
          TextType: "text",
        }),
      );
      const bytes = await audioStreamToBytes(response.AudioStream);
      return {
        bytes,
        requestCharacters: response.RequestCharacters,
      };
    } catch (error) {
      if (attempt >= env.AWS_POLLY_MAX_RETRIES || !isPollyRetryable(error)) {
        throw error;
      }

      attempt += 1;
      await delay(250 * 2 ** (attempt - 1));
    }
  }
}

export function createAwsPollySpeechAdapter(config: AwsPollyConfig): SpeechSynthesisAdapter {
  const client = createPollyClient();

  return {
    provider: "aws-polly",
    voice: config.voice,
    concurrency: env.AWS_POLLY_CONCURRENCY,
    async synthesize(target) {
      const result = await synthesizeWithRetry({ client, target, config });

      return {
        bytes: result.bytes,
        mimeType: "audio/mpeg",
        extension: "mp3",
        requestCharacters: result.requestCharacters,
        metadata: {
          provider: "aws-polly",
          voice: config.voice,
          engine: config.engine,
        },
      };
    },
  };
}
