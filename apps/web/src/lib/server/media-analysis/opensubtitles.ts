import "server-only";

import { env } from "@/lib/env";

const openSubtitlesFileSchema = {
  parse(input: unknown) {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid OpenSubtitles file payload.");
    }

    const file = input as Record<string, unknown>;
    if (typeof file.file_id !== "number") {
      throw new Error("OpenSubtitles file payload is missing file_id.");
    }

    return {
      fileId: file.file_id,
      fileName: typeof file.file_name === "string" ? file.file_name : null,
    };
  },
};

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

export type DownloadedSubtitle = {
  fileId: number;
  fileName: string | null;
  downloadLink: string;
  subtitleText: string;
};

type OpenSubtitlesLoginResponse = {
  token: string;
};

type OpenSubtitlesDownloadResponse = {
  link: string;
  file_name?: string;
};

type OpenSubtitlesErrorCode =
  | "AUTH_FAILED"
  | "SEARCH_FAILED"
  | "DOWNLOAD_FAILED"
  | "RATE_LIMITED"
  | "INVALID_RESPONSE"
  | "UNAVAILABLE";

export class OpenSubtitlesClientError extends Error {
  constructor(
    message: string,
    readonly code: OpenSubtitlesErrorCode,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "OpenSubtitlesClientError";
  }
}

let cachedToken: string | null = null;
let pendingAuthPromise: Promise<string> | null = null;
let lastAuthAttemptAt = 0;

const OPENSUBTITLES_LOGIN_MIN_INTERVAL_MS = 1_100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeOpenSubtitlesPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const source = payload as Record<string, unknown>;
  const summary: Record<string, unknown> = {};

  for (const key of ["status", "message", "error", "errors"]) {
    if (key in source) {
      summary[key] = source[key];
    }
  }

  summary.keys = Object.keys(source);
  return summary;
}

async function readJsonSafely(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function openSubtitlesFetch(
  path: string,
  init: RequestInit = {},
  options: { requireAuth?: boolean } = {},
) {
  const { signal, clear } = createTimeoutSignal(env.OPENSUBTITLES_REQUEST_TIMEOUT_MS);
  const headers = new Headers(init.headers);
  headers.set("Api-Key", env.OPENSUBTITLES_API_KEY);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  if (options.requireAuth !== false) {
    const token = await authenticateOpenSubtitles();
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    return await fetch(`${env.OPENSUBTITLES_API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new OpenSubtitlesClientError(
        "OpenSubtitles request timed out.",
        "UNAVAILABLE",
        undefined,
        { path },
      );
    }

    throw new OpenSubtitlesClientError(
      "OpenSubtitles request could not be completed.",
      "UNAVAILABLE",
      undefined,
      error instanceof Error ? error.message : error,
    );
  } finally {
    clear();
  }
}

async function authenticateOpenSubtitles(forceRefresh: boolean = false) {
  if (cachedToken && !forceRefresh) {
    return cachedToken;
  }

  if (pendingAuthPromise && !forceRefresh) {
    return pendingAuthPromise;
  }

  pendingAuthPromise = performOpenSubtitlesLogin();

  try {
    return await pendingAuthPromise;
  } finally {
    pendingAuthPromise = null;
  }
}

async function performOpenSubtitlesLogin() {
  const elapsedSinceLastAttempt = Date.now() - lastAuthAttemptAt;
  if (elapsedSinceLastAttempt < OPENSUBTITLES_LOGIN_MIN_INTERVAL_MS) {
    await sleep(OPENSUBTITLES_LOGIN_MIN_INTERVAL_MS - elapsedSinceLastAttempt);
  }

  lastAuthAttemptAt = Date.now();

  const response = await openSubtitlesFetch(
    "/login",
    {
      method: "POST",
      body: JSON.stringify({
        username: env.OPENSUBTITLES_USERNAME,
        password: env.OPENSUBTITLES_PASSWORD,
      }),
    },
    { requireAuth: false },
  );
  const payload = (await readJsonSafely(response)) as
    | Partial<OpenSubtitlesLoginResponse>
    | string
    | null;

  if (
    !response.ok ||
    !payload ||
    typeof payload !== "object" ||
    typeof payload.token !== "string"
  ) {
    const diagnostic = {
      status: response.status,
      statusText: response.statusText,
      apiBaseUrl: env.OPENSUBTITLES_API_BASE_URL,
      hasApiKey: Boolean(env.OPENSUBTITLES_API_KEY),
      hasUsername: Boolean(env.OPENSUBTITLES_USERNAME),
      hasPassword: Boolean(env.OPENSUBTITLES_PASSWORD),
      payload: summarizeOpenSubtitlesPayload(payload),
    };

    console.error("[media-analysis] OpenSubtitles authentication failed", diagnostic);

    throw new OpenSubtitlesClientError(
      "Failed to authenticate with OpenSubtitles.",
      response.status === 429 ? "RATE_LIMITED" : "AUTH_FAILED",
      response.status,
      diagnostic,
    );
  }

  cachedToken = payload.token;
  return cachedToken;
}

function applySearchCriteria(params: URLSearchParams, criteria: OpenSubtitlesSearchCriteria) {
  if (criteria.type) {
    params.set("type", criteria.type);
  }

  if (criteria.tmdbId !== undefined) {
    params.set("tmdb_id", String(criteria.tmdbId));
  }

  if (criteria.query) {
    params.set("query", criteria.query);
  }

  if (criteria.seasonNumber !== undefined) {
    params.set("season_number", String(criteria.seasonNumber));
  }

  if (criteria.episodeNumber !== undefined) {
    params.set("episode_number", String(criteria.episodeNumber));
  }

  params.set("languages", criteria.languages ?? "en");
  params.set("order_by", "download_count");
  params.set("order_direction", "desc");

  if (criteria.hearingImpaired === "only") {
    params.set("hearing_impaired", "only");
  } else if (criteria.hearingImpaired === "exclude") {
    params.set("hearing_impaired", "exclude");
  }

  if (criteria.foreignPartsOnly === "only") {
    params.set("foreign_parts_only", "only");
  } else if (criteria.foreignPartsOnly === "exclude") {
    params.set("foreign_parts_only", "exclude");
  }

  if (criteria.page !== undefined) {
    params.set("page", String(criteria.page));
  }
}

export async function searchOpenSubtitles(criteria: OpenSubtitlesSearchCriteria) {
  const params = new URLSearchParams();
  applySearchCriteria(params, criteria);

  const response = await openSubtitlesFetch(`/subtitles?${params.toString()}`);
  const payload = (await readJsonSafely(response)) as
    | {
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
      }
    | string
    | null;

  if (response.status === 401) {
    cachedToken = null;
  }

  if (!response.ok || !payload || typeof payload !== "object") {
    throw new OpenSubtitlesClientError(
      "Failed to search OpenSubtitles subtitles.",
      response.status === 429 ? "RATE_LIMITED" : "SEARCH_FAILED",
      response.status,
      payload,
    );
  }

  const results: OpenSubtitlesSubtitleResult[] = [];

  for (const item of payload.data ?? []) {
    const attributes = item.attributes ?? {};
    const files = Array.isArray(attributes.files) ? attributes.files : [];

    for (const rawFile of files) {
      const file = openSubtitlesFileSchema.parse(rawFile);

      results.push({
        subtitleId: item.id !== undefined ? String(item.id) : null,
        fileId: file.fileId,
        fileName: file.fileName,
        language: typeof attributes.language === "string" ? attributes.language : null,
        release: typeof attributes.release === "string" ? attributes.release : null,
        downloadCount:
          typeof attributes.download_count === "number" ? attributes.download_count : null,
        hearingImpaired:
          typeof attributes.hearing_impaired === "boolean" ? attributes.hearing_impaired : null,
        seasonNumber:
          typeof attributes.feature_details?.season_number === "number"
            ? attributes.feature_details.season_number
            : null,
        episodeNumber:
          typeof attributes.feature_details?.episode_number === "number"
            ? attributes.feature_details.episode_number
            : null,
      });
    }
  }

  return results;
}

export async function getOpenSubtitlesDownloadLink(fileId: number) {
  const response = await openSubtitlesFetch("/download", {
    method: "POST",
    body: JSON.stringify({ file_id: fileId }),
  });
  const payload = (await readJsonSafely(response)) as OpenSubtitlesDownloadResponse | string | null;

  if (!response.ok || !payload || typeof payload !== "object" || typeof payload.link !== "string") {
    throw new OpenSubtitlesClientError(
      "Failed to request an OpenSubtitles download link.",
      response.status === 429 ? "RATE_LIMITED" : "DOWNLOAD_FAILED",
      response.status,
      payload,
    );
  }

  return {
    fileId,
    fileName: typeof payload.file_name === "string" ? payload.file_name : null,
    link: payload.link,
  };
}

export async function downloadSubtitleFile(fileId: number): Promise<DownloadedSubtitle> {
  const { link, fileName } = await getOpenSubtitlesDownloadLink(fileId);
  const { signal, clear } = createTimeoutSignal(env.OPENSUBTITLES_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(link, {
      method: "GET",
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new OpenSubtitlesClientError(
        "Failed to fetch subtitle text from OpenSubtitles.",
        response.status === 429 ? "RATE_LIMITED" : "DOWNLOAD_FAILED",
        response.status,
      );
    }

    return {
      fileId,
      fileName,
      downloadLink: link,
      subtitleText: await response.text(),
    };
  } catch (error) {
    if (error instanceof OpenSubtitlesClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new OpenSubtitlesClientError(
        "OpenSubtitles subtitle download timed out.",
        "UNAVAILABLE",
        undefined,
        { fileId },
      );
    }

    throw new OpenSubtitlesClientError(
      "OpenSubtitles subtitle download could not be completed.",
      "UNAVAILABLE",
      undefined,
      error instanceof Error ? error.message : error,
    );
  } finally {
    clear();
  }
}
