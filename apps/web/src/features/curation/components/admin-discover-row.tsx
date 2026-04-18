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
    <div className="flex items-center gap-3 rounded-[calc(var(--radius)+2px)] border bg-card/40 p-3 transition-all hover:bg-card/60 hover:shadow-sm">
      {/* Poster thumbnail */}
      <div className="relative h-[60px] w-10 shrink-0 overflow-hidden rounded-xl border bg-muted">
        {posterUrl ? (
          <Image src={posterUrl} alt={title} fill className="object-cover" sizes="40px" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {mediaType === "tv" ? <Tv className="size-4" /> : <Film className="size-4" />}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-semibold tracking-tight">{title}</p>
          {isCurated && (
            <span className="inline-flex shrink-0 items-center rounded-md border border-emerald-200/50 bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-600 dark:border-emerald-800/50 dark:text-emerald-400">
              In catalog
            </span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {year && <span>{year}</span>}
          {result.original_language && (
            <span className="uppercase">{result.original_language}</span>
          )}
          <span>★ {result.vote_average.toFixed(1)}</span>
          {genreNames.map((name) => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Action form */}
      <form action={action} className="shrink-0">
        <input type="hidden" name="mediaType" value={mediaType} />
        <input type="hidden" name="tmdbId" value={String(result.id)} />
        <SubmitButton isCurated={isCurated} />
      </form>
    </div>
  );
}
