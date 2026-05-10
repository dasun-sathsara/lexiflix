import { LayoutGrid, Search } from "lucide-react";
import { Suspense } from "react";

import { AppEmptyState } from "@/components/common/app-surface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export function AdminDiscoverView({
  queryState,
  genres,
  genreMap,
  discoverResults,
  discoverMeta,
  discoverBaseParams,
}: AdminDiscoverViewProps) {
  const hasResults = discoverResults.length > 0;
  const showBrowse = queryState.mode === "browse";
  const showSearch = queryState.mode === "search";

  const resultsMeta = `${discoverMeta.totalResults.toLocaleString()} results · page ${discoverMeta.page} of ${discoverMeta.totalPages}`;

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<ControlsSkeleton />}>
        <AdminDiscoverControls queryState={queryState} genres={genres} />
      </Suspense>

      {showBrowse && hasResults ? (
        <Card className="gap-0 py-0 shadow-sm">
          <CardHeader className="border-b py-3.5">
            <CardTitle className="text-base">Discovery results</CardTitle>
            <CardDescription>{resultsMeta}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border/60 p-0">
            {discoverResults.map((result) => (
              <AdminDiscoverRow
                key={result.id}
                result={result}
                mediaType={queryState.mediaType}
                genreMap={genreMap}
                isCurated={result.isCurated}
              />
            ))}
          </CardContent>
          <div className="px-5 pb-4">
            <PaginationRow
              currentPage={discoverMeta.page}
              totalPages={discoverMeta.totalPages}
              baseParams={discoverBaseParams}
            />
          </div>
        </Card>
      ) : null}

      {showBrowse && !hasResults ? (
        <AppEmptyState
          icon={LayoutGrid}
          title="No results found"
          description="Try adjusting your filters, selecting a different genre, or changing the decade."
        />
      ) : null}

      {showSearch && queryState.query && hasResults ? (
        <Card className="gap-0 py-0 shadow-sm">
          <CardHeader className="border-b py-3.5">
            <CardTitle className="text-base">Search results</CardTitle>
            <CardDescription>
              {discoverMeta.totalResults.toLocaleString()} results for &ldquo;{queryState.query}
              &rdquo;
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border/60 p-0">
            {discoverResults.map((result) => (
              <AdminDiscoverRow
                key={result.id}
                result={result}
                mediaType={queryState.mediaType}
                genreMap={genreMap}
                isCurated={result.isCurated}
              />
            ))}
          </CardContent>
          <div className="px-5 pb-4">
            <PaginationRow
              currentPage={discoverMeta.page}
              totalPages={discoverMeta.totalPages}
              baseParams={discoverBaseParams}
            />
          </div>
        </Card>
      ) : null}

      {showSearch && queryState.query && !hasResults ? (
        <AppEmptyState
          icon={Search}
          title={`No results for "${queryState.query}"`}
          description="Try different keywords or switch to Browse mode to discover by genre and decade."
        />
      ) : null}

      {showSearch && !queryState.query ? (
        <AppEmptyState
          icon={Search}
          title="Search for a title"
          description="Type a title above to search TMDB, or switch to Browse mode to discover by filters."
        />
      ) : null}
    </div>
  );
}
