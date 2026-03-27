import type { Metadata } from "next";

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
  const page = typeof params.page === "string" ? parseInt(params.page) : 1;

  let data;
  if (q) {
    data = await searchMedia(q, type, page);
  } else {
    // Discover
    const discoverParams: any = {
      page,
      sort_by: typeof params.sort_by === "string" ? params.sort_by : undefined,
      with_genres: typeof params.with_genres === "string" ? params.with_genres : undefined,
    };

    const dateKeys = [
      "primary_release_date.gte",
      "primary_release_date.lte",
      "first_air_date.gte",
      "first_air_date.lte",
    ];
    dateKeys.forEach((k) => {
      if (typeof params[k] === "string") discoverParams[k] = params[k];
    });

    data = await discoverMedia(type, discoverParams);
  }

  return (
    <>
      <AppTopbar title="Browse" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 p-6">
        {/* Decorative Background Blobs */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-indigo-500/5 blur-[80px]" />
        <div className="pointer-events-none absolute -right-20 top-1/2 size-72 rounded-full bg-purple-500/5 blur-[80px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 size-72 rounded-full bg-rose-500/5 blur-[80px]" />

        {/* Zone A: Header & Controls */}
        <section className="relative space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Browse</h1>
          <BrowseControls genres={currentGenres} />
        </section>

        {/* Zone B: Main Grid */}
        <section className="relative">
          <MediaGrid results={data.results} genreMap={genreMap} />
        </section>

        {/* Zone C: Pagination */}
        <section className="relative flex justify-center">
          <PaginationControls currentPage={data.page} totalPages={data.total_pages} />
        </section>
      </div>
    </>
  );
}
