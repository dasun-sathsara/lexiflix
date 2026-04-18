"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function AdminDiscoverControls({ queryState, genres }: AdminDiscoverControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<CuratedAdminMode>(queryState.mode);
  const [mediaType, setMediaType] = useState<TMDBMediaType>(queryState.mediaType);
  const [query, setQuery] = useState<string>(queryState.query);
  const [genreId, setGenreId] = useState<string>(queryState.genreId ?? "all");
  const [sortBy, setSortBy] = useState<string>(queryState.sortBy);
  const [decade, setDecade] = useState<string>(
    queryState.decade != null ? String(queryState.decade) : "all",
  );

  // Sync local state when queryState changes after navigation
  const prevQueryRef = useRef(queryState);
  useEffect(() => {
    if (prevQueryRef.current !== queryState) {
      setMode(queryState.mode);
      setMediaType(queryState.mediaType);
      setQuery(queryState.query);
      setGenreId(queryState.genreId ?? "all");
      setSortBy(queryState.sortBy);
      setDecade(queryState.decade != null ? String(queryState.decade) : "all");
      prevQueryRef.current = queryState;
    }
  }, [queryState]);

  function handleMediaTypeChange(newType: TMDBMediaType) {
    setMediaType(newType);
    // Genre IDs differ between movie and TV — reset to avoid stale filter
    setGenreId("all");
    setSortBy(getDefaultAdminSort(newType));
  }

  function buildApplyUrl(): string {
    const params = new URLSearchParams(searchParams.toString());

    params.set("view", "discover");
    params.set("mode", mode);
    params.set("type", mediaType);
    params.delete("page");

    if (mode === "search") {
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      params.delete("genre");
      params.delete("sort");
      params.delete("decade");
    } else {
      params.delete("q");

      if (genreId && genreId !== "all") {
        params.set("genre", genreId);
      } else {
        params.delete("genre");
      }

      const defaultSort = getDefaultAdminSort(mediaType);
      if (sortBy && sortBy !== defaultSort) {
        params.set("sort", sortBy);
      } else {
        params.delete("sort");
      }

      if (decade && decade !== "all") {
        params.set("decade", decade);
      } else {
        params.delete("decade");
      }
    }

    return `${pathname}?${params.toString()}`;
  }

  function handleApply() {
    router.push(buildApplyUrl());
  }

  function handleReset() {
    const params = new URLSearchParams();
    params.set("view", "discover");
    router.push(`${pathname}?${params.toString()}`);
    setMode("search");
    setMediaType("movie");
    setQuery("");
    setGenreId("all");
    setSortBy(getDefaultAdminSort("movie"));
    setDecade("all");
  }

  const sortOptions = getAdminSortOptions(mediaType);

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card/40 p-4">
      {/* Row 1: Mode toggle + Media type toggle */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Mode toggle */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Mode</span>
          <div className="inline-flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
            {(["search", "browse"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  mode === m
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "search" ? "Search by Title" : "Browse & Discover"}
              </button>
            ))}
          </div>
        </div>

        {/* Media type toggle */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Type</span>
          <div className="inline-flex items-center gap-0.5 rounded-lg border bg-muted/50 p-0.5">
            {(["movie", "tv"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleMediaTypeChange(t)}
                className={cn(
                  "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  mediaType === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "movie" ? "Movies" : "TV Shows"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Search input or browse filters */}
      {mode === "search" ? (
        <div className="flex items-center gap-2">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search titles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApply();
              }}
              className="pl-8 text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          {/* Genre select */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Genre</Label>
            <Select value={genreId} onValueChange={setGenreId}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue placeholder="All genres" />
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
          </div>

          {/* Sort select */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-8 w-36 text-xs">
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
          </div>

          {/* Decade select */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Decade</Label>
            <Select value={decade} onValueChange={setDecade}>
              <SelectTrigger className="h-8 w-28 text-xs">
                <SelectValue placeholder="Any decade" />
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
          </div>
        </div>
      )}

      {/* Row 3: Apply + Reset */}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleApply} className="h-8 text-xs shadow-sm">
          Apply Filters
        </Button>
        <Button size="sm" variant="ghost" onClick={handleReset} className="h-8 text-xs">
          Reset
        </Button>
      </div>
    </div>
  );
}
