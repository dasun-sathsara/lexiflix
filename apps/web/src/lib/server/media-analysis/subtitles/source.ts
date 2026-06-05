import "server-only";

import { downloadSubtitleFile } from "@/lib/integrations/opensubtitles/client";
import {
  findMovieSubtitle,
  findSeasonSubtitles,
} from "@/lib/server/media-analysis/subtitles/search";
import type {
  SubtitleContentContext,
  SubtitleSource,
} from "@/lib/server/media-analysis/subtitles/types";

async function resolveMovieSource(content: SubtitleContentContext): Promise<SubtitleSource> {
  const candidate = await findMovieSubtitle(content);
  if (!candidate) {
    throw new Error(`No compatible English subtitles were found for movie ${content.title}.`);
  }

  const downloaded = await downloadSubtitleFile(candidate.fileId);
  if (!downloaded.subtitleText.trim()) {
    throw new Error(`Downloaded subtitles for movie ${content.title} were empty.`);
  }

  return {
    subtitleText: downloaded.subtitleText,
    warnings: candidate.hearingImpaired
      ? ["Movie subtitle fallback used a hearing-impaired subtitle file."]
      : [],
    sourceCount: 1,
  };
}

async function resolveSeasonSource(content: SubtitleContentContext): Promise<SubtitleSource> {
  const candidates = await findSeasonSubtitles(content);
  if (candidates.length === 0) {
    throw new Error(`No compatible English subtitles were found for ${content.title}.`);
  }

  const warnings: string[] = [];
  const parts: string[] = [];

  for (const candidate of candidates) {
    const downloaded = await downloadSubtitleFile(candidate.fileId);
    parts.push(downloaded.subtitleText);

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

  const subtitleText = parts.join("\n\n");
  if (!subtitleText.trim()) {
    throw new Error(`Downloaded season subtitles for ${content.title} were empty.`);
  }

  return {
    subtitleText,
    warnings,
    sourceCount: candidates.length,
  };
}

/**
 * Resolves and downloads every subtitle file for a movie or season and returns the raw
 * text. Parsing, normalization and segmentation belong to the NLP service.
 */
export async function resolveSubtitleSource(
  content: SubtitleContentContext,
): Promise<SubtitleSource> {
  return content.kind === "movie" ? resolveMovieSource(content) : resolveSeasonSource(content);
}
