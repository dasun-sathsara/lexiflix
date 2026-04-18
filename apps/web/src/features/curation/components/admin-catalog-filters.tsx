"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

    params.set("view", "catalog");
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
    <Card className="gap-0 rounded-[calc(var(--radius)+2px)] border bg-card/60 py-0 shadow-sm">
      <CardHeader className="gap-1.5 border-b py-3.5">
        <CardTitle className="text-base font-semibold">Catalog filters</CardTitle>
        <CardDescription>
          Narrow the catalog by media type and publish state without crowding the results list.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 py-3.5 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Type
          </span>
          <div className="inline-flex w-full flex-wrap items-center gap-1 rounded-2xl border bg-muted/50 p-0.75 shadow-sm">
            {typeOptions.map((opt) => {
              const isActive = filter.mediaType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateFilter("cat_type", opt.value)}
                  className={cn(
                    "inline-flex min-h-8 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs tabular-nums",
                      isActive
                        ? "bg-muted text-muted-foreground"
                        : "bg-background/70 text-muted-foreground/70",
                    )}
                  >
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Status
          </span>
          <div className="inline-flex w-full flex-wrap items-center gap-1 rounded-2xl border bg-muted/50 p-0.75 shadow-sm">
            {statusOptions.map((opt) => {
              const isActive = filter.status === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateFilter("cat_status", opt.value)}
                  className={cn(
                    "inline-flex min-h-8 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs tabular-nums",
                      isActive
                        ? "bg-muted text-muted-foreground"
                        : "bg-background/70 text-muted-foreground/70",
                    )}
                  >
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
