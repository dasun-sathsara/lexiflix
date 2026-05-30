"use client";

import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Film,
  Globe,
  Loader2,
  Sparkles,
  Star,
  Tv,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AppPageShell } from "@/components/common/app-page-shell";
import { MediaPosterBanner } from "@/components/common/media-poster-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCountryName, getLanguageName } from "@/features/media/lib/locale-display";
import {
  getAnalysisStatusAction,
  getPackGenerationStatusAction,
  startAnalysisAction,
  startPackGenerationAction,
} from "@/features/media/server/actions";
import type { GenerationDialogDefaults, MediaDetailPageData } from "@/features/media/types";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

import { ANALYSIS_PIPELINE_STEPS, formatRuntime } from "./_utils";
import { AnalysisResults } from "./analysis-results";
import { AnalysisSidebar } from "./analysis-sidebar";

/**
 * Props for the MediaDetailClient component.
 */
export type MediaDetailClientProps = {
  pageData: MediaDetailPageData;
};

function isGenerationActive(
  generation: MediaDetailPageData["generation"],
): generation is NonNullable<MediaDetailPageData["generation"]> {
  return generation?.status === "queued" || generation?.status === "running";
}

function mergeGenerationSnapshot(
  current: MediaDetailPageData["generation"],
  incoming: MediaDetailPageData["generation"],
) {
  if (!incoming) {
    return current;
  }
  if (!current) {
    return incoming;
  }
  if (current.jobId === incoming.jobId) {
    return incoming;
  }

  const currentUpdatedAt = Date.parse(current.updatedAt);
  const incomingUpdatedAt = Date.parse(incoming.updatedAt);
  if (Number.isFinite(currentUpdatedAt) && Number.isFinite(incomingUpdatedAt)) {
    return incomingUpdatedAt >= currentUpdatedAt ? incoming : current;
  }

  if (isGenerationActive(current) && !isGenerationActive(incoming)) {
    return current;
  }

  return incoming;
}

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
  const mediaTargetKey = `${media.mediaType}:${media.tmdbId}:${media.selectedSeasonNumber ?? "all"}`;
  const previousMediaTargetKeyRef = React.useRef(mediaTargetKey);

  React.useEffect(() => {
    const targetChanged = previousMediaTargetKeyRef.current !== mediaTargetKey;
    previousMediaTargetKeyRef.current = mediaTargetKey;

    setAnalysis(pageData.analysis);
    setGeneration((current) =>
      targetChanged ? pageData.generation : mergeGenerationSnapshot(current, pageData.generation),
    );
    setActionMessage(null);
  }, [mediaTargetKey, pageData.analysis, pageData.generation]);

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
      try {
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
      } catch (error) {
        setActionMessage(error instanceof Error ? error.message : "Failed to start generation.");
      }
    });
  };

  const backdropUrl = buildTmdbImageUrl(media.backdropPath, TMDB_IMAGE_SIZES.backdrop.lg);

  const showOriginalTitle = Boolean(media.originalTitle) && media.originalTitle !== media.title;
  const hasSubMeta =
    showOriginalTitle ||
    Boolean(media.originalLanguage) ||
    Boolean(media.originCountryCodes?.length);

  return (
    <AppPageShell>
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
                onValueChange={handleSeasonChange}
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

            {analysis.summary?.averageCefrLevel ? (
              <Badge
                variant="secondary"
                className="border border-foreground/15 bg-white/85 text-foreground shadow-sm backdrop-blur-md dark:border-white/15 dark:bg-background/70"
              >
                {analysis.summary.averageCefrLevel}
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
                {showOriginalTitle &&
                (media.originalLanguage || media.originCountryCodes?.length) ? (
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
              <p className="text-sm text-muted-foreground">
                {media.overview ?? "No overview is available for this title yet."}
              </p>
            </CardContent>
          </Card>

          {analysis.status === "completed" ? (
            <AnalysisResults snapshot={analysis} />
          ) : analysis.status === "queued" || analysis.status === "running" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin text-indigo-600 dark:text-indigo-400" />
                  Analyzing Subtitles
                </CardTitle>
                <CardDescription>
                  {analysis.progressMessage ?? "Processing your title..."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {ANALYSIS_PIPELINE_STEPS.map((step, index) => {
                    const currentStageIndex = ANALYSIS_PIPELINE_STEPS.findIndex(
                      (s) => s.stage === analysis.stage,
                    );
                    const stepIndex = ANALYSIS_PIPELINE_STEPS.findIndex(
                      (s) => s.stage === step.stage,
                    );
                    const isCompleted = stepIndex < currentStageIndex;
                    const isActive = step.stage === analysis.stage;
                    const isPending = stepIndex > currentStageIndex;

                    return (
                      <div key={step.stage} className="flex items-start gap-3">
                        <div className="flex flex-col items-center pt-0.5">
                          {isCompleted ? (
                            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                          ) : isActive ? (
                            <div className="relative">
                              <div className="size-5 rounded-full border-2 border-indigo-500 bg-indigo-500/10" />
                              <span className="absolute inset-0 size-5 animate-ping rounded-full border-2 border-indigo-400 opacity-40" />
                            </div>
                          ) : (
                            <div className="size-5 rounded-full border-2 border-border bg-muted/50" />
                          )}
                          {index < ANALYSIS_PIPELINE_STEPS.length - 1 ? (
                            <div
                              className={cn(
                                "w-0.5 min-h-6",
                                isCompleted ? "bg-emerald-500/40" : "bg-border",
                              )}
                            />
                          ) : null}
                        </div>
                        <div className="pb-4">
                          <p
                            className={cn(
                              "text-sm font-medium",
                              isPending && "text-muted-foreground",
                            )}
                          >
                            {step.label}
                          </p>
                          {isActive ? (
                            <p className="text-xs text-muted-foreground">{step.description}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : analysis.status === "failed" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="size-5 text-rose-600 dark:text-rose-400" />
                  Analysis Failed
                </CardTitle>
                <CardDescription>
                  Something went wrong during analysis. You can retry from the sidebar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-rose-200/60 bg-rose-500/10 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:text-rose-300">
                  {analysis.errorMessage ??
                    "Subtitle analysis could not be completed. Retry the analysis or try another title."}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-xl bg-primary/10 p-3">
                  <Sparkles className="size-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">
                  Unlock this title's vocabulary
                </h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Start an analysis to extract the key words, idioms, and phrases from the subtitles
                  and see how challenging this title is for your level.
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
    </AppPageShell>
  );
}
