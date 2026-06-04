import "server-only";

import { SUBTITLE_SEARCH_MAX_PAGES } from "@/lib/constants";
import {
  type OpenSubtitlesSubtitleResult,
  searchOpenSubtitles,
} from "@/lib/integrations/opensubtitles/client";
import type { SubtitleContentContext } from "@/lib/server/media-analysis/subtitles/types";

/** Prefers non hearing-impaired files, then the most downloaded release. */
export function compareSubtitleCandidates(
  left: OpenSubtitlesSubtitleResult,
  right: OpenSubtitlesSubtitleResult,
) {
  if ((left.hearingImpaired ?? false) !== (right.hearingImpaired ?? false)) {
    return left.hearingImpaired ? 1 : -1;
  }

  return (right.downloadCount ?? 0) - (left.downloadCount ?? 0);
}

export async function findMovieSubtitle(content: SubtitleContentContext) {
  if (!content.tmdbMovieId) {
    return null;
  }

  for (let page = 1; page <= SUBTITLE_SEARCH_MAX_PAGES; page += 1) {
    const results = await searchOpenSubtitles({
      tmdbId: content.tmdbMovieId,
      type: "movie",
      page,
    });

    if (results.length === 0) {
      break;
    }

    const best = [...results].sort(compareSubtitleCandidates)[0];
    if (best) {
      return best;
    }
  }

  return null;
}

/** Returns the best subtitle file per episode, ordered by episode number. */
export async function findSeasonSubtitles(content: SubtitleContentContext) {
  if (!content.tmdbShowId || !content.tmdbSeasonNumber) {
    return [];
  }

  const byEpisode = new Map<number, OpenSubtitlesSubtitleResult>();

  for (let page = 1; page <= SUBTITLE_SEARCH_MAX_PAGES; page += 1) {
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
      if (!existing || compareSubtitleCandidates(result, existing) < 0) {
        byEpisode.set(episodeNumber, result);
      }
    }
  }

  return [...byEpisode.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, candidate]) => candidate);
}
