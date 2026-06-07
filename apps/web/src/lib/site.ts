/**
 * Canonical public base URL for the marketing site.
 *
 * Prefers the configured NEXT_PUBLIC_APP_URL (set per environment) and falls
 * back to the production domain. Used for metadataBase, sitemap, and robots so
 * absolute URLs stay consistent across environments.
 */
const FALLBACK_SITE_URL = "https://www.lexiflix.app";

function normalize(url: string): string {
  return url.replace(/\/+$/, "");
}

export const SITE_URL = normalize(process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_SITE_URL);

export const SITE_NAME = "LexiFlix";
