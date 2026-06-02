/**
 * Extracts initials from a user display name (e.g. "Jane Doe" -> "JD", "Alex" -> "A").
 * Returns fallback ("U") if name is empty or whitespace.
 */
export function getInitials(name?: string | null, fallback = "U"): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Truncates text to maxLen and appends an ellipsis ("...") if truncated.
 */
export function truncateText(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}
