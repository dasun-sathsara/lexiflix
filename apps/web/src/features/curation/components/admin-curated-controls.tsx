"use client";

import { SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type CuratedAdminQueryState,
  getAdminSortOptions,
  getDefaultAdminSort,
} from "@/features/curation/lib/admin-query";
import type { Genre } from "@/lib/tmdb";

type AdminCuratedControlsProps = {
  movieGenres: Genre[];
  tvGenres: Genre[];
  state: CuratedAdminQueryState;
};

type DraftState = CuratedAdminQueryState;

const DECADE_OPTIONS = [2020, 2010, 2000, 1990, 1980, 1970, 1960, 1950] as const;

export function AdminCuratedControls({ movieGenres, tvGenres, state }: AdminCuratedControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [draft, setDraft] = useState<DraftState>(state);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraft(state);
  }, [state]);

  const activeGenres = draft.mediaType === "movie" ? movieGenres : tvGenres;
  const sortOptions = getAdminSortOptions(draft.mediaType);

  function pushDraft(nextState: DraftState) {
    const params = new URLSearchParams();
    params.set("mode", nextState.mode);
    params.set("type", nextState.mediaType);

    if (nextState.mode === "search") {
      if (nextState.query.trim().length > 0) {
        params.set("q", nextState.query.trim());
      }
    } else {
      if (nextState.genreId) {
        params.set("genre", nextState.genreId);
      }

      if (nextState.sortBy !== getDefaultAdminSort(nextState.mediaType)) {
        params.set("sort", nextState.sortBy);
      }

      if (nextState.decade) {
        params.set("decade", String(nextState.decade));
      }
    }

    if (nextState.page > 1) {
      params.set("page", String(nextState.page));
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function resetDraft() {
    const nextState: DraftState = {
      mode: draft.mode,
      mediaType: draft.mediaType,
      query: "",
      page: 1,
      genreId: null,
      sortBy: getDefaultAdminSort(draft.mediaType),
      decade: null,
    };

    setDraft(nextState);
    pushDraft(nextState);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pushDraft({
      ...draft,
      page: 1,
    });
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">TMDB source</Badge>
            <p className="text-sm text-muted-foreground">
              Search uses title lookup. Browse uses discover filters and sort order.
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Query Mode
              </p>
              <Tabs
                value={draft.mode}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    mode: value === "browse" ? "browse" : "search",
                    page: 1,
                  }))
                }
              >
                <TabsList>
                  <TabsTrigger value="search">
                    <SearchIcon data-icon="inline-start" />
                    Search
                  </TabsTrigger>
                  <TabsTrigger value="browse">
                    <SlidersHorizontalIcon data-icon="inline-start" />
                    Browse
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Media Type
              </p>
              <Tabs
                value={draft.mediaType}
                onValueChange={(value) =>
                  setDraft((current) => {
                    const nextMediaType = value === "tv" ? "tv" : "movie";

                    return {
                      ...current,
                      mediaType: nextMediaType,
                      genreId: null,
                      sortBy: getDefaultAdminSort(nextMediaType),
                      page: 1,
                    };
                  })
                }
              >
                <TabsList>
                  <TabsTrigger value="movie">Movies</TabsTrigger>
                  <TabsTrigger value="tv">TV Shows</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={resetDraft} disabled={isPending}>
            Reset
          </Button>
          <Button type="submit" disabled={isPending}>
            {draft.mode === "search" ? <SearchIcon data-icon="inline-start" /> : null}
            Apply
          </Button>
        </div>
      </div>

      <Separator />

      {draft.mode === "search" ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="curated-search">
              Title Query
            </label>
            <Input
              id="curated-search"
              value={draft.query}
              placeholder={draft.mediaType === "movie" ? "Search movies" : "Search TV shows"}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  query: event.target.value,
                }))
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="search-page">
              Page
            </label>
            <Input
              id="search-page"
              type="number"
              min={1}
              max={500}
              value={String(draft.page)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  page: Math.max(1, Number.parseInt(event.target.value || "1", 10) || 1),
                }))
              }
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Genre</p>
            <Select
              value={draft.genreId ?? "all"}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  genreId: value === "all" ? null : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All genres" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All genres</SelectItem>
                  {activeGenres.map((genre) => (
                    <SelectItem key={genre.id} value={String(genre.id)}>
                      {genre.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Sort</p>
            <Select
              value={draft.sortBy}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  sortBy: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort results" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {sortOptions.map((sortValue) => (
                    <SelectItem key={sortValue} value={sortValue}>
                      {sortValue === "popularity.desc"
                        ? "Most popular"
                        : sortValue === "vote_average.desc"
                          ? "Top rated"
                          : "Newest release"}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Decade</p>
            <Select
              value={draft.decade ? String(draft.decade) : "all"}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  decade: value === "all" ? null : Number.parseInt(value, 10),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All decades" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All decades</SelectItem>
                  {DECADE_OPTIONS.map((decade) => (
                    <SelectItem key={decade} value={String(decade)}>
                      {decade}s
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="browse-page">
              Page
            </label>
            <Input
              id="browse-page"
              type="number"
              min={1}
              max={500}
              value={String(draft.page)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  page: Math.max(1, Number.parseInt(event.target.value || "1", 10) || 1),
                }))
              }
            />
          </div>
        </div>
      )}
    </form>
  );
}
