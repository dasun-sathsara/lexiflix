import "server-only";

import { PHRASE_VOCABULARY_KINDS } from "@/lib/constants";
import {
  formatWindowTimestamp,
  type PromptWindow,
} from "@/lib/server/media-analysis/providers/analysis-llm/windows";

export function buildPhraseExtractionPrompt(input: { window: PromptWindow; totalWindows: number }) {
  const { window } = input;
  const coverage =
    window.endMs > 0
      ? `Covers ${formatWindowTimestamp(window.startMs)}–${formatWindowTimestamp(window.endMs)} of the runtime.`
      : "";

  return `
You are classifying reusable subtitle-analysis phrases for LexiFlix.

Only return structured JSON. Do not add prose.

Chunk ${window.index + 1} of ${input.totalWindows}. ${coverage}

Extract only these reusable kinds:
${PHRASE_VOCABULARY_KINDS.map((kind) => `- ${kind}`).join("\n")}

Rules:
- Ignore single-word vocabulary. NLP owns that.
- Ignore filler and very basic expressions.
- Normalize each phrase to its canonical English form.
- Keep only items that would help an English learner studying movie or TV dialogue.
- representativeContext should be a short direct excerpt from the input text when possible.
- If nothing qualifies, return an empty array.

Dialogue lines:
${window.text}
`.trim();
}
