import "server-only";

import { PHRASE_VOCABULARY_KINDS } from "@/lib/constants";

export function buildPhraseExtractionPrompt(input: {
  windowText: string;
  windowIndex: number;
  totalWindows: number;
}) {
  return `
You are classifying reusable subtitle-analysis phrases for LexiFlix.

Only return structured JSON. Do not add prose.

Window ${input.windowIndex + 1} of ${input.totalWindows}.

Extract only these reusable kinds:
${PHRASE_VOCABULARY_KINDS.map((kind) => `- ${kind}`).join("\n")}

Rules:
- Ignore single-word vocabulary. NLP owns that.
- Ignore filler and very basic expressions.
- Normalize each phrase to its canonical English form.
- Keep only items that would help an English learner studying movie or TV dialogue.
- representativeContext should be a short direct excerpt from the input text when possible.
- If nothing qualifies, return an empty array.

Subtitle text:
${input.windowText}
`.trim();
}
