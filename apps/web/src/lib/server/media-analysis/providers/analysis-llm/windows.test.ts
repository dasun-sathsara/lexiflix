import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildPromptWindows, cleanCueText, formatWindowTimestamp } from "./windows";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1_000;

function timestamp(milliseconds: number): string {
  const totalMs = Math.max(0, Math.floor(milliseconds));
  const millis = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

/** Builds a minimal SRT document from `[startMs, text]` pairs. */
function srt(cues: [number, string][]): string {
  return cues
    .map(
      ([startMs, text], index) =>
        `${index + 1}\n${timestamp(startMs)} --> ${timestamp(startMs + 2_000)}\n${text}\n`,
    )
    .join("\n");
}

describe("buildPromptWindows", () => {
  it("returns no windows for blank input", () => {
    expect(buildPromptWindows("")).toEqual([]);
    expect(buildPromptWindows("   \n\n  ")).toEqual([]);
  });

  it("keeps a short film in one window", () => {
    const windows = buildPromptWindows(
      srt([
        [0, "Hello there."],
        [60_000, "Long time no see."],
      ]),
    );

    expect(windows).toHaveLength(1);
    expect(windows[0]).toMatchObject({
      index: 0,
      startMs: 0,
      text: "Hello there.\nLong time no see.",
    });
  });

  it("splits cues into 15-minute windows of media time", () => {
    const windows = buildPromptWindows(
      srt([
        [0, "first chunk opener"],
        [14 * 60_000, "still first chunk"],
        [16 * 60_000, "second chunk"],
        [29 * 60_000, "still second chunk"],
        [31 * 60_000, "third chunk"],
      ]),
    );

    expect(windows.map((window) => window.text)).toEqual([
      "first chunk opener\nstill first chunk",
      "second chunk\nstill second chunk",
      "third chunk",
    ]);
    expect(windows.map((window) => window.index)).toEqual([0, 1, 2]);
  });

  it("anchors window boundaries to whole windows even across silent gaps", () => {
    const windows = buildPromptWindows(
      srt([
        [0, "opening line"],
        // Nothing for over half an hour: the next cue belongs to the third window.
        [32 * 60_000, "after the gap"],
        [44 * 60_000, "same window as the gap line"],
        [46 * 60_000, "fourth window"],
      ]),
    );

    expect(windows.map((window) => window.text)).toEqual([
      "opening line",
      "after the gap\nsame window as the gap line",
      "fourth window",
    ]);
  });

  it("reports the covered media time range per window", () => {
    const windows = buildPromptWindows(
      srt([
        [5_000, "one"],
        [20 * 60_000, "two"],
      ]),
    );

    expect(windows[0]).toMatchObject({ startMs: 5_000, endMs: 7_000 });
    expect(windows[1]).toMatchObject({ startMs: 20 * 60_000, endMs: 20 * 60_000 + 2_000 });
  });

  it("splits a dialogue-dense window further to respect the character budget", () => {
    const windows = buildPromptWindows(
      srt([
        [0, "aaaa"],
        [1_000, "bbbb"],
        [2_000, "cccc"],
      ]),
      { maxCharacters: 10 },
    );

    expect(windows.map((window) => window.text)).toEqual(["aaaa\nbbbb", "cccc"]);
  });

  it("honours a custom window duration", () => {
    const windows = buildPromptWindows(
      srt([
        [0, "one"],
        [4 * 60_000, "two"],
        [6 * 60_000, "three"],
      ]),
      { windowMs: 5 * 60_000 },
    );

    expect(windows.map((window) => window.text)).toEqual(["one\ntwo", "three"]);
  });

  it("drops subtitle markup, bracketed sound cues and release credits", () => {
    const windows = buildPromptWindows(
      srt([
        [0, "<i>Careful</i> now."],
        [3_000, "[door slams]"],
        [6_000, "Subtitles by OpenSubtitles.org"],
        [9_000, "- Get out of here."],
      ]),
    );

    expect(windows).toHaveLength(1);
    expect(windows[0].text).toBe("Careful now.\nGet out of here.");
  });

  it("orders windows by media time even when cues are out of order", () => {
    const windows = buildPromptWindows(
      srt([
        [20 * 60_000, "later"],
        [1_000, "earlier"],
      ]),
    );

    expect(windows.map((window) => window.text)).toEqual(["earlier", "later"]);
  });

  it("never drops dialogue", () => {
    const cues: [number, string][] = Array.from({ length: 200 }, (_, index) => [
      index * 20_000,
      `line ${index}`,
    ]);
    const windows = buildPromptWindows(srt(cues));

    expect(windows.length).toBeGreaterThan(1);
    expect(windows.flatMap((window) => window.text.split("\n"))).toEqual(
      cues.map(([, text]) => text),
    );
  });

  it("falls back to character windows when the input has no timestamps", () => {
    const windows = buildPromptWindows("aaaa\nbbbb\ncccc", { maxCharacters: 10 });

    expect(windows.map((window) => window.text)).toEqual(["aaaa\nbbbb", "cccc"]);
    expect(windows.every((window) => window.endMs === 0)).toBe(true);
  });

  it("emits a window even when a single cue exceeds the character budget", () => {
    const longLine = "x".repeat(50);
    const windows = buildPromptWindows(srt([[0, longLine]]), { maxCharacters: 10 });

    expect(windows.map((window) => window.text)).toEqual([longLine]);
  });

  it("uses 15 minutes as the default window duration", () => {
    const windows = buildPromptWindows(
      srt([
        [0, "one"],
        [FIFTEEN_MINUTES_MS - 1_000, "two"],
        [FIFTEEN_MINUTES_MS + 1_000, "three"],
      ]),
    );

    expect(windows.map((window) => window.text)).toEqual(["one\ntwo", "three"]);
  });
});

describe("cleanCueText", () => {
  it("collapses whitespace and removes presentation markup", () => {
    expect(cleanCueText("<font color='#fff'>Hey</font>   {\\an8}there  [laughs]")).toBe(
      "Hey there",
    );
  });
});

describe("formatWindowTimestamp", () => {
  it("formats milliseconds as HH:MM:SS", () => {
    expect(formatWindowTimestamp(0)).toBe("00:00:00");
    expect(formatWindowTimestamp(FIFTEEN_MINUTES_MS)).toBe("00:15:00");
    expect(formatWindowTimestamp(3_723_000)).toBe("01:02:03");
  });
});
