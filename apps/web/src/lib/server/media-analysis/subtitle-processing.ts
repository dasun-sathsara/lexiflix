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

export function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function normalizeSubtitleText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\{\\[^}]+\}/g, " ")
    .replace(/[♪♫]+/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sortSubtitleCandidates(
  left: OpenSubtitlesSubtitleResult,
  right: OpenSubtitlesSubtitleResult,
) {
  const leftScore = left.downloadCount ?? 0;
  const rightScore = right.downloadCount ?? 0;

  if ((left.hearingImpaired ?? false) !== (right.hearingImpaired ?? false)) {
    return left.hearingImpaired ? 1 : -1;
  }

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  return left.fileId - right.fileId;
}

export async function searchMovieSubtitle(content: SubtitleContentContext) {
  const tmdbId = content.tmdbMovieId;
  if (!tmdbId) {
    throw new Error(`Movie content ${content.id} is missing tmdbMovieId.`);
  }

  const resultSets = await Promise.all([
    searchOpenSubtitles({
      type: "movie",
      tmdbId,
      languages: "en",
      hearingImpaired: "exclude",
      foreignPartsOnly: "exclude",
    }),
    searchOpenSubtitles({
      type: "movie",
      tmdbId,
      languages: "en",
    }),
  ]);

  const candidates = resultSets.flat().sort(sortSubtitleCandidates);
  return candidates[0] ?? null;
}

export async function searchSeasonSubtitles(content: SubtitleContentContext) {
  const tmdbShowId = content.tmdbShowId;
  const seasonNumber = content.tmdbSeasonNumber;

  if (!tmdbShowId || !seasonNumber) {
    throw new Error(`Season content ${content.id} is missing tmdbShowId or tmdbSeasonNumber.`);
  }

  const results: OpenSubtitlesSubtitleResult[] = [];

  for (let page = 1; page <= MAX_SUBTITLE_SEARCH_PAGES; page += 1) {
    const pageResults = await searchOpenSubtitles({
      type: "episode",
      tmdbId: tmdbShowId,
      seasonNumber,
      languages: "en",
      hearingImpaired: "exclude",
      foreignPartsOnly: "exclude",
      page,
    });

    results.push(...pageResults);

    if (pageResults.length === 0) {
      break;
    }
  }

  if (results.length === 0) {
    const fallbackResults = await searchOpenSubtitles({
      type: "episode",
      tmdbId: tmdbShowId,
      seasonNumber,
      languages: "en",
    });

    results.push(...fallbackResults);
  }

  const byEpisode = new Map<number, OpenSubtitlesSubtitleResult>();

  for (const candidate of results.sort(sortSubtitleCandidates)) {
    if (!candidate.episodeNumber || candidate.episodeNumber <= 0) {
      continue;
    }

    if (!byEpisode.has(candidate.episodeNumber)) {
      byEpisode.set(candidate.episodeNumber, candidate);
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
    const normalized = normalizeSubtitleText(line.text);
    if (!normalized) {
      continue;
    }

    lines.push({
      sourceLabel,
      startSeconds: line.startSeconds,
      endSeconds: line.endSeconds,
      text: normalized,
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
      warnings,
      sourceCount: 1,
    };
  }

  const candidates = await searchSeasonSubtitles(content);
  if (candidates.length === 0) {
    throw new Error(`No compatible English subtitles were found for ${content.title}.`);
  }

  const lines: SubtitleLine[] = [];

  for (const candidate of candidates) {
    const downloaded = await downloadSubtitleFile(candidate.fileId);
    const episodeLines = parseDownloadedSubtitle(
      downloaded.fileName ?? `season-${candidate.episodeNumber ?? candidate.fileId}`,
      downloaded.subtitleText,
    );

    lines.push(...episodeLines);

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
