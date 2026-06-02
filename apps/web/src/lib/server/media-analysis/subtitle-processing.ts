import "server-only";

import SrtParser from "srt-parser-2";

import {
  downloadSubtitleFile,
  type OpenSubtitlesSubtitleResult,
  searchOpenSubtitles,
} from "@/lib/server/media-analysis/opensubtitles";

export type SubtitleLine = {
  sourceLabel: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type SubtitleChunk = {
  chunkIndex: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
  lineCount: number;
};

export type SubtitleCorpus = {
  lines: SubtitleLine[];
  rawSrtText: string;
  warnings: string[];
  sourceCount: number;
};

export type SubtitleContentContext = {
  id: string;
  kind: string;
  title: string;
  tmdbMovieId: number | null;
  tmdbShowId: number | null;
  tmdbSeasonNumber: number | null;
  episodeCount: number | null;
};

const parser = new SrtParser();

const MAX_SUBTITLE_SEARCH_PAGES = 3;
const MAX_CHUNK_DURATION_SECONDS = 1_800;
const MAX_CHUNK_CHARACTERS = 30_000;

export function sortSubtitleCandidates(
  left: OpenSubtitlesSubtitleResult,
  right: OpenSubtitlesSubtitleResult,
) {
  const leftScore = left.downloadCount ?? 0;
  const rightScore = right.downloadCount ?? 0;

  if ((left.hearingImpaired ?? false) !== (right.hearingImpaired ?? false)) {
    return left.hearingImpaired ? 1 : -1;
  }

  return rightScore - leftScore;
}

export async function searchMovieSubtitle(content: SubtitleContentContext) {
  if (!content.tmdbMovieId) {
    return null;
  }

  for (let page = 1; page <= MAX_SUBTITLE_SEARCH_PAGES; page += 1) {
    const results = await searchOpenSubtitles({
      tmdbId: content.tmdbMovieId,
      type: "movie",
      page,
    });

    if (results.length === 0) {
      break;
    }

    const sorted = [...results].sort(sortSubtitleCandidates);
    if (sorted[0]) {
      return sorted[0];
    }
  }

  return null;
}

export async function searchSeasonSubtitles(content: SubtitleContentContext) {
  if (!content.tmdbShowId || !content.tmdbSeasonNumber) {
    return [];
  }

  const byEpisode = new Map<number, OpenSubtitlesSubtitleResult>();

  for (let page = 1; page <= MAX_SUBTITLE_SEARCH_PAGES; page += 1) {
    const results = await searchOpenSubtitles({
      tmdbId: content.tmdbShowId,
      seasonNumber: content.tmdbSeasonNumber,
      type: "episode",
      page,
    });

    if (results.length === 0) {
      break;
    }

    for (const result of results) {
      const episodeNumber = result.episodeNumber;
      if (!episodeNumber) {
        continue;
      }

      const existing = byEpisode.get(episodeNumber);
      if (!existing || sortSubtitleCandidates(result, existing) < 0) {
        byEpisode.set(episodeNumber, result);
      }
    }
  }

  return [...byEpisode.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, candidate]) => candidate);
}

export function parseDownloadedSubtitle(sourceLabel: string, subtitleText: string) {
  const parsed = parser.fromSrt(subtitleText);
  const lines: SubtitleLine[] = [];

  for (const line of parsed) {
    const text = line.text.trim();
    if (!text) {
      continue;
    }

    lines.push({
      sourceLabel,
      startSeconds: line.startSeconds,
      endSeconds: line.endSeconds,
      text,
    });
  }

  return lines;
}

export async function buildSubtitleCorpus(
  content: SubtitleContentContext,
): Promise<SubtitleCorpus> {
  const warnings: string[] = [];

  if (content.kind === "movie") {
    const candidate = await searchMovieSubtitle(content);
    if (!candidate) {
      throw new Error(`No compatible English subtitles were found for movie ${content.title}.`);
    }

    const downloaded = await downloadSubtitleFile(candidate.fileId);
    const lines = parseDownloadedSubtitle(
      downloaded.fileName ?? `movie-${candidate.fileId}`,
      downloaded.subtitleText,
    );

    if (lines.length === 0) {
      throw new Error(
        `Downloaded subtitles for movie ${content.title} contained no usable dialogue lines.`,
      );
    }

    if (candidate.hearingImpaired) {
      warnings.push("Movie subtitle fallback used a hearing-impaired subtitle file.");
    }

    return {
      lines,
      rawSrtText: downloaded.subtitleText,
      warnings,
      sourceCount: 1,
    };
  }

  const candidates = await searchSeasonSubtitles(content);
  if (candidates.length === 0) {
    throw new Error(`No compatible English subtitles were found for ${content.title}.`);
  }

  const lines: SubtitleLine[] = [];
  const rawSrtParts: string[] = [];

  for (const candidate of candidates) {
    const downloaded = await downloadSubtitleFile(candidate.fileId);
    const episodeLines = parseDownloadedSubtitle(
      downloaded.fileName ?? `season-${candidate.episodeNumber ?? candidate.fileId}`,
      downloaded.subtitleText,
    );

    lines.push(...episodeLines);
    rawSrtParts.push(downloaded.subtitleText);

    if (candidate.hearingImpaired) {
      warnings.push(
        `Episode ${candidate.episodeNumber ?? "unknown"} used a hearing-impaired subtitle fallback.`,
      );
    }
  }

  const expectedEpisodeCount = content.episodeCount ?? null;
  if (expectedEpisodeCount !== null && candidates.length < expectedEpisodeCount) {
    warnings.push(
      `Only ${candidates.length} subtitle files were resolved for a ${expectedEpisodeCount}-episode season.`,
    );
  }

  if (lines.length === 0) {
    throw new Error(
      `Downloaded season subtitles for ${content.title} contained no usable dialogue lines.`,
    );
  }

  return {
    lines,
    rawSrtText: rawSrtParts.join("\n\n"),
    warnings,
    sourceCount: candidates.length,
  };
}

export function buildPlainTextCorpus(lines: SubtitleLine[]) {
  return lines.map((line) => line.text).join("\n");
}

export function buildSubtitleChunks(lines: SubtitleLine[]) {
  const chunks: SubtitleChunk[] = [];

  let currentLines: SubtitleLine[] = [];
  let currentChars = 0;

  const flushCurrentChunk = () => {
    if (currentLines.length === 0) {
      return;
    }

    const text = currentLines.map((line) => line.text).join("\n");
    chunks.push({
      chunkIndex: chunks.length,
      startSeconds: currentLines[0].startSeconds,
      endSeconds: currentLines[currentLines.length - 1].endSeconds,
      text,
      lineCount: currentLines.length,
    });
    currentLines = [];
    currentChars = 0;
  };

  for (const line of lines) {
    const nextChars = currentChars + line.text.length + 1;
    const nextDuration =
      currentLines.length === 0 ? 0 : line.endSeconds - currentLines[0].startSeconds;
    const shouldFlushForSize =
      currentLines.length > 0 &&
      (nextDuration > MAX_CHUNK_DURATION_SECONDS || nextChars > MAX_CHUNK_CHARACTERS);

    if (shouldFlushForSize) {
      flushCurrentChunk();
    }

    currentLines.push(line);
    currentChars += line.text.length + 1;
  }

  flushCurrentChunk();

  return chunks;
}
