import "server-only";

import { PollyClient, SynthesizeSpeechCommand, type VoiceId } from "@aws-sdk/client-polly";
import { logger } from "@trigger.dev/sdk";
import { env } from "@/lib/env";
import type {
  GeneratedBinaryArtifact,
  GeneratedTextItem,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";

type PollyConfig = {
  audioVoice: string;
  audioEngine: "standard" | "neural";
};

type SpeechInput = {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
  audioConfig: PollyConfig;
};

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

function artifactFromBytes(input: {
  item: SelectedGenerationItem;
  bytes: Uint8Array;
  audioConfig: PollyConfig;
  requestCharacters?: number;
}): GeneratedBinaryArtifact {
  return {
    itemKey: input.item.analysisItemId,
    bytes: input.bytes,
    mimeType: "audio/mpeg",
    extension: "mp3",
    metadata: {
      provider: "aws-polly",
      voice: input.audioConfig.audioVoice,
      engine: input.audioConfig.audioEngine,
      script: input.item.displayText,
      requestCharacters: input.requestCharacters,
    },
  };
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesizeWithRetry(input: {
  client: PollyClient;
  item: SelectedGenerationItem;
  audioConfig: PollyConfig;
}) {
  let attempt = 0;

  while (true) {
    try {
      const response = await input.client.send(
        new SynthesizeSpeechCommand({
          Text: input.item.displayText,
          VoiceId: input.audioConfig.audioVoice as VoiceId,
          Engine: input.audioConfig.audioEngine,
          OutputFormat: "mp3",
          TextType: "text",
        }),
      );

      return {
        item: input.item,
        bytes: await audioStreamToBytes(response.AudioStream),
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

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await Promise.resolve(mapper(items[currentIndex])).then(
        (value) => ({ status: "fulfilled", value }),
        (reason) => ({ status: "rejected", reason }),
      );
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));

  return results;
}

export async function generateSpeechWithPolly(
  input: SpeechInput,
): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  logger.info("[content-generation:audio] aws-polly started", {
    voice: input.audioConfig.audioVoice,
    engine: input.audioConfig.audioEngine,
    selectedItemCount: input.selectedItems.length,
    textItemCount: input.textItems.length,
  });

  const client = createPollyClient();
  const results = await mapWithConcurrency(input.selectedItems, env.AWS_POLLY_CONCURRENCY, (item) =>
    synthesizeWithRetry({ client, item, audioConfig: input.audioConfig }),
  );

  const artifacts: GeneratedBinaryArtifact[] = [];
  const warnings: string[] = [];

  results.forEach((result, index) => {
    const item = input.selectedItems[index];
    if (result.status === "rejected") {
      const error =
        result.reason instanceof Error ? result.reason : new Error(String(result.reason));
      logger.warn("[content-generation:audio] aws-polly item skipped", {
        analysisItemId: item.analysisItemId,
        errorName: error.name,
        errorMessage: error.message,
      });
      warnings.push(`Audio skipped for '${item.displayText}': ${error.message}`);
      return;
    }

    artifacts.push(
      artifactFromBytes({
        item,
        bytes: result.value.bytes,
        audioConfig: input.audioConfig,
        requestCharacters: result.value.requestCharacters,
      }),
    );
  });

  logger.info("[content-generation:audio] aws-polly completed", {
    artifactCount: artifacts.length,
    warningCount: warnings.length,
  });

  return { artifacts, warnings };
}
