import "server-only";

import {
  SUBTITLE_CHUNK_MAX_CHARACTERS,
  SUBTITLE_CHUNK_MAX_DURATION_SECONDS,
} from "@/lib/constants";
import type { SubtitleChunk, SubtitleLine } from "@/lib/server/media-analysis/subtitles/types";

/**
 * Groups subtitle lines into LLM-sized chunks, flushing whenever the next line would
 * exceed the duration or character budget.
 */
export function buildSubtitleChunks(lines: SubtitleLine[]): SubtitleChunk[] {
  const chunks: SubtitleChunk[] = [];

  let currentLines: SubtitleLine[] = [];
  let currentCharacters = 0;

  const flush = () => {
    if (currentLines.length === 0) {
      return;
    }

    chunks.push({
      chunkIndex: chunks.length,
      startSeconds: currentLines[0].startSeconds,
      endSeconds: currentLines[currentLines.length - 1].endSeconds,
      text: currentLines.map((line) => line.text).join("\n"),
      lineCount: currentLines.length,
    });
    currentLines = [];
    currentCharacters = 0;
  };

  for (const line of lines) {
    const nextCharacters = currentCharacters + line.text.length + 1;
    const nextDuration =
      currentLines.length === 0 ? 0 : line.endSeconds - currentLines[0].startSeconds;
    const exceedsBudget =
      currentLines.length > 0 &&
      (nextDuration > SUBTITLE_CHUNK_MAX_DURATION_SECONDS ||
        nextCharacters > SUBTITLE_CHUNK_MAX_CHARACTERS);

    if (exceedsBudget) {
      flush();
    }

    currentLines.push(line);
    currentCharacters += line.text.length + 1;
  }

  flush();

  return chunks;
}
