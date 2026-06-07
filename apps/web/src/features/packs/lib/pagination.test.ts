import { describe, expect, it } from "vitest";

import {
  clampPage,
  DEFAULT_PACK_STAGING_PAGE_SIZE,
  getPageRange,
  getPageSlice,
  getPageWindow,
  getTotalPages,
  isPackStagingPageSize,
} from "./pagination";

describe("getTotalPages", () => {
  it("returns at least one page for empty lists", () => {
    expect(getTotalPages(0, 25)).toBe(1);
  });

  it("rounds up partial pages", () => {
    expect(getTotalPages(26, 25)).toBe(2);
    expect(getTotalPages(50, 25)).toBe(2);
    expect(getTotalPages(51, 25)).toBe(3);
  });

  it("guards against non-positive page sizes", () => {
    expect(getTotalPages(10, 0)).toBe(1);
  });
});

describe("clampPage", () => {
  it("clamps to the valid range", () => {
    expect(clampPage(0, 5)).toBe(1);
    expect(clampPage(9, 5)).toBe(5);
    expect(clampPage(3, 5)).toBe(3);
  });

  it("falls back to page one for invalid input", () => {
    expect(clampPage(Number.NaN, 5)).toBe(1);
  });
});

describe("getPageSlice", () => {
  const items = Array.from({ length: 12 }, (_, index) => index + 1);

  it("slices the requested page", () => {
    expect(getPageSlice(items, 2, 5)).toEqual([6, 7, 8, 9, 10]);
  });

  it("returns the last page when the page overflows after items are removed", () => {
    expect(getPageSlice(items.slice(0, 6), 3, 5)).toEqual([6]);
  });

  it("returns an empty slice for an empty list", () => {
    expect(getPageSlice([], 1, 25)).toEqual([]);
  });
});

describe("getPageRange", () => {
  it("returns a 1-based inclusive range", () => {
    expect(getPageRange(2, 25, 240)).toEqual({ start: 26, end: 50 });
  });

  it("caps the end at the total", () => {
    expect(getPageRange(3, 25, 60)).toEqual({ start: 51, end: 60 });
  });

  it("returns a zero range when there is nothing to show", () => {
    expect(getPageRange(1, 25, 0)).toEqual({ start: 0, end: 0 });
  });
});

describe("getPageWindow", () => {
  it("lists every page when the count is small", () => {
    expect(getPageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("windows around the current page", () => {
    expect(getPageWindow(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
  });

  it("anchors the window at the edges", () => {
    expect(getPageWindow(1, 20)).toEqual([1, 2, 3, 4, 5, null, 20]);
    expect(getPageWindow(20, 20)).toEqual([1, null, 16, 17, 18, 19, 20]);
  });
});

describe("page size options", () => {
  it("recognises supported sizes", () => {
    expect(isPackStagingPageSize(DEFAULT_PACK_STAGING_PAGE_SIZE)).toBe(true);
    expect(isPackStagingPageSize(33)).toBe(false);
  });
});
