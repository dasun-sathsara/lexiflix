"use client";

import { BookOpen, CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";

import { AppErrorAlert } from "@/components/common/app-surface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MediaDetailPageData } from "@/features/media/types";
import { cn } from "@/lib/ui/cn";
import { AnalysisResults } from "./analysis-results";
import { ANALYSIS_PIPELINE_STEPS } from "./utils";

export interface MediaAnalysisContentProps {
  overview: string | null;
  analysis: MediaDetailPageData["analysis"];
}

export function MediaAnalysisContent({ overview, analysis }: MediaAnalysisContentProps) {
  return (
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
            {overview ?? "No overview is available for this title yet."}
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
                const stepIndex = ANALYSIS_PIPELINE_STEPS.findIndex((s) => s.stage === step.stage);
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
                        className={cn("text-sm font-medium", isPending && "text-muted-foreground")}
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
            <AppErrorAlert className="p-4">
              {analysis.errorMessage ??
                "Subtitle analysis could not be completed. Retry the analysis or try another title."}
            </AppErrorAlert>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-xl bg-primary/10 p-3">
              <Sparkles className="size-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Unlock this title's vocabulary</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Start an analysis to extract the key words, idioms, and phrases from the subtitles and
              see how challenging this title is for your level.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
