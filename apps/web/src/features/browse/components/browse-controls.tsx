"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Genre } from "@/lib/tmdb-shared";

interface BrowseControlsProps {
  genres: Genre[];
}

export function BrowseControls({ genres }: BrowseControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [, startTransition] = useTransition();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get("q") || "";
      if (searchTerm !== currentQ) {
        // If searching, we clear filters to avoid confusion
        const params = new URLSearchParams(searchParams.toString());
        if (searchTerm) {
          params.set("q", searchTerm);
          // Clear discovery filters
          params.delete("sort_by");
          params.delete("with_genres");
          params.delete("decade");
          params.delete("primary_release_date.gte");
          params.delete("primary_release_date.lte");
          params.delete("first_air_date.gte");
          params.delete("first_air_date.lte");
        } else {
          params.delete("q");
        }
        params.delete("page"); // Reset page

        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`);
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, pathname, router, searchParams]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Always reset page on filter change
      params.delete("page");

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [searchParams, pathname, router],
  );

  const currentType = searchParams.get("type") || "movie";
  const currentGenre = searchParams.get("with_genres") || "all";
  const currentSort = searchParams.get("sort_by") || "popularity.desc";
  const currentDecade = searchParams.get("decade") || "all";

  const isSearching = !!searchTerm;

  return (
    <div className="flex flex-col gap-5">
      <Tabs
        defaultValue="movie"
        value={currentType}
        onValueChange={(val) => {
          const updates: Record<string, string | null> = {
            type: val,
            with_genres: null, // Reset genre as IDs differ
          };

          // Re-apply decade filter for the new type if active
          if (currentDecade !== "all") {
            const startYear = Number.parseInt(currentDecade, 10);
            const endYear = startYear + 9;
            const isNewTypeTv = val === "tv";
            const newKeyDate = isNewTypeTv ? "first_air_date" : "primary_release_date";
            const oldKeyDate = isNewTypeTv ? "primary_release_date" : "first_air_date";

            updates[`${newKeyDate}.gte`] = `${startYear}-01-01`;
            updates[`${newKeyDate}.lte`] = `${endYear}-12-31`;
            updates[`${oldKeyDate}.gte`] = null;
            updates[`${oldKeyDate}.lte`] = null;
          }

          updateParams(updates);
        }}
        className="w-full md:w-auto"
      >
        <TabsList>
          <TabsTrigger value="movie">Movies</TabsTrigger>
          <TabsTrigger value="tv">TV Shows</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Select
            disabled={isSearching}
            value={currentGenre}
            onValueChange={(val) => updateParams({ with_genres: val === "all" ? null : val })}
          >
            <SelectTrigger className="w-full min-w-[11rem]">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {genres.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            disabled={isSearching}
            value={currentSort}
            onValueChange={(val) => updateParams({ sort_by: val })}
          >
            <SelectTrigger className="w-full min-w-[11rem]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity.desc">Most Popular</SelectItem>
              <SelectItem value="vote_average.desc">Top Rated</SelectItem>
              <SelectItem value="primary_release_date.desc">Newest Releases</SelectItem>
            </SelectContent>
          </Select>

          <Select
            disabled={isSearching}
            value={currentDecade}
            onValueChange={(val) => {
              if (val === "all") {
                updateParams({
                  decade: null,
                  "primary_release_date.gte": null,
                  "primary_release_date.lte": null,
                  "first_air_date.gte": null,
                  "first_air_date.lte": null,
                });
              } else {
                const startYear = Number.parseInt(val, 10);
                const endYear = startYear + 9;
                const isTv = currentType === "tv";
                const keyDate = isTv ? "first_air_date" : "primary_release_date";

                updateParams({
                  decade: val,
                  [`${keyDate}.gte`]: `${startYear}-01-01`,
                  [`${keyDate}.lte`]: `${endYear}-12-31`,
                  // Clear the OTHER type's date filters to be safe, though switching tabs handles this usually
                  [isTv ? "primary_release_date.gte" : "first_air_date.gte"]: null,
                  [isTv ? "primary_release_date.lte" : "first_air_date.lte"]: null,
                });
              }
            }}
          >
            <SelectTrigger className="w-full min-w-[11rem]">
              <SelectValue placeholder="Decade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Decades</SelectItem>
              {["2020", "2010", "2000", "1990", "1980", "1970", "1960", "1950"].map((decade) => (
                <SelectItem key={decade} value={decade}>
                  {decade}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search titles"
            placeholder="Search Titles…"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
