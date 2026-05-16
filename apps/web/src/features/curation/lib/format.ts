import { extractYear } from "@/lib/primitives/dates";

export function formatYear(date: string | null) {
  const year = extractYear(date);
  return year !== null ? String(year) : null;
}

export function formatRating(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : null;
}
