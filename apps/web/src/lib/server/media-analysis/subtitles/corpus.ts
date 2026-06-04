import "server-only";

import { downloadSubtitleFile } from "@/lib/integrations/opensubtitles/client";
import { parseSrtText } from "@/lib/server/media-analysis/subtitles/parse";
import {
  findMovieSubtitle,
  findSeasonSubtitles,
} from "@/lib/server/media-analysis/subtitles/search";
import type {
  SubtitleContentContext,
  SubtitleCorpus,
  SubtitleLine,
} from "@/lib/server/media-analysis/subtitles/types";

async function buildMovieCorpus(content: SubtitleContentContext): Promise<SubtitleCorpus> {
  const candidate = await findMovieSubtitle(content);
  if (!candidate) {
    throw new Error(`No compatible English subtitles were found for movie ${content.title}.`);
  }

  const downloaded = await downloadSubtitleFile(candidate.fileId);
  const lines = parseSrtText(
    downloaded.fileName ?? `movie-${candidate.fileId}`,
    downloaded.subtitleText,
  );

  if (lines.length === 0) {
    throw new Error(
      `Downloaded subtitles for movie ${content.title} contained no usable dialogue lines.`,
    );
  }

  return {
    lines,
    rawSrtText: downloaded.subtitleText,
    warnings: candidate.hearingImpaired
      ? ["Movie subtitle fallback used a hearing-impaired subtitle file."]
      : [],
    sourceCount: 1,
  };
}

async function buildSeasonCorpus(content: SubtitleContentContext): Promise<SubtitleCorpus> {
  const candidates = await findSeasonSubtitles(content);
  if (candidates.length === 0) {
    throw new Error(`No compatible English subtitles were found for ${content.title}.`);
  }

  const warnings: string[] = [];
  const lines: SubtitleLine[] = [];
  const rawSrtParts: string[] = [];

  for (const candidate of candidates) {
    const downloaded = await downloadSubtitleFile(candidate.fileId);

    lines.push(
      ...parseSrtText(
        downloaded.fileName ?? `season-${candidate.episodeNumber ?? candidate.fileId}`,
        downloaded.subtitleText,
      ),
    );
    rawSrtParts.push(downloaded.subtitleText);

    if (candidate.hearingImpaired) {
      warnings.push(
        `Episode ${candidate.episodeNumber ?? "unknown"} used a hearing-impaired subtitle fallback.`,
      );
    }
  }

  if (content.episodeCount !== null && candidates.length < content.episodeCount) {
    warnings.push(
      `Only ${candidates.length} subtitle files were resolved for a ${content.episodeCount}-episode season.`,
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

/** Resolves, downloads and parses every subtitle source for a movie or season. */
export async function buildSubtitleCorpus(
  content: SubtitleContentContext,
): Promise<SubtitleCorpus> {
  return content.kind === "movie" ? buildMovieCorpus(content) : buildSeasonCorpus(content);
}
