import { IMAGE_BASE_URL, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";

export function buildPosterUrl(path: string | null) {
  if (!path) return null;
  return `${IMAGE_BASE_URL}${TMDB_IMAGE_SIZES.poster.md}${path}`;
}

export function buildBackdropUrl(path: string | null) {
  if (!path) return null;
  return `${IMAGE_BASE_URL}${TMDB_IMAGE_SIZES.backdrop.lg}${path}`;
}

export function formatYear(date: string | null) {
  if (!date) return null;
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(year) ? String(year) : null;
}

export function formatRating(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : null;
}
