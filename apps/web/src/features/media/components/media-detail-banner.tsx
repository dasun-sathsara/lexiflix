"use client";

import { Calendar, Clock, ExternalLink, Film, Globe, Star, Tv } from "lucide-react";

import { MediaPosterBanner } from "@/components/common/media-poster-banner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MediaDetailPageData } from "@/features/media/types";
import { getCountryName, getLanguageName } from "@/features/media/utils";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import { formatRuntime } from "./utils";

export interface MediaDetailBannerProps {
  media: MediaDetailPageData["media"];
  analysisSummary: MediaDetailPageData["analysis"]["summary"];
  onSeasonChange: (value: string) => void;
}

export function MediaDetailBanner({
  media,
  analysisSummary,
  onSeasonChange,
}: MediaDetailBannerProps) {
  const backdropUrl = buildTmdbImageUrl(media.backdropPath, TMDB_IMAGE_SIZES.backdrop.lg);

  const showOriginalTitle = Boolean(media.originalTitle) && media.originalTitle !== media.title;
  const hasSubMeta =
    showOriginalTitle ||
    Boolean(media.originalLanguage) ||
    Boolean(media.originCountryCodes?.length);

  return (
    <MediaPosterBanner
      backdropUrl={backdropUrl}
      backdropAlt={`${media.title} backdrop`}
      actions={
        <div className="flex flex-col items-end gap-3">
          {typeof media.voteAverage === "number" ? (
            <div className="flex items-center gap-2 rounded-xl border border-foreground/10 bg-white/70 px-3 py-2 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-background/60">
              <Star className="size-5 fill-yellow-400 text-yellow-400" />
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-semibold tabular-nums text-foreground">
                  {media.voteAverage.toFixed(1)}
                  <span className="ml-1 text-xs font-normal text-foreground/50">/10</span>
                </span>
                {typeof media.voteCount === "number" ? (
                  <span className="text-[10px] uppercase tracking-wide text-foreground/55">
                    {media.voteCount.toLocaleString()} votes
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {media.imdbId ? (
            <a
              href={`https://www.imdb.com/title/${media.imdbId}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-foreground/15 bg-white/70 px-2.5 py-1 text-xs font-medium text-foreground/75 shadow-sm backdrop-blur-md transition-colors hover:bg-white/90 hover:text-foreground dark:border-white/10 dark:bg-background/60 dark:hover:bg-background/80"
            >
              View on IMDb
              <ExternalLink className="size-3 opacity-60" />
            </a>
          ) : null}

          {media.mediaType === "tv" && media.availableSeasonCount ? (
            <Select
              value={media.selectedSeasonNumber ? String(media.selectedSeasonNumber) : undefined}
              onValueChange={onSeasonChange}
            >
              <SelectTrigger
                size="sm"
                className="h-8 w-[168px] border-foreground/15 bg-white/80 px-3 text-xs font-medium text-foreground shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-background/60"
              >
                <SelectValue placeholder="Choose a season" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: media.availableSeasonCount }, (_, index) => index + 1).map(
                  (seasonNumber) => (
                    <SelectItem key={seasonNumber} value={String(seasonNumber)}>
                      Season {seasonNumber}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      }
      badges={
        <>
          <Badge
            variant="secondary"
            className="border border-indigo-300/60 bg-white/85 text-indigo-700 shadow-sm backdrop-blur-md dark:border-indigo-400/30 dark:bg-indigo-950/60 dark:text-indigo-200"
          >
            {media.mediaType === "movie" ? (
              <Film className="mr-1 size-3.5" />
            ) : (
              <Tv className="mr-1 size-3.5" />
            )}
            {media.mediaType === "movie" ? "Movie" : "TV Show"}
          </Badge>

          {media.contentCertification ? (
            <Badge
              variant="secondary"
              className="border border-foreground/15 bg-white/85 text-foreground shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-background/70"
            >
              {media.contentCertification}
            </Badge>
          ) : null}

          {analysisSummary?.averageCefrLevel ? (
            <Badge
              variant="secondary"
              className="border border-foreground/15 bg-white/85 text-foreground shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-background/70"
            >
              {analysisSummary.averageCefrLevel}
            </Badge>
          ) : null}
        </>
      }
      title={media.title}
      meta={
        <>
          {media.releaseYear ? (
            <span className="flex items-center gap-1">
              <Calendar className="size-4" />
              {media.releaseYear}
            </span>
          ) : null}
          {formatRuntime(media.runtimeMinutes) ? (
            <span className="flex items-center gap-1">
              <Clock className="size-4" />
              {formatRuntime(media.runtimeMinutes)}
            </span>
          ) : null}
        </>
      }
    >
      {media.genres.length > 0 || hasSubMeta ? (
        <div className="flex flex-col gap-2">
          {hasSubMeta ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/55">
              {showOriginalTitle ? (
                <span className="italic text-foreground/70">{media.originalTitle}</span>
              ) : null}
              {showOriginalTitle && (media.originalLanguage || media.originCountryCodes?.length) ? (
                <span className="select-none text-foreground/30">·</span>
              ) : null}
              {media.originalLanguage || media.originCountryCodes?.length ? (
                <span className="flex items-center gap-1">
                  <Globe className="size-3 shrink-0 text-foreground/40" />
                  {media.originalLanguage ? (
                    <span>{getLanguageName(media.originalLanguage)}</span>
                  ) : null}
                  {media.originalLanguage && media.originCountryCodes?.length ? (
                    <span className="text-foreground/30">·</span>
                  ) : null}
                  {media.originCountryCodes?.length ? (
                    <span>{media.originCountryCodes.map(getCountryName).join(", ")}</span>
                  ) : null}
                </span>
              ) : null}
            </div>
          ) : null}
          {media.genres.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {media.genres.map((genre) => (
                <Badge
                  key={genre}
                  variant="secondary"
                  className="border border-foreground/15 bg-white/80 text-foreground/85 shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-background/60 dark:text-foreground/90"
                >
                  {genre}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </MediaPosterBanner>
  );
}
