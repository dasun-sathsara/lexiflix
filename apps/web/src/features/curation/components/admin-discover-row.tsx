"use client";

import { Film, Loader2, Plus, RotateCcw, Tv } from "lucide-react";
import Image from "next/image";
import { useFormStatus } from "react-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  curateTmdbItemAction,
  refreshCuratedEntryAction,
} from "@/features/curation/server/actions";
import { IMAGE_BASE_URL, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

interface AdminDiscoverRowProps {
  result: {
    id: number;
    title?: string;
    name?: string;
    poster_path: string | null;
    vote_average: number;
    release_date?: string;
    first_air_date?: string;
    genre_ids: number[];
    original_language?: string;
  };
  mediaType: "movie" | "tv";
  genreMap: Record<number, string>;
  isCurated: boolean;
}

function SubmitButton({ isCurated }: { isCurated: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={isCurated ? "ghost" : "outline"}
      size="sm"
      disabled={pending}
      className={cn(
        "gap-1.5 text-xs",
        !isCurated &&
          "border-indigo-200/60 text-indigo-600 hover:bg-indigo-50/60 hover:text-indigo-700 dark:border-indigo-800/50 dark:text-indigo-400 dark:hover:bg-indigo-950/50",
      )}
    >
      {pending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : isCurated ? (
        <RotateCcw className="size-3" />
      ) : (
        <Plus className="size-3" />
      )}
      {isCurated ? "Refresh" : "Add"}
    </Button>
  );
}

export function AdminDiscoverRow({
  result,
  mediaType,
  genreMap,
  isCurated,
}: AdminDiscoverRowProps) {
  const title = result.title ?? result.name ?? "Untitled";
  const dateStr = result.release_date ?? result.first_air_date ?? null;
  const year = dateStr ? dateStr.slice(0, 4) : null;

  const posterUrl = result.poster_path
    ? `${IMAGE_BASE_URL}${TMDB_IMAGE_SIZES.poster.sm}${result.poster_path}`
    : null;

  const genreNames = result.genre_ids
    .slice(0, 2)
    .map((id) => genreMap[id])
    .filter((name): name is string => Boolean(name));

  const action = isCurated ? refreshCuratedEntryAction : curateTmdbItemAction;

  return (
    <div className="group flex items-center gap-4 rounded-[calc(var(--radius)+2px)] p-3 transition-all hover:bg-muted/40">
      {/* Poster thumbnail */}
      <div className="relative h-16 w-[42px] shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/50">
        {posterUrl ? (
          <Image src={posterUrl} alt={title} fill className="object-cover" sizes="42px" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/50">
            {mediaType === "tv" ? <Tv className="size-4" /> : <Film className="size-4" />}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium tracking-tight text-foreground">{title}</p>
          {isCurated && (
            <span className="inline-flex shrink-0 items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              In catalog
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {year && <span className="font-medium text-foreground/80">{year}</span>}
          {result.original_language && (
            <span className="uppercase">{result.original_language}</span>
          )}
          <span className="flex items-center gap-1">
            <span className="text-amber-500">★</span> {result.vote_average.toFixed(1)}
          </span>
          {genreNames.length > 0 && (
            <div className="flex items-center gap-1.5 border-l border-border/50 pl-2 ml-1">
              {genreNames.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action form */}
      <form
        action={action}
        className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 lg:opacity-100"
      >
        <input type="hidden" name="mediaType" value={mediaType} />
        <input type="hidden" name="tmdbId" value={String(result.id)} />
        <SubmitButton isCurated={isCurated} />
      </form>
    </div>
  );
}
