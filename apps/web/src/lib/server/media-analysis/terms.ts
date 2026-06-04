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

/** Identity of a vocabulary term inside one analysis run. */
export function analysisItemKey(kind: StoredVocabularyKind, normalizedText: string) {
  return `${kind}:${normalizedText}`;
}
