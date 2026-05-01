export function clampToInt(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
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

export function cefrBadgeClass(level: string | null) {
  if (!level) {
    return "bg-muted text-muted-foreground border-border";
  }
  if (level.startsWith("A")) {
    return "bg-emerald-500/10 text-emerald-700 border-emerald-200/60 dark:text-emerald-200 dark:border-emerald-500/20";
  }
  if (level.startsWith("B")) {
    return "bg-amber-500/10 text-amber-800 border-amber-200/60 dark:text-amber-200 dark:border-amber-500/20";
  }
  return "bg-rose-500/10 text-rose-700 border-rose-200/60 dark:text-rose-200 dark:border-rose-500/20";
}
