import "server-only";

import { PHRASE_VOCABULARY_KINDS } from "@/lib/constants";

export function buildPhraseExtractionPrompt(input: {
  chunkText: string;
  chunkIndex: number;
  totalChunks: number;
}) {
  return `
You are classifying reusable subtitle-analysis phrases for LexiFlix.

Only return structured JSON. Do not add prose.

Chunk ${input.chunkIndex + 1} of ${input.totalChunks}.

Extract only these reusable kinds:
${PHRASE_VOCABULARY_KINDS.map((kind) => `- ${kind}`).join("\n")}

Rules:
- Ignore single-word vocabulary. NLP owns that.
- Ignore filler and very basic expressions.
- Normalize each phrase to its canonical English form.
- Keep only items that would help an English learner studying movie or TV dialogue.
- representativeContext should be a short direct excerpt from the input chunk when possible.
- If nothing qualifies, return an empty array.

Subtitle chunk:
${input.chunkText}
`.trim();
}
