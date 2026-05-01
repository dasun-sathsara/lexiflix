import { BookOpen, Loader2, Play, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type {
  MediaAnalysisSnapshot,
  MediaDetailPageData,
  PackGenerationSnapshot,
} from "@/features/media/types";

export type MediaNextActionProps = {
  media: MediaDetailPageData["media"];
  analysis: MediaAnalysisSnapshot;
  generation: PackGenerationSnapshot | null;
  isStarting: boolean;
  isGenerationPending: boolean;
  onStartAnalysis: () => void;
  onOpenGeneration: () => void;
};

/**
 * Renders the primary call-to-action for the media detail page, dynamically
 * adjusting based on the current state of analysis and pack generation.
 */
export function MediaNextAction({
  media,
  analysis,
  generation,
  isStarting,
  isGenerationPending,
  onStartAnalysis,
  onOpenGeneration,
}: MediaNextActionProps) {
  const needsSeasonSelection = media.mediaType === "tv" && !media.selectedSeasonNumber;
  const isAnalysisProcessing = analysis.status === "queued" || analysis.status === "running";
  const isGenerationProcessing =
    generation?.status === "queued" || generation?.status === "running";

  const isPackReady = Boolean(generation?.packHref);
  const isAnalysisCompleted = analysis.status === "completed";

  if (isPackReady && generation?.packHref) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border bg-card/85 p-3 text-left shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Pack ready</p>
          <p className="text-xs text-muted-foreground">
            Resume the generated study pack for this title.
          </p>
        </div>
        <Button asChild className="w-full gap-2 sm:w-auto">
          <Link href={generation.packHref}>
            <BookOpen className="size-4" />
            Open Pack
          </Link>
        </Button>
      </div>
    );
  }

  if (isAnalysisCompleted) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border bg-card/85 p-3 text-left shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Analysis complete</p>
          <p className="text-xs text-muted-foreground">
            Generate a learner-specific pack from the extracted terms.
          </p>
        </div>
        <Button
          className="w-full gap-2 sm:w-auto"
          onClick={onOpenGeneration}
          disabled={isGenerationPending || isGenerationProcessing}
        >
          {isGenerationPending || isGenerationProcessing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Generate Pack
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card/85 p-3 text-left shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold">
          {needsSeasonSelection
            ? "Choose a season"
            : isAnalysisProcessing
              ? "Analysis running"
              : "Analyze subtitles"}
        </p>
        <p className="text-xs text-muted-foreground">
          {needsSeasonSelection
            ? "TV titles run season by season before pack generation."
            : isAnalysisProcessing
              ? (analysis.progressMessage ?? "Polling durable analysis state.")
              : "Start subtitle analysis before generating a study pack."}
        </p>
      </div>
      <Button
        className="w-full gap-2 sm:w-auto"
        onClick={onStartAnalysis}
        disabled={needsSeasonSelection || isAnalysisProcessing || isStarting}
      >
        {isStarting || isAnalysisProcessing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Play className="size-4" />
        )}
        {needsSeasonSelection
          ? "Season Required"
          : isAnalysisProcessing
            ? "Running"
            : "Start Analysis"}
      </Button>
    </div>
  );
}
