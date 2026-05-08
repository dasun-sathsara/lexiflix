import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  GenerationDialogDefaults,
  MediaAnalysisSnapshot,
  MediaDetailPageData,
  PackGenerationSnapshot,
} from "@/features/media/types";
import { cn } from "@/lib/utils";

import { getCefrColor, getChallengeSignal } from "./_utils";
import { PackGenerationPanel } from "./pack-generation-panel";

/** Props for the analysis sidebar on the media detail page. */
export type AnalysisSidebarProps = {
  media: MediaDetailPageData["media"];
  learnerLevel: MediaDetailPageData["learnerLevel"];
  snapshot: MediaAnalysisSnapshot;
  isStarting: boolean;
  actionMessage: string | null;
  onStart: () => void;
  generation: PackGenerationSnapshot | null;
  generationDefaults: GenerationDialogDefaults;
  isGenerating: boolean;
  onStartGeneration: (request: GenerationDialogDefaults & { forceRegenerate?: boolean }) => void;
  generationDialogOpen: boolean;
  onOpenGenerationChange: (open: boolean) => void;
};

/**
 * Sidebar component displaying the current analysis status, learner fit,
 * and controls for initiating analysis and pack generation.
 */
export function AnalysisSidebar({
  media,
  learnerLevel,
  snapshot,
  isStarting,
  actionMessage,
  onStart,
  generation,
  generationDefaults,
  isGenerating,
  onStartGeneration,
  generationDialogOpen,
  onOpenGenerationChange,
}: AnalysisSidebarProps) {
  const isProcessing = snapshot.status === "queued" || snapshot.status === "running";
  const isCompleted = snapshot.status === "completed";
  const isFailed = snapshot.status === "failed";
  const needsSeason = snapshot.status === "season_selection_required";
  const challengeSignal = getChallengeSignal(snapshot, learnerLevel);

  return (
    <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-amber-500/5" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {isCompleted ? (
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            ) : isProcessing ? (
              <Loader2 className="size-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            ) : isFailed ? (
              <AlertCircle className="size-4 text-rose-600 dark:text-rose-400" />
            ) : (
              <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400" />
            )}
            Subtitle Analysis
          </CardTitle>
          <CardDescription>
            {needsSeason
              ? "Pick a season to begin analysis."
              : "Analyze the subtitles to understand the vocabulary in this title."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {learnerLevel ? (
            <div className="rounded-xl border bg-card/60 p-3 text-sm">
              <span className="text-muted-foreground">Your current CEFR level:</span>{" "}
              <Badge className={cn("ml-2 border", getCefrColor(learnerLevel))}>
                {learnerLevel}
              </Badge>
            </div>
          ) : null}

          {challengeSignal ? (
            <div className={cn("rounded-xl border p-3 text-sm", challengeSignal.toneClass)}>
              <div className="font-medium">{challengeSignal.label}</div>
              <div className="mt-1 text-xs opacity-80">{challengeSignal.detail}</div>
            </div>
          ) : null}

          {snapshot.summary?.averageCefrLevel ? (
            <div className="rounded-xl border bg-card/60 p-3 text-sm">
              <span className="text-muted-foreground">Average extracted level:</span>{" "}
              <Badge className={cn("ml-2 border", getCefrColor(snapshot.summary.averageCefrLevel))}>
                {snapshot.summary.averageCefrLevel}
              </Badge>
            </div>
          ) : null}

          {!isCompleted && (
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={onStart}
              disabled={needsSeason || isProcessing || isStarting}
            >
              {isStarting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isFailed ? "Retry Analysis" : isProcessing ? "Analysis Running" : "Start Analysis"}
            </Button>
          )}

          {actionMessage ? (
            <div className="rounded-xl border border-rose-200/60 bg-rose-500/10 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:text-rose-300">
              {actionMessage}
            </div>
          ) : null}

          {isFailed ? (
            <div className="rounded-xl border border-rose-200/60 bg-rose-500/10 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:text-rose-300">
              Subtitle analysis could not be completed. Retry the analysis or try another title.
            </div>
          ) : null}

          {snapshot.warnings.length > 0 ? (
            <div className="rounded-xl border border-amber-200/60 bg-amber-500/10 p-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Warnings</p>
              <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                {snapshot.warnings.slice(0, 4).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {media.mediaType === "tv" && !media.selectedSeasonNumber ? (
            <div className="rounded-xl border bg-card/60 p-4 text-sm text-muted-foreground">
              Select a season above to get started.
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isCompleted ? (
        <PackGenerationPanel
          generation={generation}
          generationDefaults={generationDefaults}
          isGenerating={isGenerating}
          onStartGeneration={onStartGeneration}
          open={generationDialogOpen}
          onOpenChange={onOpenGenerationChange}
        />
      ) : null}
    </div>
  );
}
