export type OpenSubtitlesSearchCriteria = {
  type?: "movie" | "episode";
  tmdbId?: number;
  query?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  languages?: string;
  hearingImpaired?: "include" | "exclude" | "only";
  foreignPartsOnly?: "include" | "exclude" | "only";
  page?: number;
};

export type OpenSubtitlesSubtitleResult = {
  subtitleId: string | null;
  fileId: number;
  fileName: string | null;
  language: string | null;
  release: string | null;
  downloadCount: number | null;
  hearingImpaired: boolean | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
};

export type OpenSubtitlesDownloadLink = {
  fileId: number;
  fileName: string | null;
  link: string;
};

export type DownloadedSubtitle = {
  fileId: number;
  fileName: string | null;
  downloadLink: string;
  subtitleText: string;
};

export type OpenSubtitlesSearchPayload = {
  data?: Array<{
    id?: string | number;
    attributes?: {
      language?: string;
      release?: string;
      download_count?: number;
      hearing_impaired?: boolean | null;
      files?: Array<{ file_id?: number; file_name?: string }>;
      feature_details?: {
        season_number?: number | null;
        episode_number?: number | null;
      };
    };
  }>;
};

export type OpenSubtitlesLoginPayload = {
  token: string;
};

export type OpenSubtitlesDownloadPayload = {
  link: string;
  file_name?: string;
};
