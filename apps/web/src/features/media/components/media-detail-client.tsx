"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { AppPageShell } from "@/components/common/app-page-shell";
import {
  getAnalysisStatusAction,
  getPackGenerationStatusAction,
  startAnalysisAction,
  startPackGenerationAction,
} from "@/features/media/server/actions";
import type { GenerationDialogDefaults, MediaDetailPageData } from "@/features/media/types";
import { retryPackGenerationAction } from "@/features/pack-generation/server/actions";
import { usePolling } from "@/lib/hooks/use-polling";
import { AnalysisSidebar } from "./analysis-sidebar";
import { MediaAnalysisContent } from "./media-analysis-content";
import { MediaDetailBanner } from "./media-detail-banner";

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

  const hasValidRunId = Boolean(analysis.runId);
  const isAnalysisActive = analysis.status === "queued" || analysis.status === "running";
  const stableRunId = analysis.runId ?? "";

  usePolling(
    async (signal) => {
      const result = await getAnalysisStatusAction({
        runId: stableRunId,
        tmdbId: media.tmdbId,
        mediaType: media.mediaType,
        seasonNumber: media.selectedSeasonNumber,
      });

      if (signal.aborted) {
        return;
      }

      if (result.ok) {
        setAnalysis(result.data.analysis);
      } else {
        setActionMessage(result.error);
      }
    },
    {
      enabled: hasValidRunId && isAnalysisActive && Boolean(stableRunId),
      intervalMs: 2500,
      dependencies: [stableRunId, media.mediaType, media.selectedSeasonNumber, media.tmdbId],
    },
  );

  const jobId = generation?.jobId;
  const isGenActive = generation?.status === "queued" || generation?.status === "running";

  usePolling(
    async (signal) => {
      if (!jobId) return;
      const result = await getPackGenerationStatusAction({ jobId });
      if (signal.aborted) {
        return;
      }
      if (result.ok) {
        setGeneration(result.data.generation);
        if (result.data.generation.status === "completed") {
          toast.success("Your study pack is ready!");
        }
      } else {
        setActionMessage(result.error);
      }
    },
    {
      enabled: Boolean(jobId) && isGenActive,
      intervalMs: 2500,
      dependencies: [jobId, isGenActive],
    },
  );

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

  const handleRetryGeneration = () => {
    const jobId = generation?.jobId;
    if (!jobId) {
      return;
    }
    setActionMessage(null);
    startGenerationTransition(async () => {
      const result = await retryPackGenerationAction({ jobId });
      if (result.ok) {
        setGeneration(result.data.generation);
        return;
      }
      setActionMessage(result.error);
    });
  };

  return (
    <AppPageShell>
      <MediaDetailBanner
        media={media}
        analysisSummary={analysis.summary}
        onSeasonChange={handleSeasonChange}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <MediaAnalysisContent overview={media.overview} analysis={analysis} />

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
          onRetryGeneration={handleRetryGeneration}
          onOpenGenerationChange={setGenerationDialogOpen}
          generationDialogOpen={generationDialogOpen}
        />
      </div>
    </AppPageShell>
  );
}
