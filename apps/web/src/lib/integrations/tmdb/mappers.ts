/**
 * Shared TMDB-to-domain normalization helpers.
 *
 * These are generic transformation utilities used by multiple features when
 * mapping TMDB detail responses into application-level shapes (curated snapshots,
 * media detail views, etc.). Feature-specific fields remain in their respective
 * feature modules.
 */

/**
 * Derives the decade bucket (e.g. 2010) from a release year.
 * Returns null for falsy input.
 */
export function extractDecade(year: number | null): number | null {
  if (!year) {
    return null;
  }

  return Math.floor(year / 10) * 10;
}

/**
 * Safely formats a number to a fixed-decimal string, returning null for non-numbers.
 */
export function toNumericString(
  value: number | null | undefined,
  fractionDigits: number,
): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return value.toFixed(fractionDigits);
}

/**
 * Returns the first non-empty trimmed string from the provided list, or null.
 */
export function pickFirstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}
