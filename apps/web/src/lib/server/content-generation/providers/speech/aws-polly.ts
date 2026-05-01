import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PollyClient, SynthesizeSpeechCommand, type VoiceId } from "@aws-sdk/client-polly";
import { logger } from "@trigger.dev/sdk";
import { z } from "zod";
import { env } from "@/lib/env";
import type {
  EffectiveGenerationCapabilities,
  GeneratedBinaryArtifact,
  GeneratedTextItem,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";

type SpeechInput = {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
  capabilities: EffectiveGenerationCapabilities;
};

type PollyFixtureItem = {
  analysisItemId: string;
  audioBase64: string;
  requestCharacters?: number;
};

const pollyFixtureSchema = z.object({
  voiceId: z.string().min(1),
  engine: z.enum(["standard", "neural"]),
  items: z.array(
    z.object({
      analysisItemId: z.string().min(1),
      audioBase64: z.string().min(1),
      requestCharacters: z.number().int().nonnegative().optional(),
    }),
  ),
});

function createPollyClient() {
  if (!env.AWS_POLLY_ACCESS_KEY_ID || !env.AWS_POLLY_SECRET_ACCESS_KEY) {
    throw new Error("AWS Polly credentials are required for live or record audio generation.");
  }

  return new PollyClient({
    region: env.AWS_POLLY_REGION,
    credentials: {
      accessKeyId: env.AWS_POLLY_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_POLLY_SECRET_ACCESS_KEY,
    },
  });
}

function audioFingerprint(input: {
  items: { analysisItemId: string; displayText: string }[];
  voiceId: string;
  engine: "standard" | "neural";
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: "aws-polly-audio-v1",
        voiceId: input.voiceId,
        engine: input.engine,
        items: input.items.map((item) => ({
          id: item.analysisItemId,
          text: item.displayText,
        })),
      }),
    )
    .digest("hex");
}

function fixturePath(fingerprint: string) {
  if (!env.CONTENT_GENERATION_RECORDING_DIR) {
    throw new Error("CONTENT_GENERATION_RECORDING_DIR is required for audio replay mode.");
  }

  return path.join(env.CONTENT_GENERATION_RECORDING_DIR, "audio", `${fingerprint}.json`);
}

async function readFixture(fingerprint: string) {
  const filePath = fixturePath(fingerprint);
  return pollyFixtureSchema.parse(JSON.parse(await readFile(filePath, "utf8")));
}

async function writeFixture(input: {
  fingerprint: string;
  voiceId: string;
  engine: "standard" | "neural";
  items: PollyFixtureItem[];
}) {
  if (!env.CONTENT_GENERATION_RECORDING_DIR) {
    return;
  }

  const filePath = path.join(
    env.CONTENT_GENERATION_RECORDING_DIR,
    "audio",
    `${input.fingerprint}.json`,
  );
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    JSON.stringify(
      {
        voiceId: input.voiceId,
        engine: input.engine,
        items: input.items,
      },
      null,
      2,
    ),
  );
}

function bytesFromBase64(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function base64FromBytes(value: Uint8Array) {
  return Buffer.from(value).toString("base64");
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
  capabilities: EffectiveGenerationCapabilities;
  requestCharacters?: number;
}): GeneratedBinaryArtifact {
  return {
    itemKey: input.item.analysisItemId,
    bytes: input.bytes,
    mimeType: "audio/mpeg",
    extension: "mp3",
    metadata: {
      provider: "aws-polly",
      voice: input.capabilities.audioVoice,
      engine: input.capabilities.audioEngine,
      script: input.item.displayText,
      requestCharacters: input.requestCharacters,
    },
  };
}

function buildMockArtifacts(input: SpeechInput) {
  const artifacts = input.selectedItems.map((item) =>
    artifactFromBytes({
      item,
      bytes: new TextEncoder().encode(`mock aws-polly audio for ${item.displayText}`),
      capabilities: input.capabilities,
      requestCharacters: item.displayText.length,
    }),
  );

  logger.info("[content-generation:audio] aws-polly mock artifacts generated", {
    artifactCount: artifacts.length,
  });

  return { artifacts, warnings: [] };
}

function isNonRecoverablePollyError(error: unknown) {
  const name = error instanceof Error ? error.name : undefined;
  return (
    name === "EngineNotSupportedException" ||
    name === "TextLengthExceededException" ||
    name === "InvalidSsmlException" ||
    name === "LanguageNotSupportedException" ||
    name === "LexiconNotFoundException" ||
    name === "MarksNotSupportedForFormatException"
  );
}

function isRecoverablePollyError(error: unknown) {
  const metadata =
    error && typeof error === "object" && "$metadata" in error
      ? (error.$metadata as { httpStatusCode?: number })
      : undefined;
  const statusCode = metadata?.httpStatusCode;
  const name = error instanceof Error ? error.name : undefined;

  return (
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    name === "ServiceFailureException" ||
    name === "TimeoutError" ||
    name === "AbortError" ||
    name === "NetworkingError"
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function synthesizeWithRetry(input: {
  client: PollyClient;
  item: SelectedGenerationItem;
  capabilities: EffectiveGenerationCapabilities;
}) {
  let attempt = 0;

  while (true) {
    try {
      const response = await input.client.send(
        new SynthesizeSpeechCommand({
          Text: input.item.displayText,
          VoiceId: input.capabilities.audioVoice as VoiceId,
          Engine: input.capabilities.audioEngine,
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
      if (isNonRecoverablePollyError(error)) {
        throw error;
      }

      if (attempt >= env.AWS_POLLY_MAX_RETRIES || !isRecoverablePollyError(error)) {
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
    mode: input.capabilities.audioMode,
    voice: input.capabilities.audioVoice,
    engine: input.capabilities.audioEngine,
    selectedItemCount: input.selectedItems.length,
    textItemCount: input.textItems.length,
  });

  if (input.capabilities.audioMode === "mock") {
    return buildMockArtifacts(input);
  }

  const fingerprint = audioFingerprint({
    items: input.selectedItems.map((item) => ({
      analysisItemId: item.analysisItemId,
      displayText: item.displayText,
    })),
    voiceId: input.capabilities.audioVoice,
    engine: input.capabilities.audioEngine,
  });

  if (input.capabilities.audioMode === "replay") {
    logger.info("[content-generation:audio] loading aws-polly replay fixture", { fingerprint });
    const fixture = await readFixture(fingerprint);
    const selectedById = new Map(input.selectedItems.map((item) => [item.analysisItemId, item]));
    const artifacts = fixture.items.flatMap((fixtureItem) => {
      const item = selectedById.get(fixtureItem.analysisItemId);
      if (!item) {
        return [];
      }

      return artifactFromBytes({
        item,
        bytes: bytesFromBase64(fixtureItem.audioBase64),
        capabilities: input.capabilities,
        requestCharacters: fixtureItem.requestCharacters,
      });
    });

    logger.info("[content-generation:audio] aws-polly replay fixture loaded", {
      fingerprint,
      artifactCount: artifacts.length,
    });

    return { artifacts, warnings: [] };
  }

  const client = createPollyClient();
  const results = await mapWithConcurrency(input.selectedItems, env.AWS_POLLY_CONCURRENCY, (item) =>
    synthesizeWithRetry({ client, item, capabilities: input.capabilities }),
  );

  const artifacts: GeneratedBinaryArtifact[] = [];
  const fixtureItems: PollyFixtureItem[] = [];
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
        capabilities: input.capabilities,
        requestCharacters: result.value.requestCharacters,
      }),
    );
    fixtureItems.push({
      analysisItemId: item.analysisItemId,
      audioBase64: base64FromBytes(result.value.bytes),
      requestCharacters: result.value.requestCharacters,
    });
  });

  if (input.capabilities.audioMode === "record") {
    await writeFixture({
      fingerprint,
      voiceId: input.capabilities.audioVoice,
      engine: input.capabilities.audioEngine,
      items: fixtureItems,
    });
    logger.info("[content-generation:audio] aws-polly response recorded", {
      fingerprint,
      itemCount: fixtureItems.length,
    });
  }

  logger.info("[content-generation:audio] aws-polly completed", {
    mode: input.capabilities.audioMode,
    artifactCount: artifacts.length,
    warningCount: warnings.length,
  });

  return { artifacts, warnings };
}
