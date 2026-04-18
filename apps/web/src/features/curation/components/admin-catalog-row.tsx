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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CuratedCatalogEntry } from "@/features/curation/lib/types";
import {
  deleteCuratedEntryAction,
  refreshCuratedEntryAction,
  saveCuratedEntryFeaturedRankAction,
  setCuratedEntryPublishedAction,
} from "@/features/curation/server/actions";
import { IMAGE_BASE_URL, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
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

  const posterUrl = entry.posterPath
    ? `${IMAGE_BASE_URL}${TMDB_IMAGE_SIZES.poster.sm}${entry.posterPath}`
    : null;

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
        "flex flex-col gap-3 rounded-2xl border bg-background/80 px-4 py-3.5 transition-all hover:bg-card hover:shadow-sm lg:flex-row lg:items-center lg:justify-between lg:px-4.5 lg:py-4",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <div className="relative h-[76px] w-[52px] shrink-0 overflow-hidden rounded-xl border bg-muted shadow-sm">
          {posterUrl ? (
            <Image src={posterUrl} alt={entry.title} fill className="object-cover" sizes="52px" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {entry.mediaType === "tv" ? <Tv className="size-4" /> : <Film className="size-4" />}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold tracking-tight">{entry.title}</p>
            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
              #{entry.tmdbId}
            </Badge>
            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
              {entry.mediaType === "tv" ? (
                <Tv data-icon="inline-start" />
              ) : (
                <Film data-icon="inline-start" />
              )}
              {entry.mediaType === "tv" ? "TV Series" : "Movie"}
            </Badge>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {year && <span>{year}</span>}
            {voteAvg && <span>★ {voteAvg}</span>}
            {entry.contentRating && (
              <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                {entry.contentRating}
              </Badge>
            )}
          </div>

          {entry.genres.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {entry.genres.slice(0, 3).map((g) => (
                <Badge
                  key={g.id}
                  variant="secondary"
                  className="rounded-full px-2.5 py-1 text-xs font-medium"
                >
                  {g.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2.5 rounded-2xl border bg-card/60 p-2.5 sm:flex-row sm:flex-wrap sm:items-end lg:w-auto lg:min-w-[310px] lg:justify-end">
        <div className="flex min-w-[96px] flex-col gap-1">
          <label
            htmlFor={`rank-${entry.id}`}
            className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
          >
            Rank
          </label>
          <input
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
              "border-input h-9 w-full rounded-xl border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] tabular-nums focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              rankDirty &&
                "border-amber-400/70 bg-amber-50/50 ring-amber-300/40 dark:bg-amber-950/20",
            )}
          />
        </div>

        <div className="flex min-w-[120px] flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Status
          </span>
          <Button
            type="button"
            variant={entry.isPublished ? "secondary" : "outline"}
            onClick={handleTogglePublished}
            disabled={isPending}
            title={entry.isPublished ? "Click to hide" : "Click to publish"}
            className={cn(
              "h-9 justify-center rounded-xl",
              entry.isPublished &&
                "border-emerald-200/60 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-950/50",
            )}
          >
            {entry.isPublished ? "Published" : "Hidden"}
          </Button>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl text-muted-foreground hover:text-foreground"
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
                className="size-9 rounded-xl text-muted-foreground hover:text-destructive"
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
