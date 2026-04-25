import type { Metadata } from "next";

import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { BrowseControls } from "@/features/browse/components/browse-controls";
import { MediaGrid } from "@/features/browse/components/media-grid";
import { PaginationControls } from "@/features/browse/components/pagination-controls";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { discoverMedia, getGenres, searchMedia } from "@/lib/tmdb";

export const metadata: Metadata = {
  title: "Browse - LexiFlix",
  description: "Browse movies and TV shows",
};

interface BrowsePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;

  const type =
    typeof params.type === "string" && (params.type === "movie" || params.type === "tv")
      ? params.type
      : "movie";

  // Fetch Genres (Always needed for controls and card mapping)
  // We use Promise.all to fetch them in parallel
  const [movieGenres, tvGenres] = await Promise.all([getGenres("movie"), getGenres("tv")]);

  // Create unified map
  const genreMap: Record<number, string> = {};
  [...movieGenres.genres, ...tvGenres.genres].forEach((g) => {
    genreMap[g.id] = g.name;
  });

  // Current genres for controls (depend on type)
  const currentGenres = type === "movie" ? movieGenres.genres : tvGenres.genres;

  // Fetch Data
  const q = typeof params.q === "string" ? params.q : undefined;
  const page = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;

  const data = q
    ? await searchMedia(q, type, page)
    : await (async () => {
        const discoverParams: Record<string, string | number | boolean | undefined> = {
          page,
          sort_by: typeof params.sort_by === "string" ? params.sort_by : undefined,
          with_genres: typeof params.with_genres === "string" ? params.with_genres : undefined,
        };

        const dateKeys = [
          "primary_release_date.gte",
          "primary_release_date.lte",
          "first_air_date.gte",
          "first_air_date.lte",
        ] as const;

        dateKeys.forEach((k) => {
          if (typeof params[k] === "string") discoverParams[k] = params[k];
        });

        return discoverMedia(type, discoverParams);
      })();

  return (
    <>
      <AppTopbar title="Browse" />
      <AppPageShell className="gap-6">
        {/* Zone A: Header & Controls */}
        <section className="space-y-2">
          <AppPageHeader
            heading="Browse"
            description="Explore movies and TV shows, then narrow the catalog by title, genre, and release window."
          />
          <BrowseControls genres={currentGenres} />
        </section>

        {/* Zone B: Main Grid */}
        <section>
          <MediaGrid results={data.results} genreMap={genreMap} />
        </section>

        {/* Zone C: Pagination */}
        <section className="flex justify-center">
          <PaginationControls currentPage={data.page} totalPages={data.total_pages} />
        </section>
      </AppPageShell>
    </>
  );
}
