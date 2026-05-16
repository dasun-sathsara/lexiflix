export { mapWithConcurrency } from "@/lib/server/concurrency";

import "server-only";

import type {
  GeneratedTextItem,
  SelectedGenerationItem,
  SpeechArtifactTarget,
} from "@/lib/server/content-generation/contracts";

export type SpeechSynthesisRequest = {
  item: SelectedGenerationItem;
  target: SpeechArtifactTarget;
};

export function buildSpeechRequests(input: {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
}): SpeechSynthesisRequest[] {
  const textByItemId = new Map(input.textItems.map((item) => [item.analysisItemId, item]));
  const requests: SpeechSynthesisRequest[] = [];

  for (const item of input.selectedItems) {
    requests.push({
      item,
      target: {
        kind: "term",
        analysisItemId: item.analysisItemId,
        script: item.displayText,
      },
    });

    const generated = textByItemId.get(item.analysisItemId);
    for (const [exampleIndex, example] of (generated?.exampleSentences ?? []).entries()) {
      requests.push({
        item,
        target: {
          kind: "example_sentence",
          analysisItemId: item.analysisItemId,
          exampleIndex,
          script: example,
        },
      });
    }
  }

  return requests;
}

export function speechArtifactItemKey(target: SpeechArtifactTarget) {
  if (target.kind === "term") {
    return `${target.analysisItemId}__term`;
  }

  return `${target.analysisItemId}__example_${target.exampleIndex + 1}`;
}

export function speechArtifactMetadata(target: SpeechArtifactTarget) {
  return {
    speechTarget: target.kind,
    analysisItemId: target.analysisItemId,
    exampleIndex: target.kind === "example_sentence" ? target.exampleIndex : undefined,
    script: target.script,
  };
}

export function getSpeechArtifactTarget(metadata: Record<string, unknown>) {
  const speechTarget = metadata.speechTarget;
  const analysisItemId = metadata.analysisItemId;

  if (speechTarget !== "term" && speechTarget !== "example_sentence") {
    return null;
  }

  if (typeof analysisItemId !== "string" || analysisItemId.length === 0) {
    return null;
  }

  const exampleIndex =
    speechTarget === "example_sentence" && typeof metadata.exampleIndex === "number"
      ? metadata.exampleIndex
      : null;

  return {
    speechTarget,
    analysisItemId,
    exampleIndex,
  };
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
