import { AdminCuratedWorkspace } from "@/features/curation/components/admin-curated-tabs";
import {
  type AnnotatedTMDBResult,
  buildCuratedAdminDiscoverParams,
  parseCuratedAdminCatalogFilter,
  parseCuratedAdminSearchParams,
} from "@/features/curation/lib/admin-query";
import { listCuratedEntriesForAdmin } from "@/features/curation/server/catalog";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireAdmin } from "@/lib/auth-guards";
import { discoverMedia, getGenres, searchMedia } from "@/lib/tmdb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curated Admin — LexiFlix",
  description: "Internal content operations workspace for managing the curated catalog.",
};

interface AdminCuratedPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminCuratedPage({ searchParams }: AdminCuratedPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const queryState = parseCuratedAdminSearchParams(params);
  const catalogFilter = parseCuratedAdminCatalogFilter(params);

  // Parallel fetch: catalog entries + both genre lists (always needed)
  const [movieGenres, tvGenres, allEntries] = await Promise.all([
    getGenres("movie"),
    getGenres("tv"),
    listCuratedEntriesForAdmin({ limit: 500 }),
  ]);

  // Build O(1) lookup set for cross-referencing TMDB results against catalog
  const curatedKeys = new Set<string>(allEntries.map((e) => `${e.mediaType}:${e.tmdbId}`));

  // Merge genre lists into a single id→name map for discover row labels
  const genreMap: Record<number, string> = {};
  for (const g of [...movieGenres.genres, ...tvGenres.genres]) {
    genreMap[g.id] = g.name;
  }

  // Only fetch TMDB when in discover view — catalog view doesn't need it
  let discoverResults: AnnotatedTMDBResult[] = [];
  let discoverMeta = { page: 1, totalPages: 0, totalResults: 0 };

  if (queryState.view === "discover") {
    try {
      if (queryState.mode === "search" && queryState.query) {
        const data = await searchMedia(queryState.query, queryState.mediaType, queryState.page);
        discoverResults = data.results.map((r) => ({
          ...r,
          isCurated: curatedKeys.has(`${queryState.mediaType}:${r.id}`),
        }));
        discoverMeta = {
          page: data.page,
          totalPages: Math.min(data.total_pages, 500),
          totalResults: data.total_results,
        };
      } else if (queryState.mode === "browse") {
        const dp = buildCuratedAdminDiscoverParams(queryState);
        const data = await discoverMedia(queryState.mediaType, dp);
        discoverResults = data.results.map((r) => ({
          ...r,
          isCurated: curatedKeys.has(`${queryState.mediaType}:${r.id}`),
        }));
        discoverMeta = {
          page: data.page,
          totalPages: Math.min(data.total_pages, 500),
          totalResults: data.total_results,
        };
      }
    } catch {
      // TMDB errors are handled gracefully — results remain empty
    }
  }

  // Apply catalog view filters on the server before passing to the workspace
  const catalogEntries = allEntries.filter((e) => {
    if (catalogFilter.mediaType !== "all" && e.mediaType !== catalogFilter.mediaType) {
      return false;
    }
    if (catalogFilter.status === "published" && !e.isPublished) {
      return false;
    }
    if (catalogFilter.status === "hidden" && e.isPublished) {
      return false;
    }
    return true;
  });

  // Aggregate stats from the full (unfiltered) entry list
  const stats = {
    total: allEntries.length,
    published: allEntries.filter((e) => e.isPublished).length,
    movies: allEntries.filter((e) => e.mediaType === "movie").length,
    tv: allEntries.filter((e) => e.mediaType === "tv").length,
  };

  // Serve genre options for the currently active media type in the controls
  const currentGenres = queryState.mediaType === "movie" ? movieGenres.genres : tvGenres.genres;

  return (
    <>
      <AppTopbar title="Curated Admin" />
      <AdminCuratedWorkspace
        queryState={queryState}
        catalogFilter={catalogFilter}
        catalogEntries={catalogEntries}
        allEntriesCount={allEntries.length}
        stats={stats}
        discoverResults={discoverResults}
        discoverMeta={discoverMeta}
        genres={currentGenres}
        genreMap={genreMap}
      />
    </>
  );
}
