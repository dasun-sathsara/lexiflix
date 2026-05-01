"use client";

import { ArrowLeft, BookOpen, Calendar, Clock, Film, Loader2, Star, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AppPageShell } from "@/components/common/app-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAnalysisStatusAction,
  getPackGenerationStatusAction,
  startAnalysisAction,
  startPackGenerationAction,
} from "@/features/media/server/actions";
import type { GenerationDialogDefaults, MediaDetailPageData } from "@/features/media/types";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

import { formatRuntime, getCefrColor } from "./_utils";
import { AnalysisResults } from "./analysis-results";
import { AnalysisSidebar } from "./analysis-sidebar";

/**
 * Props for the MediaDetailClient component.
 */
export type MediaDetailClientProps = {
  pageData: MediaDetailPageData;
};

/**
 * Main client component for the media detail page. Orchestrates polling,
 * status updates, and handles actions like starting analysis and generating packs.
 */
export function MediaDetailClient({ pageData }: MediaDetailClientProps) {
  const router = useRouter();
  const { media, learnerLevel } = pageData;

  const [analysis, setAnalysis] = React.useState(pageData.analysis);
  const [generation, setGeneration] = React.useState(pageData.generation);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [generationDialogOpen, setGenerationDialogOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [isGenerationPending, startGenerationTransition] = React.useTransition();

  React.useEffect(() => {
    setAnalysis(pageData.analysis);
    setGeneration(pageData.generation);
    setActionMessage(null);
  }, [pageData.analysis, pageData.generation]);

  React.useEffect(() => {
    const hasValidRunId = Boolean(analysis.runId);
    if (!hasValidRunId) {
      return;
    }

    const isAnalysisActive = analysis.status === "queued" || analysis.status === "running";
    if (!isAnalysisActive) {
      return;
    }

    const runId = analysis.runId;
    if (!runId) {
      return;
    }
    const stableRunId: string = runId;

    let cancelled = false;

    const poll = async () => {
      const result = await getAnalysisStatusAction({
        runId: stableRunId,
        tmdbId: media.tmdbId,
        mediaType: media.mediaType,
        seasonNumber: media.selectedSeasonNumber,
      });

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setAnalysis(result.data.analysis);
      } else {
        setActionMessage(result.error);
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [analysis.runId, analysis.status, media.mediaType, media.selectedSeasonNumber, media.tmdbId]);

  React.useEffect(() => {
    const jobId = generation?.jobId;
    const isGenerationActive = generation?.status === "queued" || generation?.status === "running";

    if (!jobId || !isGenerationActive) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      const result = await getPackGenerationStatusAction({ jobId });
      if (cancelled) {
        return;
      }
      if (result.ok) {
        setGeneration(result.data.generation);
      } else {
        setActionMessage(result.error);
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [generation?.jobId, generation?.status]);

  const handleStartAnalysis = () => {
    setActionMessage(null);

    startTransition(async () => {
      const result = await startAnalysisAction({
        tmdbId: media.tmdbId,
        mediaType: media.mediaType,
        seasonNumber: media.selectedSeasonNumber,
      });

      if (result.ok) {
        setAnalysis(result.data.analysis);
        return;
      }

      setActionMessage(result.error);
    });
  };

  const handleSeasonChange = (value: string) => {
    const season = Number.parseInt(value, 10);
    if (!Number.isFinite(season) || season <= 0) {
      return;
    }

    router.replace(`/media/${media.tmdbId}?type=tv&season=${season}`);
  };

  const handleStartGeneration = (
    request: GenerationDialogDefaults & { forceRegenerate?: boolean },
  ) => {
    setActionMessage(null);
    startGenerationTransition(async () => {
      const result = await startPackGenerationAction({
        tmdbId: media.tmdbId,
        mediaType: media.mediaType,
        seasonNumber: media.selectedSeasonNumber,
        request,
      });
      if (result.ok) {
        setGeneration(result.data.generation);
        return;
      }
      setActionMessage(result.error);
    });
  };

  const posterUrl = buildTmdbImageUrl(media.posterPath, TMDB_IMAGE_SIZES.poster.md);
  const backdropUrl = buildTmdbImageUrl(media.backdropPath, TMDB_IMAGE_SIZES.backdrop.original);

  return (
    <AppPageShell className="gap-0 py-0">
      <div className="relative h-[320px] w-full overflow-hidden sm:h-[400px]">
        {backdropUrl ? (
          <>
            <Image
              src={backdropUrl}
              alt={`${media.title} backdrop`}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-background to-amber-500/10" />
        )}

        <div className="absolute left-4 top-4 z-10 sm:left-6 sm:top-6">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 bg-background/80 backdrop-blur-sm hover:bg-background/90"
            asChild
          >
            <Link href="/browse">
              <ArrowLeft className="size-4" />
              Back to Browse
            </Link>
          </Button>
        </div>
      </div>

      <div className="relative -mt-32 space-y-6 px-4 pb-8 sm:-mt-40 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="relative mx-auto h-[240px] w-[160px] shrink-0 overflow-hidden rounded-xl border-2 border-white/20 shadow-sm sm:mx-0 sm:h-[280px] sm:w-[187px]">
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={media.title}
                fill
                priority
                sizes="187px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted p-4 text-center text-muted-foreground">
                {media.title}
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:pt-20 sm:text-left">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge
                  variant="secondary"
                  className="border border-indigo-200/60 bg-white/60 text-indigo-700 backdrop-blur-sm dark:border-indigo-500/20 dark:bg-indigo-950/30 dark:text-indigo-200"
                >
                  {media.mediaType === "movie" ? (
                    <Film className="mr-1 size-3.5" />
                  ) : (
                    <Tv className="mr-1 size-3.5" />
                  )}
                  {media.mediaType === "movie" ? "Movie" : "TV Show"}
                </Badge>
                {media.selectedSeasonNumber ? (
                  <Badge variant="secondary">Season {media.selectedSeasonNumber}</Badge>
                ) : null}
                {analysis.summary?.averageCefrLevel ? (
                  <Badge className={cn("border", getCefrColor(analysis.summary.averageCefrLevel))}>
                    {analysis.summary.averageCefrLevel}
                  </Badge>
                ) : null}
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{media.title}</h1>

              <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground sm:justify-start">
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
                {typeof media.voteAverage === "number" ? (
                  <span className="flex items-center gap-1.5">
                    <Star className="size-4 fill-yellow-400 text-yellow-400" />
                    {media.voteAverage.toFixed(1)}
                    {typeof media.voteCount === "number" ? (
                      <span className="text-xs">({media.voteCount.toLocaleString()} votes)</span>
                    ) : null}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                {media.genres.map((genre) => (
                  <Badge
                    key={genre}
                    variant="secondary"
                    className="border border-muted-foreground/20 bg-muted/50"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>

              {media.mediaType === "tv" && media.availableSeasonCount ? (
                <div className="mx-auto max-w-xs sm:mx-0">
                  <Select
                    value={
                      media.selectedSeasonNumber ? String(media.selectedSeasonNumber) : undefined
                    }
                    onValueChange={handleSeasonChange}
                  >
                    <SelectTrigger className="w-full bg-background/80 backdrop-blur-sm">
                      <SelectValue placeholder="Choose a season" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(
                        { length: media.availableSeasonCount },
                        (_, index) => index + 1,
                      ).map((seasonNumber) => (
                        <SelectItem key={seasonNumber} value={String(seasonNumber)}>
                          Season {seasonNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="size-5 text-muted-foreground" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-relaxed text-muted-foreground">
                  {media.overview ?? "No overview is available for this title yet."}
                </p>
              </CardContent>
            </Card>

            {analysis.status === "completed" ? (
              <AnalysisResults snapshot={analysis} />
            ) : analysis.status === "queued" || analysis.status === "running" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Analysis In Progress</CardTitle>
                  <CardDescription>
                    {analysis.progressMessage ?? "Polling durable run state..."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border bg-card/60 p-4">
                    <Loader2 className="size-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{analysis.stage ?? "queued"}</p>
                      <p className="text-xs text-muted-foreground">
                        Run id: <code>{analysis.runId}</code>
                      </p>
                    </div>
                  </div>
                  <Skeleton className="h-32 w-full rounded-xl" />
                </CardContent>
              </Card>
            ) : analysis.status === "failed" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Failed</CardTitle>
                  <CardDescription>
                    The durable run failed. Review the error and retry when ready.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border border-rose-200/60 bg-rose-500/10 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:text-rose-300">
                    {analysis.errorMessage ?? "The reusable analysis run failed."}
                  </div>
                  {analysis.runId ? (
                    <p className="text-xs text-muted-foreground">
                      Run id: <code>{analysis.runId}</code>
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Analysis Not Started</CardTitle>
                  <CardDescription>
                    Start subtitle analysis to load a real linguistic profile for this title.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The page now uses durable run state. Nothing is simulated here anymore.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <AnalysisSidebar
            media={media}
            learnerLevel={learnerLevel}
            snapshot={analysis}
            isStarting={isPending}
            actionMessage={actionMessage}
            onStart={handleStartAnalysis}
            generation={generation}
            generationDefaults={pageData.generationDefaults}
            isGenerating={isGenerationPending}
            onStartGeneration={handleStartGeneration}
            onOpenGenerationChange={setGenerationDialogOpen}
            generationDialogOpen={generationDialogOpen}
          />
        </div>
      </div>
    </AppPageShell>
  );
}
