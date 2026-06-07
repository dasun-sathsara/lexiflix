/**
 * Client-side pagination helpers for the pack staging card list.
 * Pure functions so page math stays testable and consistent between hook and UI.
 */

export const PACK_STAGING_PAGE_SIZES = [10, 25, 50, 100] as const;

export type PackStagingPageSize = (typeof PACK_STAGING_PAGE_SIZES)[number];

export const DEFAULT_PACK_STAGING_PAGE_SIZE: PackStagingPageSize = 25;

export function isPackStagingPageSize(value: number): value is PackStagingPageSize {
  return (PACK_STAGING_PAGE_SIZES as readonly number[]).includes(value);
}

/** Total pages for a list; always at least 1 so the UI never renders "page 1 of 0". */
export function getTotalPages(totalItems: number, pageSize: number) {
  if (pageSize <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
}

export function clampPage(page: number, totalPages: number) {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.min(Math.max(1, Math.trunc(page)), Math.max(1, totalPages));
}

export function getPageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  if (pageSize <= 0) {
    return items;
  }

  const safePage = clampPage(page, getTotalPages(items.length, pageSize));
  const start = (safePage - 1) * pageSize;

  return items.slice(start, start + pageSize);
}

/** 1-based inclusive display range, or a zero range for an empty list. */
export function getPageRange(page: number, pageSize: number, totalItems: number) {
  if (totalItems <= 0 || pageSize <= 0) {
    return { start: 0, end: 0 };
  }

  const safePage = clampPage(page, getTotalPages(totalItems, pageSize));
  const start = (safePage - 1) * pageSize + 1;

  return { start, end: Math.min(totalItems, safePage * pageSize) };
}

/**
 * Windowed page numbers with `null` marking an ellipsis gap, e.g.
 * `[1, null, 6, 7, 8, null, 20]`.
 */
export function getPageWindow(page: number, totalPages: number): Array<number | null> {
  const safeTotal = Math.max(1, totalPages);
  const safePage = clampPage(page, safeTotal);

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1);
  }

  if (safePage <= 4) {
    return [1, 2, 3, 4, 5, null, safeTotal];
  }

  if (safePage >= safeTotal - 3) {
    return [1, null, safeTotal - 4, safeTotal - 3, safeTotal - 2, safeTotal - 1, safeTotal];
  }

  return [1, null, safePage - 1, safePage, safePage + 1, null, safeTotal];
}
