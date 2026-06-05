import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildSubtitleChunks } from "./chunks";
import type { SubtitleLine } from "./types";

/**
 * Constants mirrored from lib/constants.ts for test assertions.
 * If these change upstream, these tests will fail and require a deliberate update.
 */
const SUBTITLE_CHUNK_MAX_CHARACTERS = 30_000;
const SUBTITLE_CHUNK_MAX_DURATION_SECONDS = 1_800;

function makeLine(overrides: Partial<SubtitleLine> = {}): SubtitleLine {
  return {
    sourceLabel: "test",
    startSeconds: 0,
    endSeconds: 5,
    text: "Hello world",
    ...overrides,
  };
}

describe("buildSubtitleChunks", () => {
  it("returns an empty array for empty input", () => {
    expect(buildSubtitleChunks([])).toEqual([]);
  });

  it("produces a single chunk for a single line", () => {
    const line = makeLine({ startSeconds: 10, endSeconds: 15, text: "One line" });
    const chunks = buildSubtitleChunks([line]);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({
      chunkIndex: 0,
      startSeconds: 10,
      endSeconds: 15,
      text: "One line",
      lineCount: 1,
    });
  });

  it("accumulates lines within budget into one chunk", () => {
    const lines: SubtitleLine[] = [
      makeLine({ startSeconds: 0, endSeconds: 3, text: "First" }),
      makeLine({ startSeconds: 3, endSeconds: 6, text: "Second" }),
      makeLine({ startSeconds: 6, endSeconds: 9, text: "Third" }),
    ];
    const chunks = buildSubtitleChunks(lines);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].lineCount).toBe(3);
    expect(chunks[0].text).toBe("First\nSecond\nThird");
    expect(chunks[0].startSeconds).toBe(0);
    expect(chunks[0].endSeconds).toBe(9);
  });

  it("flushes when adding a line would exceed SUBTITLE_CHUNK_MAX_CHARACTERS", () => {
    // First line uses exactly the budget minus 1 (accounting for the +1 per-line separator)
    // So the second line would push past the limit.
    const bigText = "x".repeat(SUBTITLE_CHUNK_MAX_CHARACTERS - 1);
    const lines: SubtitleLine[] = [
      makeLine({ startSeconds: 0, endSeconds: 5, text: bigText }),
      makeLine({ startSeconds: 5, endSeconds: 10, text: "overflow" }),
    ];
    const chunks = buildSubtitleChunks(lines);

    // First line alone: currentCharacters = bigText.length + 1 = SUBTITLE_CHUNK_MAX_CHARACTERS
    // Adding second line: nextCharacters = 30000 + 8 + 1 = 30009 > 30000 → flush
    expect(chunks).toHaveLength(2);
    expect(chunks[0].lineCount).toBe(1);
    expect(chunks[0].text).toBe(bigText);
    expect(chunks[1].lineCount).toBe(1);
    expect(chunks[1].text).toBe("overflow");
  });

  it("does NOT flush when next line exactly hits the character limit", () => {
    // Two lines whose combined characters (including separator) is exactly at budget
    // Line 1: text.length = 14999, after adding: currentCharacters = 15000
    // Line 2: text.length = 14999, nextCharacters = 15000 + 14999 + 1 = 30000 → NOT > budget
    const halfText = "a".repeat(14_999);
    const lines: SubtitleLine[] = [
      makeLine({ startSeconds: 0, endSeconds: 5, text: halfText }),
      makeLine({ startSeconds: 5, endSeconds: 10, text: halfText }),
    ];
    const chunks = buildSubtitleChunks(lines);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].lineCount).toBe(2);
  });

  it("flushes when adding a line would exceed SUBTITLE_CHUNK_MAX_DURATION_SECONDS", () => {
    const lines: SubtitleLine[] = [
      makeLine({ startSeconds: 0, endSeconds: 100, text: "Start" }),
      // This line's endSeconds exceeds the duration budget from chunk start
      makeLine({
        startSeconds: 100,
        endSeconds: SUBTITLE_CHUNK_MAX_DURATION_SECONDS + 1,
        text: "Over duration",
      }),
    ];
    const chunks = buildSubtitleChunks(lines);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].text).toBe("Start");
    expect(chunks[1].text).toBe("Over duration");
  });

  it("does NOT flush when next line exactly hits the duration limit", () => {
    const lines: SubtitleLine[] = [
      makeLine({ startSeconds: 0, endSeconds: 100, text: "Start" }),
      // endSeconds - startSeconds[0] = 1800 → not > 1800
      makeLine({
        startSeconds: 100,
        endSeconds: SUBTITLE_CHUNK_MAX_DURATION_SECONDS,
        text: "At limit",
      }),
    ];
    const chunks = buildSubtitleChunks(lines);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].lineCount).toBe(2);
  });

  it("assigns sequential chunkIndex values", () => {
    // Force multiple chunks via duration
    const lines: SubtitleLine[] = [
      makeLine({ startSeconds: 0, endSeconds: 1000, text: "A" }),
      makeLine({
        startSeconds: 1000,
        endSeconds: SUBTITLE_CHUNK_MAX_DURATION_SECONDS + 1,
        text: "B",
      }),
      makeLine({
        startSeconds: SUBTITLE_CHUNK_MAX_DURATION_SECONDS + 1,
        endSeconds: 2 * SUBTITLE_CHUNK_MAX_DURATION_SECONDS + 2,
        text: "C",
      }),
    ];
    const chunks = buildSubtitleChunks(lines);

    expect(chunks).toHaveLength(3);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks[2].chunkIndex).toBe(2);
  });

  it("propagates startSeconds from first line and endSeconds from last line of each chunk", () => {
    const lines: SubtitleLine[] = [
      makeLine({ startSeconds: 5, endSeconds: 20, text: "First" }),
      makeLine({ startSeconds: 20, endSeconds: 45, text: "Second" }),
      makeLine({ startSeconds: 45, endSeconds: 80, text: "Third" }),
    ];
    const chunks = buildSubtitleChunks(lines);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].startSeconds).toBe(5);
    expect(chunks[0].endSeconds).toBe(80);
  });
});
