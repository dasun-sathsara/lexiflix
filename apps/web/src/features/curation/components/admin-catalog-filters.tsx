"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useReportNavigationPending } from "@/components/common/navigation-progress";
import type { CuratedAdminCatalogFilter } from "@/features/curation/types";
import { cn } from "@/lib/ui/cn";

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
  pendingValue,
  disabled,
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  pendingValue: T | null;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="inline-flex items-center gap-0.5 rounded-md border border-border/80 bg-muted/40 p-0.5 shadow-xs">
        {options.map((opt) => {
          const isActive = value === opt.value;
          const isPendingOption = pendingValue === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
              {isPendingOption ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : (
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
              )}
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
  const [isPending, startTransition] = useTransition();
  const [pendingSelection, setPendingSelection] = useState<{ key: string; value: string } | null>(
    null,
  );

  useReportNavigationPending(isPending);

  useEffect(() => {
    if (!isPending) {
      setPendingSelection(null);
    }
  }, [isPending]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.set("view", "catalog");
    params.delete("page");

    setPendingSelection({ key, value });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function pendingValueFor<T extends string>(key: string): T | null {
    return pendingSelection?.key === key ? (pendingSelection.value as T) : null;
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
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[calc(var(--radius)+2px)] border border-border/80 bg-card/70 px-4 py-2.5 shadow-xs"
      aria-busy={isPending}
    >
      <FilterSegment
        label="Type"
        options={typeOptions}
        value={filter.mediaType}
        onChange={(v) => updateFilter("cat_type", v)}
        pendingValue={pendingValueFor<CuratedAdminCatalogFilter["mediaType"]>("cat_type")}
        disabled={isPending}
      />
      <FilterSegment
        label="Status"
        options={statusOptions}
        value={filter.status}
        onChange={(v) => updateFilter("cat_status", v)}
        pendingValue={pendingValueFor<CuratedAdminCatalogFilter["status"]>("cat_status")}
        disabled={isPending}
      />
    </div>
  );
}
