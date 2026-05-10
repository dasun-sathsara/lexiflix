import { Eye, Film, Layers, LayoutGrid, Tv } from "lucide-react";
import Link from "next/link";

import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { AppPanel, AppStat } from "@/components/common/app-surface";
import type {
  AnnotatedTMDBResult,
  CuratedAdminCatalogFilter,
  CuratedAdminQueryState,
} from "@/features/curation/lib/admin-query";
import type { CuratedCatalogEntry } from "@/features/curation/lib/types";
import type { Genre } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

import { AdminCatalogView } from "./admin-catalog-view";
import { AdminDiscoverView } from "./admin-discover-view";

interface AdminCuratedWorkspaceProps {
  queryState: CuratedAdminQueryState;
  catalogFilter: CuratedAdminCatalogFilter;
  catalogEntries: CuratedCatalogEntry[];
  allEntriesCount: number;
  stats: { total: number; published: number; movies: number; tv: number };
  discoverResults: AnnotatedTMDBResult[];
  discoverMeta: { page: number; totalPages: number; totalResults: number };
  genres: Genre[];
  genreMap: Record<number, string>;
}

export function AdminCuratedWorkspace({
  queryState,
  catalogFilter,
  catalogEntries,
  allEntriesCount,
  stats,
  discoverResults,
  discoverMeta,
  genres,
  genreMap,
}: AdminCuratedWorkspaceProps) {
  const discoverHref = [
    "?view=discover",
    queryState.mode !== "search" ? `&mode=${queryState.mode}` : "",
    queryState.mediaType !== "movie" ? `&type=${queryState.mediaType}` : "",
    queryState.query ? `&q=${encodeURIComponent(queryState.query)}` : "",
    queryState.genreId ? `&genre=${queryState.genreId}` : "",
  ]
    .filter(Boolean)
    .join("");

  const catalogHref = [
    "?view=catalog",
    catalogFilter.mediaType !== "all" ? `&cat_type=${catalogFilter.mediaType}` : "",
    catalogFilter.status !== "all" ? `&cat_status=${catalogFilter.status}` : "",
  ]
    .filter(Boolean)
    .join("");

  const discoverBaseParams: Record<string, string | null | undefined> = {
    view: "discover",
    mode: queryState.mode !== "search" ? queryState.mode : undefined,
    type: queryState.mediaType !== "movie" ? queryState.mediaType : undefined,
    q: queryState.query || undefined,
    genre: queryState.genreId ?? undefined,
    sort: queryState.sortBy,
    decade: queryState.decade != null ? String(queryState.decade) : undefined,
  };

  const catalogCounts = {
    all: allEntriesCount,
    movies: stats.movies,
    tv: stats.tv,
    published: stats.published,
    hidden: stats.total - stats.published,
  };

  const isDiscover = queryState.view === "discover";
  const isCatalog = queryState.view === "catalog";

  return (
    <AppPageShell>
      <AppPageHeader
        heading="Curated Catalog"
        description="Manage the curated catalog — discover, add, reorder, and publish entries."
        stats={
          <>
            <AppStat icon={Layers} label="Catalog" value={stats.total} />
            <AppStat icon={Eye} label="Published" value={stats.published} tone="success" />
            <AppStat icon={Film} label="Movies" value={stats.movies} />
            <AppStat icon={Tv} label="TV" value={stats.tv} />
          </>
        }
        actions={
          <AppPanel className="inline-flex items-center gap-1 p-1">
            <Link
              href={discoverHref}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                isDiscover
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-4" />
              Discover & Add
            </Link>
            <Link
              href={catalogHref}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                isCatalog
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Layers className="size-4" />
              Manage Catalog
              {allEntriesCount > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs tabular-nums",
                    isCatalog
                      ? "bg-muted text-muted-foreground"
                      : "bg-muted/80 text-muted-foreground/60",
                  )}
                >
                  {allEntriesCount}
                </span>
              ) : null}
            </Link>
          </AppPanel>
        }
      />

      {isDiscover && (
        <AdminDiscoverView
          queryState={queryState}
          genres={genres}
          genreMap={genreMap}
          discoverResults={discoverResults}
          discoverMeta={discoverMeta}
          discoverBaseParams={discoverBaseParams}
        />
      )}

      {isCatalog && (
        <AdminCatalogView
          catalogFilter={catalogFilter}
          catalogCounts={catalogCounts}
          catalogEntries={catalogEntries}
          allEntriesCount={allEntriesCount}
          discoverHref={discoverHref}
        />
      )}
    </AppPageShell>
  );
}
