import { Eye, Film, Layers, LayoutGrid, Search, Tv } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPageUrl(
  baseParams: Record<string, string | number | null | undefined>,
  page: number,
): string {
  const entries = Object.entries({ ...baseParams, page: String(page) }).filter(
    ([, v]) => v != null && v !== "",
  ) as [string, string][];
  return `?${new URLSearchParams(entries).toString()}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/20 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mx-auto max-w-xs text-xs text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ControlsSkeleton() {
  return <div className="h-[136px] animate-pulse rounded-xl border bg-card/40" />;
}

function FiltersSkeleton() {
  return <div className="h-12 animate-pulse rounded-lg border bg-card/40" />;
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
          <Link
            href={buildPageUrl(baseParams, currentPage - 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card/40 px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-card/60 hover:shadow-md"
          >
            ← Previous
          </Link>
        )}
      </div>

      <span className="text-sm text-muted-foreground">
        Page {currentPage} / {totalPages}
      </span>

      <div>
        {currentPage < totalPages && (
          <Link
            href={buildPageUrl(baseParams, currentPage + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-card/40 px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-card/60 hover:shadow-md"
          >
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main workspace component (server)
// ---------------------------------------------------------------------------

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
  // Build tab hrefs preserving relevant params
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

  // Base params object for pagination — null/undefined values are filtered by buildPageUrl
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
    <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      {/* Decorative background blobs */}
      <div className="pointer-events-none absolute -left-20 top-20 size-64 rounded-full bg-indigo-500/5 blur-[80px]" />
      <div className="pointer-events-none absolute right-0 top-1/2 size-64 rounded-full bg-purple-500/5 blur-[80px]" />

      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Curated Catalog</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Content operations workspace — find titles, add to the catalog, and manage published
            entries.
          </p>
        </div>

        {/* Stats pills */}
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-md border bg-card/40 px-3 py-1.5 text-sm">
            <Layers className="size-3.5 text-muted-foreground" />
            <span className="font-semibold">{stats.total}</span>
            <span className="text-xs text-muted-foreground">total entries</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-md border bg-card/40 px-3 py-1.5 text-sm">
            <Eye className="size-3.5 text-emerald-500" />
            <span className="font-semibold">{stats.published}</span>
            <span className="text-xs text-muted-foreground">published</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-md border bg-card/40 px-3 py-1.5 text-sm">
            <Film className="size-3.5 text-indigo-500" />
            <span className="font-semibold">{stats.movies}</span>
            <span className="text-xs text-muted-foreground">movies</span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-md border bg-card/40 px-3 py-1.5 text-sm">
            <Tv className="size-3.5 text-purple-500" />
            <span className="font-semibold">{stats.tv}</span>
            <span className="text-xs text-muted-foreground">TV shows</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Workspace tab switcher (Link-based — server-safe)                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="inline-flex self-start items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
        <Link
          href={discoverHref}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            isDiscover
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutGrid className="size-3.5" />
          Discover & Add
        </Link>

        <Link
          href={catalogHref}
          className={cn(
            "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            isCatalog
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Layers className="size-3.5" />
          Manage Catalog
          {allEntriesCount > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                isCatalog
                  ? "bg-muted text-muted-foreground"
                  : "bg-muted/80 text-muted-foreground/60",
              )}
            >
              {allEntriesCount}
            </span>
          )}
        </Link>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Discover workspace                                                   */}
      {/* ------------------------------------------------------------------ */}
      {isDiscover && (
        <div className="flex flex-col gap-4">
          {/* Controls — client component, wrapped in Suspense */}
          <Suspense fallback={<ControlsSkeleton />}>
            <AdminDiscoverControls queryState={queryState} genres={genres} />
          </Suspense>

          {/* ---- Browse mode ---- */}
          {queryState.mode === "browse" &&
            (discoverResults.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {discoverMeta.totalResults.toLocaleString()}
                    </span>{" "}
                    results · page {discoverMeta.page} of {discoverMeta.totalPages}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {discoverResults.map((result) => (
                    <AdminDiscoverRow
                      key={result.id}
                      result={result}
                      mediaType={queryState.mediaType}
                      genreMap={genreMap}
                      isCurated={result.isCurated}
                    />
                  ))}
                </div>

                <PaginationRow
                  currentPage={discoverMeta.page}
                  totalPages={discoverMeta.totalPages}
                  baseParams={discoverBaseParams}
                />
              </>
            ) : (
              <EmptyState
                icon={LayoutGrid}
                title="No results found"
                description="Try adjusting your filters, selecting a different genre, or changing the decade."
              />
            ))}

          {/* ---- Search mode ---- */}
          {queryState.mode === "search" &&
            (queryState.query ? (
              discoverResults.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {discoverMeta.totalResults.toLocaleString()}
                      </span>{" "}
                      results for &ldquo;{queryState.query}&rdquo;
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {discoverResults.map((result) => (
                      <AdminDiscoverRow
                        key={result.id}
                        result={result}
                        mediaType={queryState.mediaType}
                        genreMap={genreMap}
                        isCurated={result.isCurated}
                      />
                    ))}
                  </div>

                  <PaginationRow
                    currentPage={discoverMeta.page}
                    totalPages={discoverMeta.totalPages}
                    baseParams={discoverBaseParams}
                  />
                </>
              ) : (
                <EmptyState
                  icon={Search}
                  title={`No results for "${queryState.query}"`}
                  description="Try different keywords or switch to Browse mode to discover by genre and decade."
                />
              )
            ) : (
              <EmptyState
                icon={Search}
                title="Search for a title"
                description="Type a title above to search TMDB, or switch to Browse mode to discover by filters."
              />
            ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Catalog workspace                                                    */}
      {/* ------------------------------------------------------------------ */}
      {isCatalog && (
        <div className="flex flex-col gap-4">
          {/* Filters — client component, wrapped in Suspense */}
          <Suspense fallback={<FiltersSkeleton />}>
            <AdminCatalogFilters filter={catalogFilter} counts={catalogCounts} />
          </Suspense>

          {catalogEntries.length > 0 ? (
            <div className="flex flex-col gap-2">
              {catalogEntries.map((entry) => (
                <AdminCatalogRow key={entry.id} entry={entry} />
              ))}
            </div>
          ) : allEntriesCount === 0 ? (
            <EmptyState
              icon={Layers}
              title="No titles in the catalog yet"
              description="Switch to Discover & Add to find titles on TMDB and add them to the catalog."
              action={
                <Link
                  href={discoverHref}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-card/40 px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-card/60"
                >
                  <LayoutGrid className="size-3.5" />
                  Go to Discover & Add
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={Layers}
              title="No entries match this filter"
              description="Try adjusting the media type or status filter above to see more entries."
            />
          )}
        </div>
      )}
    </div>
  );
}
