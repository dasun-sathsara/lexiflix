"use client";

import { BookOpen, CheckCircle2, Clock, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AppErrorAlert } from "@/components/common/app-surface";
import { LinkPending } from "@/components/common/link-pending";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { GenerationDialogDefaults, PackGenerationSnapshot } from "@/features/media/types";
import {
  getGenerationProgressState,
  getGenerationStatusMessage,
} from "@/features/pack-generation/utils";

import { PackGenerationDialog } from "./pack-generation-dialog";

export type PackGenerationPanelProps = {
  generation: PackGenerationSnapshot | null;
  generationDefaults: GenerationDialogDefaults;
  isGenerating: boolean;
  onStartGeneration: (request: GenerationDialogDefaults & { forceRegenerate?: boolean }) => void;
  onRetryGeneration: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/**
 * Handles the display and configuration for generating study packs based on an analysis.
 */
export function PackGenerationPanel({
  generation,
  generationDefaults,
  isGenerating,
  onStartGeneration,
  onRetryGeneration,
  open,
  onOpenChange,
}: PackGenerationPanelProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isProcessing = generation?.status === "queued" || generation?.status === "running";
  const progress = generation ? getGenerationProgressState(generation) : null;
  const dialogOpen = open ?? internalOpen;
  const isRegeneration = generation?.status === "completed";

  const setDialogOpen = React.useCallback(
    (nextOpen: boolean) => {
      setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {isProcessing ? (
            <Loader2 className="size-4 animate-spin text-indigo-600 dark:text-indigo-400" />
          ) : generation?.status === "completed" ? (
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400" />
          )}
          Pack Generation
        </CardTitle>
        <CardDescription>
          {progress?.description ?? "Generate learner-specific study content from this analysis."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {generation ? (
          <div className="rounded-xl border bg-card/60 p-3 text-sm">
            <div className="font-medium">{progress?.label}</div>
          </div>
        ) : null}
        {generation?.status === "failed" ? (
          <AppErrorAlert>{getGenerationStatusMessage(generation)}</AppErrorAlert>
        ) : null}
        {generation?.status === "failed" ? (
          <Button
            className="w-full gap-2"
            variant="default"
            onClick={onRetryGeneration}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Retry Generation
          </Button>
        ) : null}
        {generation?.packHref ? (
          <Button className="w-full gap-2" asChild>
            <Link href={generation.packHref}>
              <BookOpen className="size-4" />
              Open Pack
              <LinkPending />
            </Link>
          </Button>
        ) : null}
        {generation ? (
          <Button className="w-full gap-2" variant="outline" asChild>
            <Link href={generation.progressHref}>
              <Clock className="size-4" />
              Open Progress
            </Link>
          </Button>
        ) : null}
        <Button
          className="w-full gap-2"
          variant={generation?.status === "completed" ? "outline" : "default"}
          onClick={() => setDialogOpen(true)}
          disabled={isGenerating || isProcessing}
        >
          {isGenerating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {generation?.status === "completed" ? "Regenerate Pack" : "Start Generation"}
        </Button>
      </CardContent>

      <PackGenerationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaults={generationDefaults}
        isGenerating={isGenerating}
        isRegeneration={!!isRegeneration}
        onSubmit={onStartGeneration}
      />
    </Card>
  );
}
