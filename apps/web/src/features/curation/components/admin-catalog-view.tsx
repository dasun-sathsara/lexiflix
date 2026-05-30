import { GripVertical, Layers, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AppEmptyState } from "@/components/common/app-surface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CuratedAdminCatalogFilter } from "@/features/curation/lib/admin-query";
import type { CuratedCatalogEntry } from "@/features/curation/lib/types";

import { FiltersSkeleton } from "./_utils";
import { AdminCatalogFilters } from "./admin-catalog-filters";
import { AdminCatalogList } from "./admin-catalog-list";

export type AdminCatalogViewProps = {
  catalogFilter: CuratedAdminCatalogFilter;
  catalogCounts: { all: number; movies: number; tv: number; published: number; hidden: number };
  catalogEntries: CuratedCatalogEntry[];
  allEntriesCount: number;
  discoverHref: string;
};

export function AdminCatalogView({
  catalogFilter,
  catalogCounts,
  catalogEntries,
  allEntriesCount,
  discoverHref,
}: AdminCatalogViewProps) {
  const isFiltered = catalogFilter.mediaType !== "all" || catalogFilter.status !== "all";
  const draggable = !isFiltered && catalogEntries.length > 1;

  const subtitle = draggable ? (
    <span className="inline-flex items-center gap-1.5">
      <GripVertical className="size-3 opacity-60" />
      Drag to reorder
    </span>
  ) : isFiltered ? (
    "Clear filters to enable reordering"
  ) : (
    `${catalogEntries.length} entries`
  );

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<FiltersSkeleton />}>
        <AdminCatalogFilters filter={catalogFilter} counts={catalogCounts} />
      </Suspense>

      {catalogEntries.length > 0 ? (
        <Card className="gap-0 py-0 shadow-sm">
          <CardHeader className="border-b py-3.5">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">Catalog entries</CardTitle>
              <CardDescription className="text-xs">{subtitle}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <AdminCatalogList entries={catalogEntries} draggable={draggable} />
          </CardContent>
        </Card>
      ) : allEntriesCount === 0 ? (
        <AppEmptyState
          icon={Layers}
          title="No titles in the catalog yet"
          description="Switch to Discover & Add to find titles on TMDB and add them to the catalog."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={discoverHref}>
                <LayoutGrid className="size-4" />
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
  );
}
