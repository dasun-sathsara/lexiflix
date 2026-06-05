import { VOCABULARY_KIND_LABELS, VOCABULARY_KINDS } from "@/lib/constants";
import type { StoredVocabularyKind } from "@/lib/domain/types";

export { VOCABULARY_KINDS, VOCABULARY_KIND_LABELS };
export function formatVocabularyKindLabel(kind: StoredVocabularyKind) {
  return VOCABULARY_KIND_LABELS[kind];
}
