import "server-only";

import { logger } from "@trigger.dev/sdk";
import type {
  GeneratedBinaryArtifact,
  GeneratedTextItem,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import { createSpeechSynthesisAdapter } from "@/lib/server/content-generation/providers/speech/factory";
import {
  buildSpeechRequests,
  speechArtifactItemKey,
  speechArtifactMetadata,
} from "@/lib/server/content-generation/providers/speech/helpers";
import type {
  ActiveSpeechProviderConfig,
  SpeechProviderConfig,
  SpeechSynthesisAdapter,
} from "@/lib/server/content-generation/providers/speech/port";
import { mapWithConcurrency } from "@/lib/server/utils/concurrency";

type SpeechGenerationInput = {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
  config: SpeechProviderConfig;
};

function providerLabel(provider: ActiveSpeechProviderConfig["provider"]) {
  return provider === "aws-polly" ? "AWS Polly" : "Azure MAI";
}

async function generateWithAdapter(input: {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
  adapter: SpeechSynthesisAdapter;
}): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  const requests = buildSpeechRequests(input);

  logger.info(`[content-generation:audio] ${input.adapter.provider} started`, {
    voice: input.adapter.voice,
    selectedItemCount: input.selectedItems.length,
    textItemCount: input.textItems.length,
    requestCount: requests.length,
  });

  const results = await mapWithConcurrency(requests, input.adapter.concurrency, (request) =>
    input.adapter.synthesize(request.target),
  );
  const artifacts: GeneratedBinaryArtifact[] = [];
  const warnings: string[] = [];

  results.forEach((result, index) => {
    const request = requests[index];
    if (result.status === "rejected") {
      const error =
        result.reason instanceof Error ? result.reason : new Error(String(result.reason));
      logger.warn(`[content-generation:audio] ${input.adapter.provider} item skipped`, {
        analysisItemId: request.target.analysisItemId,
        speechTarget: request.target.kind,
        exampleIndex:
          request.target.kind === "example_sentence" ? request.target.exampleIndex : undefined,
        errorName: error.name,
        errorMessage: error.message,
      });
      warnings.push(`Audio skipped for '${request.target.script}': ${error.message}`);
      return;
    }

    artifacts.push({
      itemKey: speechArtifactItemKey(request.target),
      bytes: result.value.bytes,
      mimeType: result.value.mimeType,
      extension: result.value.extension,
      metadata: {
        ...result.value.metadata,
        ...speechArtifactMetadata(request.target),
        requestCharacters: result.value.requestCharacters,
      },
    });
  });

  logger.info(`[content-generation:audio] ${input.adapter.provider} completed`, {
    artifactCount: artifacts.length,
    warningCount: warnings.length,
  });

  return { artifacts, warnings };
}

export async function generateSpeechArtifacts(
  input: SpeechGenerationInput,
): Promise<{ artifacts: GeneratedBinaryArtifact[]; warnings: string[] }> {
  logger.info("[content-generation:audio] started", {
    enabled: input.config.provider !== "disabled",
    provider: input.config.provider,
    voice: input.config.provider === "disabled" ? undefined : input.config.voice,
    selectedItemCount: input.selectedItems.length,
    textItemCount: input.textItems.length,
  });

  if (input.config.provider === "disabled") {
    logger.info("[content-generation:audio] skipped disabled audio generation", {
      selectedItemCount: input.selectedItems.length,
    });
    return {
      artifacts: [],
      warnings: ["Audio generation is disabled by server capability config."],
    };
  }

  try {
    const adapter = createSpeechSynthesisAdapter(input.config);
    return await generateWithAdapter({
      selectedItems: input.selectedItems,
      textItems: input.textItems,
      adapter,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const label = providerLabel(input.config.provider);
    logger.error(`[content-generation:audio] ${label} fatal integration failure`, {
      error: errorMessage,
    });
    return {
      artifacts: [],
      warnings: [`Audio generation bypassed: ${label} integration failure (${errorMessage})`],
    };
  }
}
