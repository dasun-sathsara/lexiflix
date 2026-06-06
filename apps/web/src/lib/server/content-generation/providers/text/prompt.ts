import "server-only";

import type {
  GenerationRequestSnapshot,
  SelectedGenerationItem,
} from "@/lib/server/content-generation/contracts";

export function buildTextGenerationPrompt(input: {
  items: SelectedGenerationItem[];
  requestSnapshot: GenerationRequestSnapshot;
}) {
  return [
    "Generate learner-specific English study content for subtitle vocabulary.",
    "Prompt version: content-generation-text-v2.",
    `Learner CEFR: ${input.requestSnapshot.learnerCefrLevel ?? "unknown"}.`,
    `Examples per item: ${input.requestSnapshot.exampleSentenceCount}.`,
    "Meanings must be English-only. Generate new example sentences, not copied subtitle lines.",
    "Use subtitle evidence for grounding, but do not mention internal ids.",
    "Write for the learner's CEFR level:",
    "- Explain each meaning using words and grammar the learner can already read at that level. Keep it to one or two short sentences.",
    "- Example sentences must stay at that level too: no rarer words than the term being taught.",
    "- An item lists every part of speech and usage seen in the subtitles (for example a word used as both verb and noun). Teach the single variant that is most useful for a learner at this CEFR level, and write the meaning and all example sentences for that one variant.",
    "- State the taught variant's part of speech at the start of the meaning when the item has more than one.",
    "For the imageEligibility and imageBrief fields, follow these rules strictly:",
    "- Only mark an item as eligible (imageEligibility.eligible: true) if it is a concrete, easily-visualized vocabulary word (such as concrete nouns, physical actions, animals, objects, or physical settings).",
    "- Do NOT mark abstract concepts (e.g., 'theory', 'aspect', 'justice'), abstract verbs (e.g., 'ponder', 'realize'), adverbs, abstract adjectives (including 'feminine', 'temporary', 'logical'), phrasal verbs, idioms, or slang as eligible under any circumstances.",
    "- Default to FALSE. Only select terms where a clear, direct visual cue is genuinely useful for language learning.",
    "- If eligible is true, the imageBrief must be a clear, simple, concrete visual description (3-4 sentences) of that physical object or setting to serve as a direct visual cue. Avoid abstract concepts, text/words/letters, or complex metaphors.",
    "- If eligible is false, set imageBrief to null.",
    "Return JSON only in the requested schema.",
    input.requestSnapshot.customInstructions
      ? `Custom instructions: ${input.requestSnapshot.customInstructions}`
      : "",
    JSON.stringify({
      items: input.items.map((item) => ({
        analysisItemId: item.analysisItemId,
        termId: item.termId,
        term: item.displayText,
        kind: item.kind,
        partsOfSpeech: item.partsOfSpeech,
        cefrLevel: item.cefrLevel,
        representativeContext: item.representativeContext,
        contexts: item.contexts.slice(0, 3),
      })),
    }),
  ]
    .filter(Boolean)
    .join("\n\n");
}
