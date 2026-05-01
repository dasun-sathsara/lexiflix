import { LayoutGrid, Search } from "lucide-react";
import { Suspense } from "react";

import { AppEmptyState } from "@/components/common/app-surface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  AnnotatedTMDBResult,
  CuratedAdminQueryState,
} from "@/features/curation/lib/admin-query";
import type { Genre } from "@/lib/tmdb-shared";

import { ControlsSkeleton, PaginationRow } from "./_utils";
import { AdminDiscoverControls } from "./admin-curated-controls";
import { AdminDiscoverRow } from "./admin-discover-row";

export type AdminDiscoverViewProps = {
  queryState: CuratedAdminQueryState;
  genres: Genre[];
  genreMap: Record<number, string>;
  discoverResults: AnnotatedTMDBResult[];
  discoverMeta: { page: number; totalPages: number; totalResults: number };
  discoverBaseParams: Record<string, string | null | undefined>;
};

/**
 * Renders the discovery view for admins to search and add new media.
 */
export function AdminDiscoverView({
  queryState,
  genres,
  genreMap,
  discoverResults,
  discoverMeta,
  discoverBaseParams,
}: AdminDiscoverViewProps) {
  return (
    <div className="flex flex-col gap-4 pt-2">
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
  );
}
