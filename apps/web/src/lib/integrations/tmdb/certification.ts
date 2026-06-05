import type { TMDBMovieDetails, TMDBTvDetails } from "@/lib/integrations/tmdb/contracts";

/**
 * Extracts the US content certification from TMDB movie release_dates, falling back
 * to the first available non-empty certification from any country.
 */
export function extractMovieCertification(detail: TMDBMovieDetails): string | null {
  const results = detail.release_dates?.results;
  if (!results?.length) return null;

  const usEntry = results.find((entry) => entry.iso_3166_1 === "US");
  if (usEntry) {
    const usCert = usEntry.release_dates.find((rd) => rd.certification.trim().length > 0);
    if (usCert) return usCert.certification;
  }

  for (const entry of results) {
    const cert = entry.release_dates.find((rd) => rd.certification.trim().length > 0);
    if (cert) return cert.certification;
  }

  return null;
}

/**
 * Extracts the US content rating from TMDB TV content_ratings, falling back
 * to the first available non-empty rating from any country.
 */
export function extractTvCertification(detail: TMDBTvDetails): string | null {
  const results = detail.content_ratings?.results;
  if (!results?.length) return null;

  const usEntry = results.find((entry) => entry.iso_3166_1 === "US");
  if (usEntry?.rating) return usEntry.rating;

  for (const entry of results) {
    if (entry.rating) return entry.rating;
  }

  return null;
}
