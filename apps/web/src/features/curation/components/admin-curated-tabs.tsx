import { Eye, Film, Layers, LayoutGrid, Search, Tv } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { AppEmptyState, AppPanel, AppStat } from "@/components/common/app-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AnnotatedTMDBResult,
  CuratedAdminCatalogFilter,
  CuratedAdminQueryState,
} from "@/features/curation/lib/admin-query";
import type { CuratedCatalogEntry } from "@/features/curation/lib/types";
import type { Genre } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

import { AdminCatalogFilters } from "./admin-catalog-filters";
import { AdminCatalogRow } from "./admin-catalog-row";
import { AdminDiscoverControls } from "./admin-curated-controls";
import { AdminDiscoverRow } from "./admin-discover-row";

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

function buildPageUrl(
  baseParams: Record<string, string | number | null | undefined>,
  page: number,
): string {
  const entries = Object.entries({ ...baseParams, page: String(page) }).filter(
    ([, v]) => v != null && v !== "",
  ) as [string, string][];
  return `?${new URLSearchParams(entries).toString()}`;
}

function ControlsSkeleton() {
  return <div className="h-[184px] animate-pulse rounded-[calc(var(--radius)+2px)] border bg-card/50" />;
}

function FiltersSkeleton() {
  return <div className="h-[132px] animate-pulse rounded-[calc(var(--radius)+2px)] border bg-card/50" />;
}

function PaginationRow({
  currentPage,
  totalPages,
  baseParams,
}: {
  currentPage: number;
  totalPages: number;
  baseParams: Record<string, string | number | null | undefined>;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-2">
      <div>
        {currentPage > 1 && (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildPageUrl(baseParams, currentPage - 1)}>
              ← Previous
            </Link>
          </Button>
        )}
      </div>

      <span className="text-sm text-muted-foreground">
        Page {currentPage} / {totalPages}
      </span>

      <div>
        {currentPage < totalPages && (
          <Button variant="outline" size="sm" asChild>
            <Link href={buildPageUrl(baseParams, currentPage + 1)}>
              Next →
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
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
      <section className="flex flex-col gap-2">
        <AppPageHeader
          heading="Curated Catalog"
        />

        <div className="flex flex-wrap gap-2.5">
          <AppStat icon={Layers} label="Catalog" value={stats.total} hint="items" />
          <AppStat
            icon={Eye}
            label="Published"
            value={stats.published}
            hint="live"
            tone="success"
          />
          <AppStat icon={Film} label="Movies" value={stats.movies} />
          <AppStat icon={Tv} label="TV Shows" value={stats.tv} />
        </div>
      </section>

      <AppPanel className="inline-flex self-start items-center gap-1 p-1">
        <Link
          href={discoverHref}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all",
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
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all",
            isCatalog
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Layers className="size-4" />
          Manage Catalog
          {allEntriesCount > 0 && (
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
          )}
        </Link>
      </AppPanel>

      {isDiscover && (
        <div className="flex flex-col gap-4">
          <Suspense fallback={<ControlsSkeleton />}>
            <AdminDiscoverControls queryState={queryState} genres={genres} />
          </Suspense>

          {queryState.mode === "browse" &&
            (discoverResults.length > 0 ? (
              <Card className="gap-0 rounded-[calc(var(--radius)+2px)] border bg-card/60 py-0 shadow-sm">
                <CardHeader className="gap-1.5 border-b py-3.5">
                  <CardTitle className="text-base font-semibold">Discovery results</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {discoverMeta.totalResults.toLocaleString()}
                    </span>{" "}
                    results · page {discoverMeta.page} of {discoverMeta.totalPages}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 py-3.5">
                  {discoverResults.map((result) => (
                    <AdminDiscoverRow
                      key={result.id}
                      result={result}
                      mediaType={queryState.mediaType}
                      genreMap={genreMap}
                      isCurated={result.isCurated}
                    />
                  ))}

                  <PaginationRow
                    currentPage={discoverMeta.page}
                    totalPages={discoverMeta.totalPages}
                    baseParams={discoverBaseParams}
                  />
                </CardContent>
              </Card>
            ) : (
              <AppEmptyState
                icon={LayoutGrid}
                title="No results found"
                description="Try adjusting your filters, selecting a different genre, or changing the decade."
              />
            ))}

          {queryState.mode === "search" &&
            (queryState.query ? (
              discoverResults.length > 0 ? (
                <Card className="gap-0 rounded-[calc(var(--radius)+2px)] border bg-card/60 py-0 shadow-sm">
                  <CardHeader className="gap-1.5 border-b py-3.5">
                    <CardTitle className="text-base font-semibold">Search results</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {discoverMeta.totalResults.toLocaleString()}
                      </span>{" "}
                      results for &ldquo;{queryState.query}&rdquo;
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3 py-3.5">
                    {discoverResults.map((result) => (
                      <AdminDiscoverRow
                        key={result.id}
                        result={result}
                        mediaType={queryState.mediaType}
                        genreMap={genreMap}
                        isCurated={result.isCurated}
                      />
                    ))}

                    <PaginationRow
                      currentPage={discoverMeta.page}
                      totalPages={discoverMeta.totalPages}
                      baseParams={discoverBaseParams}
                    />
                  </CardContent>
                </Card>
              ) : (
                <AppEmptyState
                  icon={Search}
                  title={`No results for "${queryState.query}"`}
                  description="Try different keywords or switch to Browse mode to discover by genre and decade."
                />
              )
            ) : (
              <AppEmptyState
                icon={Search}
                title="Search for a title"
                description="Type a title above to search TMDB, or switch to Browse mode to discover by filters."
              />
            ))}
        </div>
      )}

      {isCatalog && (
        <div className="flex flex-col gap-4">
          <Suspense fallback={<FiltersSkeleton />}>
            <AdminCatalogFilters filter={catalogFilter} counts={catalogCounts} />
          </Suspense>

          {catalogEntries.length > 0 ? (
            <Card className="gap-0 rounded-[calc(var(--radius)+2px)] border bg-card/60 py-0 shadow-sm">
              <CardHeader className="gap-1.5 border-b py-3.5">
                <CardTitle className="text-base font-semibold">Catalog entries</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review ordering, publish status, and TMDB snapshots without compressing the row
                  metadata.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 py-3.5">
                {catalogEntries.map((entry) => (
                  <AdminCatalogRow key={entry.id} entry={entry} />
                ))}
              </CardContent>
            </Card>
          ) : allEntriesCount === 0 ? (
            <AppEmptyState
              icon={Layers}
              title="No titles in the catalog yet"
              description="Switch to Discover & Add to find titles on TMDB and add them to the catalog."
              action={
                <Button asChild variant="outline" className="rounded-xl px-4">
                  <Link href={discoverHref}>
                    <LayoutGrid data-icon="inline-start" />
                    Go to Discover & Add
                  </Link>
                </Button>
              }
            />
          ) : (
            <AppEmptyState
              icon={Layers}
              title="No entries match this filter"
              description="Try adjusting the media type or status filter above to see more entries."
            />
          )}
        </div>
      )}
    </AppPageShell>
  );
}
