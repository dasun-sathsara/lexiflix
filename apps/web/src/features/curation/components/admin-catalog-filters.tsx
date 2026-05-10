"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

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

type SegmentOption<T extends string> = {
  value: T;
  label: string;
  count: number;
};

function FilterSegment<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="inline-flex items-center gap-0.5 rounded-md border border-border/80 bg-muted/40 p-0.5 shadow-xs">
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
              <span
                className={cn(
                  "rounded px-1 py-0 text-[10px] tabular-nums leading-tight",
                  isActive
                    ? "bg-muted text-muted-foreground"
                    : "bg-background/50 text-muted-foreground/70",
                )}
              >
                {opt.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Inline compact filter bar for the catalog view.
 */
export function AdminCatalogFilters({ filter, counts }: AdminCatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.set("view", "catalog");
    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const typeOptions: SegmentOption<CuratedAdminCatalogFilter["mediaType"]>[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "movie", label: "Movies", count: counts.movies },
    { value: "tv", label: "TV", count: counts.tv },
  ];

  const statusOptions: SegmentOption<CuratedAdminCatalogFilter["status"]>[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "published", label: "Published", count: counts.published },
    { value: "hidden", label: "Hidden", count: counts.hidden },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[calc(var(--radius)+2px)] border border-border/80 bg-card/70 px-4 py-2.5 shadow-xs">
      <FilterSegment
        label="Type"
        options={typeOptions}
        value={filter.mediaType}
        onChange={(v) => updateFilter("cat_type", v)}
      />
      <FilterSegment
        label="Status"
        options={statusOptions}
        value={filter.status}
        onChange={(v) => updateFilter("cat_status", v)}
      />
    </div>
  );
}
