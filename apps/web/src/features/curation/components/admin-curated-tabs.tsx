import { Eye, Film, Layers, LayoutGrid, Search, Tv } from "lucide-react";
import Link from "next/link";
import { type ComponentType, type ReactNode, Suspense } from "react";

import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
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

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/50 px-5 py-10 text-center shadow-sm">
      <div className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold">{title}</p>
        <p className="mx-auto max-w-sm text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ControlsSkeleton() {
  return <div className="h-[184px] animate-pulse rounded-2xl border bg-card/50" />;
}

function FiltersSkeleton() {
  return <div className="h-[132px] animate-pulse rounded-2xl border bg-card/50" />;
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
            className="inline-flex items-center gap-1.5 rounded-xl border bg-card/70 px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-card hover:shadow-md"
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
            className="inline-flex items-center gap-1.5 rounded-xl border bg-card/70 px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-card hover:shadow-md"
          >
            Next →
          </Link>
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
    <AppPageShell className="gap-6 py-6">
      <div className="pointer-events-none absolute -left-20 top-20 size-64 rounded-full bg-indigo-500/5 blur-[80px]" />
      <div className="pointer-events-none absolute right-0 top-1/2 size-64 rounded-full bg-purple-500/5 blur-[80px]" />

      <section className="flex flex-col gap-4">
        <AppPageHeader
          eyebrow={
            <>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-medium">
                Curation Workspace
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-medium">
                Admin
              </Badge>
            </>
          }
          heading="Curated Catalog"
          description="Content operations workspace — find titles, add to the catalog, and manage published entries."
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border bg-card/70 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="size-4" />
              Total entries
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[2rem] leading-none font-semibold tabular-nums">
                {stats.total}
              </span>
              <span className="pb-0.5 text-xs text-muted-foreground">catalog items</span>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/70 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="size-4 text-emerald-500" />
              Published
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[2rem] leading-none font-semibold tabular-nums">
                {stats.published}
              </span>
              <span className="pb-0.5 text-xs text-muted-foreground">live titles</span>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/70 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Film className="size-4 text-indigo-500" />
              Movies
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[2rem] leading-none font-semibold tabular-nums">
                {stats.movies}
              </span>
              <span className="pb-0.5 text-xs text-muted-foreground">film entries</span>
            </div>
          </div>

          <div className="rounded-2xl border bg-card/70 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tv className="size-4 text-purple-500" />
              TV shows
            </div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-[2rem] leading-none font-semibold tabular-nums">
                {stats.tv}
              </span>
              <span className="pb-0.5 text-xs text-muted-foreground">series entries</span>
            </div>
          </div>
        </div>
      </section>

      <div className="inline-flex self-start items-center gap-1 rounded-2xl border bg-muted/50 p-0.75 shadow-sm">
        <Link
          href={discoverHref}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-1.75 text-sm font-medium transition-all",
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
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-1.75 text-sm font-medium transition-all",
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
      </div>

      {isDiscover && (
        <div className="flex flex-col gap-4">
          <Suspense fallback={<ControlsSkeleton />}>
            <AdminDiscoverControls queryState={queryState} genres={genres} />
          </Suspense>

          {queryState.mode === "browse" &&
            (discoverResults.length > 0 ? (
              <Card className="gap-0 rounded-2xl border bg-card/60 py-0 shadow-sm">
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
              <EmptyState
                icon={LayoutGrid}
                title="No results found"
                description="Try adjusting your filters, selecting a different genre, or changing the decade."
              />
            ))}

          {queryState.mode === "search" &&
            (queryState.query ? (
              discoverResults.length > 0 ? (
                <Card className="gap-0 rounded-2xl border bg-card/60 py-0 shadow-sm">
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

      {isCatalog && (
        <div className="flex flex-col gap-4">
          <Suspense fallback={<FiltersSkeleton />}>
            <AdminCatalogFilters filter={catalogFilter} counts={catalogCounts} />
          </Suspense>

          {catalogEntries.length > 0 ? (
            <Card className="gap-0 rounded-2xl border bg-card/60 py-0 shadow-sm">
              <CardHeader className="gap-1.5 border-b py-3.5">
                <CardTitle className="text-base font-semibold">Catalog entries</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review ordering, publish status, and TMDB snapshots without compressing the row
                  metadata.
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 py-3.5">
                {catalogEntries.map((entry) => (
                  <AdminCatalogRow key={entry.id} entry={entry} />
                ))}
              </CardContent>
            </Card>
          ) : allEntriesCount === 0 ? (
            <EmptyState
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
            <EmptyState
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
