import "server-only";

import { logger } from "@trigger.dev/sdk";
import type {
  GeneratedSpeechArtifact,
  GeneratedTextItem,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";
import type { SpeechSynthesisAdapter } from "@/lib/server/content-generation/providers/speech/port";
import {
  buildSpeechTargets,
  speechArtifactItemKey,
  speechArtifactMetadata,
} from "@/lib/server/content-generation/providers/speech/targets";
import { mapWithConcurrency } from "@/lib/server/utils/concurrency";

export type SpeechArtifactsResult = {
  artifacts: GeneratedSpeechArtifact[];
  warnings: string[];
};

export async function generateSpeechArtifactsWithAdapter(input: {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
  adapter: SpeechSynthesisAdapter;
}): Promise<SpeechArtifactsResult> {
  const targets = buildSpeechTargets(input);

  logger.info(`[content-generation:audio] ${input.adapter.provider} started`, {
    voice: input.adapter.voice,
    selectedItemCount: input.selectedItems.length,
    textItemCount: input.textItems.length,
    targetCount: targets.length,
  });

  const results = await mapWithConcurrency(targets, input.adapter.concurrency, (target) =>
    input.adapter.synthesize(target),
  );
  const artifacts: GeneratedSpeechArtifact[] = [];
  const warnings: string[] = [];

  results.forEach((result, index) => {
    const target = targets[index];

    if (result.status === "rejected") {
      const error =
        result.reason instanceof Error ? result.reason : new Error(String(result.reason));
      logger.warn(`[content-generation:audio] ${input.adapter.provider} item skipped`, {
        analysisItemId: target.analysisItemId,
        speechTarget: target.kind,
        exampleIndex: target.kind === "example_sentence" ? target.exampleIndex : undefined,
        errorName: error.name,
        errorMessage: error.message,
      });
      warnings.push(`Audio skipped for '${target.script}': ${error.message}`);
      return;
    }

    artifacts.push({
      itemKey: speechArtifactItemKey(target),
      bytes: result.value.bytes,
      mimeType: result.value.mimeType,
      extension: result.value.extension,
      metadata: {
        ...result.value.metadata,
        ...speechArtifactMetadata(target),
        requestCharacters: result.value.requestCharacters,
      },
      target,
    });
  });

  logger.info(`[content-generation:audio] ${input.adapter.provider} completed`, {
    artifactCount: artifacts.length,
    warningCount: warnings.length,
  });

  return { artifacts, warnings };
}
