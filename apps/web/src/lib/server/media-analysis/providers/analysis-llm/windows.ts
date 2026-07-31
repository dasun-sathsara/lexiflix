import "server-only";

import { ANALYSIS_LLM_WINDOW_CHARACTERS, ANALYSIS_LLM_WINDOW_MS } from "@/lib/constants";

/**
 * One chunk of subtitle dialogue handed to the analysis LLM.
 *
 * `startMs`/`endMs` are media timestamps taken from the subtitle cues, so a window maps to
 * a real stretch of the film rather than an arbitrary offset in the file.
 */
export type PromptWindow = {
  /** Zero-based position of the window in the timeline. */
  index: number;
  startMs: number;
  endMs: number;
  /** Cleaned dialogue lines, one cue per line. */
  text: string;
};

type Cue = {
  startMs: number;
  endMs: number;
  text: string;
};

const TIMESTAMP_LINE =
  /^\s*(\d{1,3}):([0-5]\d):([0-5]\d)[,.](\d{1,3})\s*-->\s*(\d{1,3}):([0-5]\d):([0-5]\d)[,.](\d{1,3})/;

/** Release credits and site plugs that add nothing but cost prompt budget. */
const METADATA_SNIPPETS = [
  "opensubtitles",
  "subscene",
  "tvsubtitles",
  "yify",
  "yts",
  "http://",
  "https://",
  "www.",
  "subtitles by",
  "subtitle by",
  "synced by",
  "resync by",
  "corrected by",
  "translated by",
  "encoded by",
  "downloaded from",
];

function toMilliseconds(hours: string, minutes: string, seconds: string, fraction: string): number {
  const millis = Number(fraction.padEnd(3, "0").slice(0, 3));

  return Number(hours) * 3_600_000 + Number(minutes) * 60_000 + Number(seconds) * 1_000 + millis;
}

/**
 * Strips subtitle presentation markup so the model reads dialogue only. Mirrors the
 * cleaning the NLP service applies to the same input (`clean_subtitle_text`).
 */
export function cleanCueText(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/^[-–—]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isMetadataLine(text: string): boolean {
  const normalized = text.toLowerCase();

  return METADATA_SNIPPETS.some((snippet) => normalized.includes(snippet));
}

/** Parses SRT/VTT-style cue blocks. Blocks without a timestamp line are ignored. */
function parseCues(subtitleText: string): Cue[] {
  const lines = subtitleText.split(/\r?\n/);
  const cues: Cue[] = [];

  let current: Cue | null = null;
  let buffer: string[] = [];
  /** Set once a blank line closes the current cue block, so the next cue number is ignored. */
  let textClosed = false;

  const flush = () => {
    if (!current) {
      return;
    }

    const text = cleanCueText(buffer.join(" "));
    if (text && !isMetadataLine(text)) {
      cues.push({ ...current, text });
    }

    current = null;
    buffer = [];
    textClosed = false;
  };

  for (const line of lines) {
    const match = TIMESTAMP_LINE.exec(line);

    if (match) {
      flush();
      current = {
        startMs: toMilliseconds(match[1], match[2], match[3], match[4]),
        endMs: toMilliseconds(match[5], match[6], match[7], match[8]),
        text: "",
      };
      continue;
    }

    if (!current || textClosed) {
      continue;
    }

    if (!line.trim()) {
      // A blank line ends the cue block; the cue number that follows is not dialogue.
      if (buffer.length > 0) {
        textClosed = true;
      }
      continue;
    }

    buffer.push(line);
  }

  flush();

  return cues.sort((a, b) => a.startMs - b.startMs);
}

/**
 * Splits subtitles into fixed-duration windows of dialogue.
 *
 * Windows follow media time (15 minutes by default) so each prompt covers one coherent
 * stretch of the story instead of an arbitrary slice of the file. `maxCharacters` stays as
 * a safety valve: dialogue-dense films can exceed the model context inside a single time
 * window, and such a window is split further rather than truncated.
 *
 * Input that carries no parseable cues (already-normalized plain text) falls back to
 * line-boundary character windows so callers keep working.
 */
export function buildPromptWindows(
  subtitleText: string,
  options: { windowMs?: number; maxCharacters?: number } = {},
): PromptWindow[] {
  const windowMs = options.windowMs ?? ANALYSIS_LLM_WINDOW_MS;
  const maxCharacters = options.maxCharacters ?? ANALYSIS_LLM_WINDOW_CHARACTERS;
  const cues = parseCues(subtitleText);

  if (cues.length === 0) {
    return buildCharacterWindows(subtitleText, maxCharacters);
  }

  const windows: PromptWindow[] = [];

  let lines: string[] = [];
  let characters = 0;
  let windowStartMs = cues[0].startMs;
  let windowEndMs = cues[0].endMs;
  let boundaryMs = windowStartMs + windowMs;

  const flush = () => {
    if (lines.length === 0) {
      return;
    }

    windows.push({
      index: windows.length,
      startMs: windowStartMs,
      endMs: windowEndMs,
      text: lines.join("\n"),
    });

    lines = [];
    characters = 0;
  };

  for (const cue of cues) {
    const cost = cue.text.length + 1;
    const crossesTimeBoundary = cue.startMs >= boundaryMs;
    const exceedsBudget = characters > 0 && characters + cost > maxCharacters;

    if (crossesTimeBoundary || exceedsBudget) {
      flush();
      windowStartMs = cue.startMs;
      windowEndMs = cue.endMs;

      if (crossesTimeBoundary) {
        // Re-anchor to whole windows from the first cue so timings stay predictable.
        while (cue.startMs >= boundaryMs) {
          boundaryMs += windowMs;
        }
      }
    }

    lines.push(cue.text);
    characters += cost;
    windowEndMs = Math.max(windowEndMs, cue.endMs);
  }

  flush();

  return windows;
}

/** Fallback for subtitle input without timestamps: split on line boundaries only. */
function buildCharacterWindows(subtitleText: string, maxCharacters: number): PromptWindow[] {
  const lines = subtitleText.split(/\r?\n/);
  const windows: PromptWindow[] = [];

  let current: string[] = [];
  let characters = 0;

  const flush = () => {
    const text = current.join("\n").trim();
    if (text) {
      windows.push({ index: windows.length, startMs: 0, endMs: 0, text });
    }
    current = [];
    characters = 0;
  };

  for (const line of lines) {
    const cost = line.length + 1;

    if (characters > 0 && characters + cost > maxCharacters) {
      flush();
    }

    current.push(line);
    characters += cost;
  }

  flush();

  return windows;
}

/** `HH:MM:SS` label for prompts and logs. */
export function formatWindowTimestamp(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
