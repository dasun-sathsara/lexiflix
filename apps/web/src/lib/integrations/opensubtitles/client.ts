import "server-only";

import { env } from "@/lib/config/env";
import { OPENSUBTITLES_LOGIN_MIN_INTERVAL_MS } from "@/lib/constants";
import type {
  DownloadedSubtitle,
  OpenSubtitlesDownloadLink,
  OpenSubtitlesDownloadPayload,
  OpenSubtitlesLoginPayload,
  OpenSubtitlesSearchCriteria,
  OpenSubtitlesSearchPayload,
  OpenSubtitlesSubtitleResult,
} from "@/lib/integrations/opensubtitles/contracts";
import { delay } from "@/lib/server/utils/async";
import { readJsonSafely } from "@/lib/server/utils/request";

export type {
  DownloadedSubtitle,
  OpenSubtitlesSearchCriteria,
  OpenSubtitlesSubtitleResult,
} from "@/lib/integrations/opensubtitles/contracts";

const USER_AGENT = "LexiFlix v1.0.0";

let cachedToken: string | null = null;
let pendingAuthPromise: Promise<string> | null = null;
let lastAuthAttemptAt = 0;

function summarizePayload(payload: unknown) {
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

async function openSubtitlesFetch(
  path: string,
  init: RequestInit = {},
  options: { requireAuth?: boolean } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("Api-Key", env.OPENSUBTITLES_API_KEY);
  headers.set("User-Agent", USER_AGENT);
  headers.set("X-User-Agent", USER_AGENT);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  if (options.requireAuth !== false) {
    headers.set("Authorization", `Bearer ${await authenticate()}`);
  }

  try {
    return await fetch(`${env.OPENSUBTITLES_API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: AbortSignal.timeout(env.OPENSUBTITLES_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("OpenSubtitles request timed out.");
    }

    throw new Error(
      error instanceof Error ? error.message : "OpenSubtitles request could not be completed.",
    );
  }
}

async function authenticate(forceRefresh: boolean = false) {
  if (cachedToken && !forceRefresh) {
    return cachedToken;
  }

  if (pendingAuthPromise && !forceRefresh) {
    return pendingAuthPromise;
  }

  pendingAuthPromise = login();

  try {
    return await pendingAuthPromise;
  } finally {
    pendingAuthPromise = null;
  }
}

async function login() {
  const elapsedSinceLastAttempt = Date.now() - lastAuthAttemptAt;
  if (elapsedSinceLastAttempt < OPENSUBTITLES_LOGIN_MIN_INTERVAL_MS) {
    await delay(OPENSUBTITLES_LOGIN_MIN_INTERVAL_MS - elapsedSinceLastAttempt);
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
    | Partial<OpenSubtitlesLoginPayload>
    | string
    | null;

  if (
    !response.ok ||
    !payload ||
    typeof payload !== "object" ||
    typeof payload.token !== "string"
  ) {
    console.error("[opensubtitles] authentication failed", {
      status: response.status,
      statusText: response.statusText,
      apiBaseUrl: env.OPENSUBTITLES_API_BASE_URL,
      hasApiKey: Boolean(env.OPENSUBTITLES_API_KEY),
      hasUsername: Boolean(env.OPENSUBTITLES_USERNAME),
      hasPassword: Boolean(env.OPENSUBTITLES_PASSWORD),
      payload: summarizePayload(payload),
    });

    throw new Error("Failed to authenticate with OpenSubtitles.");
  }

  cachedToken = payload.token;
  return cachedToken;
}

function buildSearchParams(criteria: OpenSubtitlesSearchCriteria) {
  const params = new URLSearchParams();

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

  if (criteria.hearingImpaired === "only" || criteria.hearingImpaired === "exclude") {
    params.set("hearing_impaired", criteria.hearingImpaired);
  }
  if (criteria.foreignPartsOnly === "only" || criteria.foreignPartsOnly === "exclude") {
    params.set("foreign_parts_only", criteria.foreignPartsOnly);
  }
  if (criteria.page !== undefined) {
    params.set("page", String(criteria.page));
  }

  return params;
}

function toSubtitleResults(payload: OpenSubtitlesSearchPayload): OpenSubtitlesSubtitleResult[] {
  const results: OpenSubtitlesSubtitleResult[] = [];

  for (const item of payload.data ?? []) {
    const attributes = item.attributes ?? {};
    const files = Array.isArray(attributes.files) ? attributes.files : [];

    for (const file of files) {
      if (!file || typeof file !== "object") {
        throw new Error("Invalid OpenSubtitles file payload.");
      }
      if (typeof file.file_id !== "number") {
        throw new Error("OpenSubtitles file payload is missing file_id.");
      }

      results.push({
        subtitleId: item.id !== undefined ? String(item.id) : null,
        fileId: file.file_id,
        fileName: typeof file.file_name === "string" ? file.file_name : null,
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

export async function searchOpenSubtitles(criteria: OpenSubtitlesSearchCriteria) {
  const response = await openSubtitlesFetch(`/subtitles?${buildSearchParams(criteria).toString()}`);
  const payload = (await readJsonSafely(response)) as OpenSubtitlesSearchPayload | string | null;

  if (response.status === 401) {
    cachedToken = null;
  }

  if (!response.ok || !payload || typeof payload !== "object") {
    throw new Error("Failed to search OpenSubtitles subtitles.");
  }

  return toSubtitleResults(payload);
}

export async function getOpenSubtitlesDownloadLink(
  fileId: number,
): Promise<OpenSubtitlesDownloadLink> {
  const response = await openSubtitlesFetch("/download", {
    method: "POST",
    body: JSON.stringify({ file_id: fileId }),
  });
  const payload = (await readJsonSafely(response)) as OpenSubtitlesDownloadPayload | string | null;

  if (!response.ok || !payload || typeof payload !== "object" || typeof payload.link !== "string") {
    throw new Error("Failed to request an OpenSubtitles download link.");
  }

  return {
    fileId,
    fileName: typeof payload.file_name === "string" ? payload.file_name : null,
    link: payload.link,
  };
}

export async function downloadSubtitleFile(fileId: number): Promise<DownloadedSubtitle> {
  const { link, fileName } = await getOpenSubtitlesDownloadLink(fileId);

  try {
    const response = await fetch(link, {
      method: "GET",
      signal: AbortSignal.timeout(env.OPENSUBTITLES_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch subtitle text from OpenSubtitles.");
    }

    return {
      fileId,
      fileName,
      downloadLink: link,
      subtitleText: await response.text(),
    };
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("OpenSubtitles subtitle download timed out.");
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "OpenSubtitles subtitle download could not be completed.",
    );
  }
}
