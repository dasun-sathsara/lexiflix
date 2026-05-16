/**
 * Formats a date value into a compact relative-time string (e.g. "5m ago", "3h ago", "Yesterday", "2d ago").
 * Returns null for null/undefined input.
 */
export function formatRelativeTime(value: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

/**
 * Extracts the year from a date string.
 * Validates the parsed leading year with Number.isFinite.
 */
export function extractYear(value: string | null): number | null {
  if (!value) return null;
  const year = Number.parseInt(value.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}
