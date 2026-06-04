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

/** The subset of a content row the subtitle pipeline needs. */
export type SubtitleContentContext = {
  id: string;
  kind: string;
  title: string;
  tmdbMovieId: number | null;
  tmdbShowId: number | null;
  tmdbSeasonNumber: number | null;
  episodeCount: number | null;
};
