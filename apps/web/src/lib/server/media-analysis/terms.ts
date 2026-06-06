import "server-only";

import type { StoredVocabularyKind } from "@/lib/server/db/json-contracts";

/** Canonical catalog form: lowercase, straightened quotes, trimmed punctuation. */
export function normalizeTermText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "")
    .replace(/\s+/g, " ");
}

/** Catalog form of a part of speech: `null` for phrases, which have none. */
export function normalizePartOfSpeech(value: string | null | undefined) {
  return value?.trim().toLowerCase() || null;
}

/**
 * Identity of a vocabulary term. Must stay in sync with the
 * `vocabulary_term_kind_text_pos_unique` constraint.
 */
export function analysisItemKey(
  kind: StoredVocabularyKind,
  normalizedText: string,
  partOfSpeech: string | null,
) {
  return `${kind}:${normalizedText}:${partOfSpeech ?? ""}`;
}
