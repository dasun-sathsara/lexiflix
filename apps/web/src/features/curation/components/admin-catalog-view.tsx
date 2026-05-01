import { Layers, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { AppEmptyState } from "@/components/common/app-surface";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CuratedAdminCatalogFilter } from "@/features/curation/lib/admin-query";
import type { CuratedCatalogEntry } from "@/features/curation/lib/types";

import { FiltersSkeleton } from "./_utils";
import { AdminCatalogFilters } from "./admin-catalog-filters";
import { AdminCatalogRow } from "./admin-catalog-row";

export type AdminCatalogViewProps = {
  catalogFilter: CuratedAdminCatalogFilter;
  catalogCounts: { all: number; movies: number; tv: number; published: number; hidden: number };
  catalogEntries: CuratedCatalogEntry[];
  allEntriesCount: number;
  discoverHref: string;
};

/**
 * Renders the catalog view for admins to manage existing curated entries.
 */
export function AdminCatalogView({
  catalogFilter,
  catalogCounts,
  catalogEntries,
  allEntriesCount,
  discoverHref,
}: AdminCatalogViewProps) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <Suspense fallback={<FiltersSkeleton />}>
        <AdminCatalogFilters filter={catalogFilter} counts={catalogCounts} />
      </Suspense>

      {catalogEntries.length > 0 ? (
        <Card className="gap-0 rounded-[calc(var(--radius)+2px)] border bg-card/60 py-0 shadow-sm">
          <CardHeader className="gap-1.5 border-b py-3.5">
            <CardTitle className="text-base font-semibold">Catalog entries</CardTitle>
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
  );
}
