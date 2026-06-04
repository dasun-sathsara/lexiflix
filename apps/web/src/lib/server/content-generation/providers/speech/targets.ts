import "server-only";

import type {
  GeneratedTextItem,
  SelectedGenerationItem,
  SpeechArtifactTarget,
} from "@/lib/server/content-generation/contracts";

/**
 * Expands selected pack items into the speech targets LexiFlix wants narrated:
 * one clip per term plus one clip per generated example sentence.
 */
export function buildSpeechTargets(input: {
  selectedItems: SelectedGenerationItem[];
  textItems: GeneratedTextItem[];
}): SpeechArtifactTarget[] {
  const textByItemId = new Map(input.textItems.map((item) => [item.analysisItemId, item]));
  const targets: SpeechArtifactTarget[] = [];

  for (const item of input.selectedItems) {
    targets.push({
      kind: "term",
      analysisItemId: item.analysisItemId,
      script: item.displayText,
    });

    const generated = textByItemId.get(item.analysisItemId);
    for (const [exampleIndex, example] of (generated?.exampleSentences ?? []).entries()) {
      targets.push({
        kind: "example_sentence",
        analysisItemId: item.analysisItemId,
        exampleIndex,
        script: example,
      });
    }
  }

  return targets;
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
