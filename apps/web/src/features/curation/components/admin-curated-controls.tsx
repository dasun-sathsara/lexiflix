"use client";

import { RotateCcw, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CuratedAdminMode,
  type CuratedAdminQueryState,
  getAdminSortOptions,
  getDefaultAdminSort,
} from "@/features/curation/lib/admin-query";
import type { Genre, TMDBMediaType } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

interface AdminDiscoverControlsProps {
  queryState: CuratedAdminQueryState;
  genres: Genre[];
}

const SORT_LABELS: Record<string, string> = {
  "popularity.desc": "Most Popular",
  "vote_average.desc": "Top Rated",
  "primary_release_date.desc": "Newest",
  "first_air_date.desc": "Latest",
};

const DECADES = [2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950] as const;

// ---------------------------------------------------------------------------
// Compact Segment (mini pill toggle)
// ---------------------------------------------------------------------------

function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border/80 bg-muted/40 p-0.5 shadow-xs">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "inline-flex items-center justify-center rounded px-2 py-1 text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

/**
 * Compact toolbar for the admin Discover view. Selects push updates to the
 * URL immediately; the search input commits on Enter.
 */
export function AdminDiscoverControls({ queryState, genres }: AdminDiscoverControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Local state for search input only (needs explicit commit)
  const [query, setQuery] = useState<string>(queryState.query);
  const prevQueryRef = useRef(queryState);
  useEffect(() => {
    if (prevQueryRef.current !== queryState) {
      setQuery(queryState.query);
      prevQueryRef.current = queryState;
    }
  }, [queryState]);

  const push = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams],
  );

  function handleModeChange(next: CuratedAdminMode) {
    push({
      view: "discover",
      mode: next,
      ...(next === "search" ? { genre: null, sort: null, decade: null } : { q: null }),
    });
  }

  function handleMediaTypeChange(next: TMDBMediaType) {
    push({
      view: "discover",
      type: next,
      // Reset filters tied to the previous media type
      genre: null,
      sort: null,
    });
  }

  function handleSearchCommit() {
    const value = query.trim();
    push({ view: "discover", mode: "search", q: value || null });
  }

  function handleGenreChange(next: string) {
    push({ view: "discover", genre: next === "all" ? null : next });
  }

  function handleSortChange(next: string) {
    const defaultSort = getDefaultAdminSort(queryState.mediaType);
    push({ view: "discover", sort: next === defaultSort ? null : next });
  }

  function handleDecadeChange(next: string) {
    push({ view: "discover", decade: next === "all" ? null : next });
  }

  function handleReset() {
    startTransition(() => {
      router.push(`${pathname}?view=discover`);
    });
    setQuery("");
  }

  const sortOptions = getAdminSortOptions(queryState.mediaType);
  const hasActiveFilters =
    queryState.query !== "" ||
    queryState.genreId != null ||
    queryState.decade != null ||
    queryState.mode !== "search" ||
    queryState.mediaType !== "movie" ||
    queryState.sortBy !== getDefaultAdminSort(queryState.mediaType);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[calc(var(--radius)+2px)] border border-border/80 bg-card/70 px-3 py-2 shadow-xs">
      <Segment<CuratedAdminMode>
        options={[
          { value: "search", label: "Search" },
          { value: "browse", label: "Browse" },
        ]}
        value={queryState.mode}
        onChange={handleModeChange}
      />

      <Segment<TMDBMediaType>
        options={[
          { value: "movie", label: "Movies" },
          { value: "tv", label: "TV" },
        ]}
        value={queryState.mediaType}
        onChange={handleMediaTypeChange}
      />

      <div className="mx-0.5 hidden h-5 w-px bg-border/60 sm:block" />

      {queryState.mode === "search" ? (
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search titles on TMDB…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearchCommit();
            }}
            onBlur={() => {
              if (query.trim() !== queryState.query) {
                handleSearchCommit();
              }
            }}
            className="h-8 border-border/80 pl-8 text-sm shadow-xs"
          />
        </div>
      ) : (
        <>
          <Select value={queryState.genreId ?? "all"} onValueChange={handleGenreChange}>
            <SelectTrigger size="sm" className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genres</SelectItem>
              {genres.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={queryState.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger size="sm" className="h-8 w-[150px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {SORT_LABELS[opt] ?? opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={queryState.decade != null ? String(queryState.decade) : "all"}
            onValueChange={handleDecadeChange}
          >
            <SelectTrigger size="sm" className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Decade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any decade</SelectItem>
              {DECADES.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        {hasActiveFilters ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={handleReset}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  );
}
