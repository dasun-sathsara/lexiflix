"use client";

import { Check, Film, Loader2, Plus, RotateCcw, Tv } from "lucide-react";
import Image from "next/image";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  curateTmdbItemAction,
  refreshCuratedEntryAction,
} from "@/features/curation/server/actions";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
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
        "h-7 gap-1.5 px-2 text-xs",
        !isCurated &&
          "border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
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

  const posterUrl = buildTmdbImageUrl(result.poster_path, TMDB_IMAGE_SIZES.poster.sm);

  const genreNames = result.genre_ids
    .slice(0, 2)
    .map((id) => genreMap[id])
    .filter((name): name is string => Boolean(name));

  const action = isCurated ? refreshCuratedEntryAction : curateTmdbItemAction;
  const TypeIcon = mediaType === "tv" ? Tv : Film;

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30">
      <div className="relative h-[54px] w-[36px] shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60">
        {posterUrl ? (
          <Image src={posterUrl} alt={title} fill className="object-cover" sizes="36px" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/50">
            <TypeIcon className="size-4" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
          {isCurated ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-emerald-200/60 bg-emerald-500/10 px-1 py-0 text-[10px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300">
              <Check className="size-2.5" />
              In catalog
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <TypeIcon className="size-3" />
            {mediaType === "tv" ? "TV" : "Movie"}
          </span>
          {year ? (
            <>
              <span className="text-border">·</span>
              <span className="tabular-nums">{year}</span>
            </>
          ) : null}
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-0.5 tabular-nums">
            <span className="text-amber-500">★</span>
            {result.vote_average.toFixed(1)}
          </span>
          {result.original_language ? (
            <>
              <span className="text-border">·</span>
              <span className="uppercase">{result.original_language}</span>
            </>
          ) : null}
          {genreNames.length > 0 ? (
            <>
              <span className="text-border">·</span>
              <span className="truncate">{genreNames.join(", ")}</span>
            </>
          ) : null}
        </div>
      </div>

      <form action={action} className="shrink-0">
        <input type="hidden" name="mediaType" value={mediaType} />
        <input type="hidden" name="tmdbId" value={String(result.id)} />
        <SubmitButton isCurated={isCurated} />
      </form>
    </div>
  );
}
