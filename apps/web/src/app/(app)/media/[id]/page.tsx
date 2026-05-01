import type { Metadata } from "next";

import { MediaDetailClient } from "@/features/media/components/media-detail-client";
import { getMediaDetailPageData } from "@/features/media/server/analysis";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireSession } from "@/lib/auth-guards";
import type { TMDBMediaType } from "@/lib/tmdb-shared";

export const metadata: Metadata = {
  title: "Media",
};

function parsePositiveInteger(value: string | string[] | undefined) {
  const parsed = Number.parseInt(Array.isArray(value) ? (value[0] ?? "") : (value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseMediaType(value: string | string[] | undefined): TMDBMediaType | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "movie" || raw === "tv" ? raw : undefined;
}

export default async function MediaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const tmdbId = parsePositiveInteger(resolvedParams.id);
  if (!tmdbId) {
    throw new Error(`Invalid media id: ${resolvedParams.id}`);
  }

  const pageData = await getMediaDetailPageData({
    tmdbId,
    userId: session.user.id,
    mediaTypeHint: parseMediaType(resolvedSearchParams.type),
    seasonNumber: parsePositiveInteger(resolvedSearchParams.season),
  });

  return (
    <>
      <AppTopbar title="Media" />
      <MediaDetailClient pageData={pageData} />
    </>
  );
}
