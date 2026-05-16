import "server-only";

/**
 * Safely converts a Date (or null/undefined) to an ISO string, returning null for falsy input.
 */
export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}
