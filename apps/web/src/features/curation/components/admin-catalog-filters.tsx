"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { CuratedAdminCatalogFilter } from "@/features/curation/lib/admin-query";
import { cn } from "@/lib/utils";

interface AdminCatalogFiltersProps {
  filter: CuratedAdminCatalogFilter;
  counts: {
    all: number;
    movies: number;
    tv: number;
    published: number;
    hidden: number;
  };
}

type TypeOption = {
  value: CuratedAdminCatalogFilter["mediaType"];
  label: string;
  count: number;
};

type StatusOption = {
  value: CuratedAdminCatalogFilter["status"];
  label: string;
  count: number;
};

export function AdminCatalogFilters({ filter, counts }: AdminCatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    // Always stay on the catalog view
    params.set("view", "catalog");
    // Reset pagination when filter changes
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`);
  }

  const typeOptions: TypeOption[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "movie", label: "Movies", count: counts.movies },
    { value: "tv", label: "TV", count: counts.tv },
  ];

  const statusOptions: StatusOption[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "published", label: "Published", count: counts.published },
    { value: "hidden", label: "Hidden", count: counts.hidden },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Media type segmented filter */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Type</span>
        <div className="inline-flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
          {typeOptions.map((opt) => {
            const isActive = filter.mediaType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateFilter("cat_type", opt.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
                <span
                  className={cn(
                    "tabular-nums text-[10px]",
                    isActive ? "text-muted-foreground" : "text-muted-foreground/50",
                  )}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status segmented filter */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Status</span>
        <div className="inline-flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
          {statusOptions.map((opt) => {
            const isActive = filter.status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateFilter("cat_status", opt.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
                <span
                  className={cn(
                    "tabular-nums text-[10px]",
                    isActive ? "text-muted-foreground" : "text-muted-foreground/50",
                  )}
                >
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
