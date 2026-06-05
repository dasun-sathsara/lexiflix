/** The subset of a content row needed to resolve subtitle files. */
export type SubtitleContentContext = {
  id: string;
  kind: string;
  title: string;
  tmdbMovieId: number | null;
  tmdbShowId: number | null;
  tmdbSeasonNumber: number | null;
  episodeCount: number | null;
};

/**
 * Raw subtitle text as downloaded from OpenSubtitles. The web app does not parse or
 * segment subtitles: normalization is owned by the NLP service.
 */
export type SubtitleSource = {
  subtitleText: string;
  warnings: string[];
  sourceCount: number;
};
