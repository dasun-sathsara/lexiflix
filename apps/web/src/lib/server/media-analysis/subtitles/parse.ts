import "server-only";

import SrtParser from "srt-parser-2";
import type { SubtitleLine } from "@/lib/server/media-analysis/subtitles/types";

const parser = new SrtParser();

/** Parses SRT text into dialogue lines, dropping blank cues. */
export function parseSrtText(sourceLabel: string, subtitleText: string): SubtitleLine[] {
  const lines: SubtitleLine[] = [];

  for (const cue of parser.fromSrt(subtitleText)) {
    const text = cue.text.trim();
    if (!text) {
      continue;
    }

    lines.push({
      sourceLabel,
      startSeconds: cue.startSeconds,
      endSeconds: cue.endSeconds,
      text,
    });
  }

  return lines;
}

export function buildPlainTextCorpus(lines: SubtitleLine[]) {
  return lines.map((line) => line.text).join("\n");
}
