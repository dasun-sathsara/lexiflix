"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="gap-0 rounded-[calc(var(--radius)+2px)] border bg-card/60 py-0 shadow-sm">
      <CardHeader className="gap-1.5 border-b py-3.5">
        <CardTitle className="text-base font-semibold">Discovery controls</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 py-3.5">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Mode
            </span>
            <div className="inline-flex flex-wrap items-center gap-1 rounded-[calc(var(--radius)+2px)] border bg-muted/50 p-0.75 shadow-sm">
              {(["search", "browse"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "inline-flex min-h-8 items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-all",
                    mode === m
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {m === "search" ? "Search" : "Browse"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Type
            </span>
            <div className="inline-flex flex-wrap items-center gap-1 rounded-[calc(var(--radius)+2px)] border bg-muted/50 p-0.75 shadow-sm">
              {(["movie", "tv"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleMediaTypeChange(t)}
                  className={cn(
                    "inline-flex min-h-8 items-center justify-center rounded-md px-2.5 py-1.5 text-sm font-medium transition-all",
                    mediaType === t
                      ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  {t === "movie" ? "Movies" : "TV Shows"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {mode === "search" ? (
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Title Search
            </Label>
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search titles..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApply();
                }}
                className="pl-10 shadow-sm"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 max-w-3xl">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Genre
              </Label>
              <Select value={genreId} onValueChange={setGenreId}>
                <SelectTrigger className="w-full shadow-sm">
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

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Sort by
              </Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full shadow-sm">
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

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Decade
              </Label>
              <Select value={decade} onValueChange={setDecade}>
                <SelectTrigger className="w-full shadow-sm">
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

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button size="sm" onClick={handleApply}>
            Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
