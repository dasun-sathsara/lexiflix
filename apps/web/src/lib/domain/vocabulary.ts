import type { StoredVocabularyKind } from "@/lib/server/db/json-contracts";

export const VOCABULARY_KIND_LABELS: Record<StoredVocabularyKind, string> = {
  word: "Words",
  phrasal_verb: "Phrasal verbs",
  idiom: "Idioms",
  slang: "Slang",
};

export const VOCABULARY_KINDS: StoredVocabularyKind[] = ["word", "phrasal_verb", "idiom", "slang"];

export function formatVocabularyKindLabel(kind: StoredVocabularyKind) {
  return VOCABULARY_KIND_LABELS[kind];
}
