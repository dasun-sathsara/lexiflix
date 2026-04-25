"use client";

import { Film, Loader2, RotateCcw, Trash2, Tv } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CuratedCatalogEntry } from "@/features/curation/lib/types";
import {
  deleteCuratedEntryAction,
  refreshCuratedEntryAction,
  saveCuratedEntryFeaturedRankAction,
  setCuratedEntryPublishedAction,
} from "@/features/curation/server/actions";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

interface AdminCatalogRowProps {
  entry: CuratedCatalogEntry;
}

export function AdminCatalogRow({ entry }: AdminCatalogRowProps) {
  const [isPending, startTransition] = useTransition();

  const [rankValue, setRankValue] = useState<string>(
    entry.featuredRank != null ? String(entry.featuredRank) : "",
  );
  const [rankDirty, setRankDirty] = useState(false);

  const posterUrl = buildTmdbImageUrl(entry.posterPath, TMDB_IMAGE_SIZES.poster.sm);

  const year = entry.releaseDate ? entry.releaseDate.slice(0, 4) : null;
  const voteAvg =
    entry.voteAverage && Number.isFinite(Number.parseFloat(entry.voteAverage))
      ? Number.parseFloat(entry.voteAverage).toFixed(1)
      : null;

  function handleRankBlur() {
    if (!rankDirty) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", entry.id);
      fd.set("featuredRank", rankValue);
      await saveCuratedEntryFeaturedRankAction(fd);
      setRankDirty(false);
    });
  }

  function handleRankKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      setRankValue(entry.featuredRank != null ? String(entry.featuredRank) : "");
      setRankDirty(false);
      e.currentTarget.blur();
    }
  }

  function handleTogglePublished() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", entry.id);
      fd.set("isPublished", entry.isPublished ? "false" : "true");
      await setCuratedEntryPublishedAction(fd);
    });
  }

  function handleRefresh() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mediaType", entry.mediaType);
      fd.set("tmdbId", String(entry.tmdbId));
      await refreshCuratedEntryAction(fd);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", entry.id);
      await deleteCuratedEntryAction(fd);
    });
  }

  return (
    <div
      className={cn(
        "group flex flex-row items-center justify-between gap-4 rounded-[calc(var(--radius)+2px)] p-3 transition-all hover:bg-muted/30 border border-transparent hover:border-border/50",
        isPending && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative h-[72px] w-[48px] shrink-0 overflow-hidden rounded-md bg-muted shadow-sm ring-1 ring-border/50">
          {posterUrl ? (
            <Image src={posterUrl} alt={entry.title} fill className="object-cover" sizes="48px" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/50">
              {entry.mediaType === "tv" ? <Tv className="size-5" /> : <Film className="size-5" />}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-base font-semibold tracking-tight text-foreground">
              {entry.title}
            </p>
            <span className="text-xs font-mono text-muted-foreground/60">#{entry.tmdbId}</span>
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
              {entry.mediaType === "tv" ? (
                <Tv className="size-3.5" />
              ) : (
                <Film className="size-3.5" />
              )}
              {entry.mediaType === "tv" ? "TV Series" : "Movie"}
            </span>
            {year && <span className="font-medium">{year}</span>}
            {voteAvg && (
              <span className="flex items-center gap-1">
                <span className="text-amber-500">★</span> {voteAvg}
              </span>
            )}
            {entry.contentRating && (
              <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {entry.contentRating}
              </span>
            )}
            {entry.genres.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 truncate">
                <span>•</span>
                {entry.genres
                  .slice(0, 3)
                  .map((g) => g.name)
                  .join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Input
            id={`rank-${entry.id}`}
            type="number"
            min={1}
            max={999}
            value={rankValue}
            onChange={(e) => {
              setRankValue(e.target.value);
              setRankDirty(true);
            }}
            onBlur={handleRankBlur}
            onKeyDown={handleRankKeyDown}
            placeholder="—"
            disabled={isPending}
            className={cn(
              "h-9 w-16 tabular-nums text-center text-sm font-medium shadow-none transition-colors",
              rankDirty && "border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
            )}
          />
          <Button
            type="button"
            variant={entry.isPublished ? "default" : "secondary"}
            onClick={handleTogglePublished}
            disabled={isPending}
            className={cn(
              "h-9 px-3 text-sm shadow-none",
              entry.isPublished &&
                "border-transparent bg-emerald-500 hover:bg-emerald-600 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700",
            )}
          >
            {entry.isPublished ? "Published" : "Hidden"}
          </Button>
        </div>

        <div className="flex items-center gap-1 opacity-100 transition-opacity">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-muted-foreground hover:text-foreground"
            disabled={isPending}
            onClick={handleRefresh}
            title="Refresh snapshot from TMDB"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            <span className="sr-only">Refresh from TMDB</span>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                disabled={isPending}
                title="Delete entry"
              >
                <Trash2 className="size-4" />
                <span className="sr-only">Delete entry</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete catalog entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove{" "}
                  <strong className="text-foreground">{entry.title}</strong> from the curated
                  catalog. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
