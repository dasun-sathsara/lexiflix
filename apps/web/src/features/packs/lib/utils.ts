/**
 * Formats an elapsed duration in milliseconds into a compact "Xm Ys" / "Ys" label.
 */
export function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/**
 * Formats the due date of a card into a human-readable relative time string.
 */
export function formatDueLabel(value: string | null) {
  if (!value) {
    return "No reviewed cards are scheduled yet.";
  }

  const dueAt = new Date(value);
  const diffMs = dueAt.getTime() - Date.now();
  if (diffMs <= 0) {
    return "Next card is due now.";
  }

  const minutes = Math.ceil(diffMs / (60 * 1000));
  if (minutes < 60) {
    return `Next card is due in ${minutes}m.`;
  }

  const hours = Math.ceil(minutes / 60);
  if (hours < 24) {
    return `Next card is due in ${hours}h.`;
  }

  return `Next card is due in ${Math.ceil(hours / 24)}d.`;
}
