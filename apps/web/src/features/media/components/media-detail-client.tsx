"use client";

import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Film,
  Loader2,
  Play,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tv,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AppPageShell } from "@/components/common/app-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  getAnalysisStatusAction,
  getPackGenerationStatusAction,
  startAnalysisAction,
  startPackGenerationAction,
} from "@/features/media/server/actions";
import type {
  GenerationDialogDefaults,
  MediaAnalysisSnapshot,
  MediaDetailPageData,
  PackGenerationSnapshot,
} from "@/features/media/types";
import type { StoredCefrLevel, StoredVocabularyKind } from "@/lib/server/db/json-contracts";
import { buildTmdbImageUrl, TMDB_IMAGE_SIZES } from "@/lib/tmdb-shared";
import { cn } from "@/lib/utils";

type MediaDetailClientProps = {
  pageData: MediaDetailPageData;
};

const vocabularyTypeLabels: Record<StoredVocabularyKind, string> = {
  word: "Words",
  phrasal_verb: "Phrasal verbs",
  idiom: "Idioms",
  slang: "Slang",
};

const GENERATION_VOCABULARY_TYPES: StoredVocabularyKind[] = [
  "word",
  "phrasal_verb",
  "idiom",
  "slang",
];

function formatRuntime(minutes: number | null) {
  if (!minutes) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder}m` : `${remainder}m`;
}

function getCefrColor(level: string | null | undefined) {
  if (!level) {
    return "border-muted-foreground/20 bg-muted/50 text-muted-foreground";
  }

  if (level.startsWith("A")) {
    return "border-emerald-200/60 bg-emerald-500/10 text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-300";
  }

  if (level.startsWith("B")) {
    return "border-amber-200/60 bg-amber-500/10 text-amber-700 dark:border-amber-500/20 dark:text-amber-300";
  }

  return "border-rose-200/60 bg-rose-500/10 text-rose-700 dark:border-rose-500/20 dark:text-rose-300";
}

function buildCefrDistributionEntries(snapshot: MediaAnalysisSnapshot) {
  const distribution = snapshot.summary?.cefrDistribution ?? {};
  const levels: StoredCefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const total = Object.values(distribution).reduce(
    (sum, value) => sum + (typeof value === "number" ? value : 0),
    0,
  );

  return levels.map((level) => {
    const count = distribution[level] ?? 0;
    return {
      level,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

function AnalysisSummaryGrid({ snapshot }: { snapshot: MediaAnalysisSnapshot }) {
  const stats = [
    {
      label: "Extracted items",
      value: snapshot.summary?.extractedItemCount,
    },
    {
      label: "Selectable items",
      value: snapshot.summary?.selectableItemCount,
    },
    {
      label: "Subtitle lines",
      value: snapshot.summary?.subtitleLineCount,
    },
    {
      label: "Speech rate",
      value:
        typeof snapshot.summary?.speechRateWpm === "number"
          ? `${snapshot.summary.speechRateWpm} wpm`
          : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border bg-card/60 p-3">
          <div className="text-xl font-semibold">
            {typeof stat.value === "number" ? stat.value.toLocaleString() : (stat.value ?? "—")}
          </div>
          <div className="text-xs text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

function AnalysisResults({ snapshot }: { snapshot: MediaAnalysisSnapshot }) {
  const distribution = buildCefrDistributionEntries(snapshot);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-muted-foreground" />
            Linguistic Profile
          </CardTitle>
          <CardDescription>Real reusable analysis loaded from Postgres.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AnalysisSummaryGrid snapshot={snapshot} />

          <div className="space-y-3">
            {distribution.map((entry) => (
              <div key={entry.level} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Badge className={cn("border text-xs", getCefrColor(entry.level))}>
                    {entry.level}
                  </Badge>
                  <span className="text-sm font-medium">
                    {entry.count} term{entry.count === 1 ? "" : "s"} ({entry.percentage}%)
                  </span>
                </div>
                <Progress value={entry.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-muted-foreground" />
            Extracted Terms
          </CardTitle>
          <CardDescription>
            Top reusable vocabulary and phrase items for this title.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.items.length > 0 ? (
            <div className="space-y-3">
              {snapshot.items.map((item) => (
                <div key={item.id} className="rounded-xl border bg-card/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold tracking-tight">{item.displayText}</p>
                    <Badge variant="secondary">{item.kind.replaceAll("_", " ")}</Badge>
                    {item.cefrLevel ? (
                      <Badge className={cn("border", getCefrColor(item.cefrLevel))}>
                        {item.cefrLevel}
                      </Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {item.occurrenceCount} occurrence{item.occurrenceCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  {item.representativeContext ? (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      “{item.representativeContext}”
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No reusable items were saved for this run.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisSidebar({
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
}: {
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
}) {
  const isProcessing = snapshot.status === "queued" || snapshot.status === "running";
  const isCompleted = snapshot.status === "completed";
  const isFailed = snapshot.status === "failed";
  const needsSeason = snapshot.status === "season_selection_required";

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
            {snapshot.progressMessage ??
              (needsSeason
                ? "Choose a season to resolve the durable analysis target."
                : "Start reusable subtitle analysis for this title.")}
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

          {snapshot.errorMessage ? (
            <div className="rounded-xl border border-rose-200/60 bg-rose-500/10 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:text-rose-300">
              {snapshot.errorMessage}
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

          {isProcessing ? (
            <div className="rounded-xl border bg-card/60 p-4 text-sm text-muted-foreground">
              The page is polling durable run state by <code>{snapshot.runId}</code>.
            </div>
          ) : null}

          {isCompleted ? (
            <div className="rounded-xl border border-emerald-200/60 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-300">
              Reusable analysis is complete and cached for this pipeline fingerprint.
            </div>
          ) : null}

          {media.mediaType === "tv" && !media.selectedSeasonNumber ? (
            <div className="rounded-xl border bg-card/60 p-4 text-sm text-muted-foreground">
              TV analysis runs at the season level. Pick a season first.
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

function MediaNextAction({
  media,
  analysis,
  generation,
  isStarting,
  isGenerationPending,
  onStartAnalysis,
  onOpenGeneration,
}: {
  media: MediaDetailPageData["media"];
  analysis: MediaAnalysisSnapshot;
  generation: PackGenerationSnapshot | null;
  isStarting: boolean;
  isGenerationPending: boolean;
  onStartAnalysis: () => void;
  onOpenGeneration: () => void;
}) {
  const needsSeason = media.mediaType === "tv" && !media.selectedSeasonNumber;
  const isAnalysisProcessing = analysis.status === "queued" || analysis.status === "running";
  const isGenerationProcessing =
    generation?.status === "queued" || generation?.status === "running";

  if (generation?.packHref) {
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

  if (analysis.status === "completed") {
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
          {needsSeason
            ? "Choose a season"
            : isAnalysisProcessing
              ? "Analysis running"
              : "Analyze subtitles"}
        </p>
        <p className="text-xs text-muted-foreground">
          {needsSeason
            ? "TV titles run season by season before pack generation."
            : isAnalysisProcessing
              ? (analysis.progressMessage ?? "Polling durable analysis state.")
              : "Start subtitle analysis before generating a study pack."}
        </p>
      </div>
      <Button
        className="w-full gap-2 sm:w-auto"
        onClick={onStartAnalysis}
        disabled={needsSeason || isAnalysisProcessing || isStarting}
      >
        {isStarting || isAnalysisProcessing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Play className="size-4" />
        )}
        {needsSeason ? "Season Required" : isAnalysisProcessing ? "Running" : "Start Analysis"}
      </Button>
    </div>
  );
}

function PackGenerationPanel({
  generation,
  generationDefaults,
  isGenerating,
  onStartGeneration,
  open,
  onOpenChange,
}: {
  generation: PackGenerationSnapshot | null;
  generationDefaults: GenerationDialogDefaults;
  isGenerating: boolean;
  onStartGeneration: (request: GenerationDialogDefaults & { forceRegenerate?: boolean }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [form, setForm] = React.useState(generationDefaults);
  const isProcessing = generation?.status === "queued" || generation?.status === "running";
  const dialogOpen = open ?? internalOpen;

  const setDialogOpen = React.useCallback(
    (nextOpen: boolean) => {
      setInternalOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  React.useEffect(() => {
    setForm(generationDefaults);
  }, [generationDefaults]);

  const vocabularyTypesAreValid = form.selectedVocabularyTypes.length > 0;
  const toggleVocabularyType = (kind: StoredVocabularyKind, checked: boolean) => {
    setForm((current) => {
      if (checked) {
        return current.selectedVocabularyTypes.includes(kind)
          ? current
          : {
              ...current,
              selectedVocabularyTypes: [...current.selectedVocabularyTypes, kind],
            };
      }

      return {
        ...current,
        selectedVocabularyTypes: current.selectedVocabularyTypes.filter((value) => value !== kind),
      };
    });
  };

  const submit = (forceRegenerate = false) => {
    if (!vocabularyTypesAreValid) {
      return;
    }

    onStartGeneration({ ...form, forceRegenerate });
    setDialogOpen(false);
  };

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
          {generation?.progressMessage ??
            "Generate learner-specific study content from this analysis."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {generation ? (
          <div className="rounded-xl border bg-card/60 p-3 text-sm">
            <div className="font-medium">{generation.stage.replaceAll("_", " ")}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Job id: <code>{generation.jobId}</code>
            </div>
          </div>
        ) : null}
        {generation?.errorMessage ? (
          <div className="rounded-xl border border-rose-200/60 bg-rose-500/10 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:text-rose-300">
            {generation.errorMessage}
          </div>
        ) : null}
        {generation?.packHref ? (
          <Button className="w-full gap-2" asChild>
            <Link href={generation.packHref}>
              <BookOpen className="size-4" />
              Open Pack
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Generate Pack</DialogTitle>
            <DialogDescription>
              Choose the learner-specific request snapshot for this run.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 text-sm">
              <Label>CEFR window</Label>
              <Select
                value={form.cefrWindowMode}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    cefrWindowMode: value as GenerationDialogDefaults["cefrWindowMode"],
                  }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="same_level">Same level</SelectItem>
                  <SelectItem value="one_level_above">One level above</SelectItem>
                  <SelectItem value="all_levels_above">All levels above</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 text-sm">
              <Label>Known terms</Label>
              <Select
                value={form.knownTermHandling}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    knownTermHandling: value as GenerationDialogDefaults["knownTermHandling"],
                  }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclude_known">Exclude known</SelectItem>
                  <SelectItem value="downrank_known">Downrank known</SelectItem>
                  <SelectItem value="include_known">Include known</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 text-sm">
              <Label htmlFor="generation-pack-size">Pack size</Label>
              <Input
                id="generation-pack-size"
                className="h-9"
                type="number"
                min={1}
                max={100}
                value={form.packSize}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    packSize: Math.min(100, Math.max(1, Number(event.target.value) || 1)),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5 text-sm">
              <Label>Examples</Label>
              <Select
                value={String(form.exampleSentenceCount)}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    exampleSentenceCount: Number(value) as 1 | 2 | 3,
                  }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 sentence</SelectItem>
                  <SelectItem value="2">2 sentences</SelectItem>
                  <SelectItem value="3">3 sentences</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 text-sm sm:col-span-2">
              <Label>Vocabulary types</Label>
              <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                {GENERATION_VOCABULARY_TYPES.map((kind) => (
                  <label
                    key={kind}
                    htmlFor={`generation-vocabulary-type-${kind}`}
                    className="flex items-center gap-2 leading-none"
                  >
                    <Checkbox
                      id={`generation-vocabulary-type-${kind}`}
                      checked={form.selectedVocabularyTypes.includes(kind)}
                      onCheckedChange={(checked) => toggleVocabularyType(kind, checked === true)}
                    />
                    {vocabularyTypeLabels[kind]}
                  </label>
                ))}
              </div>
              {!vocabularyTypesAreValid ? (
                <p className="text-xs text-destructive">Select at least one vocabulary type.</p>
              ) : null}
            </div>
          </div>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-full justify-between px-2 text-xs">
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5" />
                  Advanced options
                </span>
                <ChevronDown className="size-3.5" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-1.5 text-sm">
                <Label htmlFor="generation-custom-instructions">Custom instructions</Label>
                <Textarea
                  id="generation-custom-instructions"
                  className="min-h-20"
                  value={form.customInstructions ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      customInstructions: event.target.value || null,
                    }))
                  }
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
          <DialogFooter>
            {generation?.status === "completed" ? (
              <Button
                variant="outline"
                onClick={() => submit(true)}
                disabled={!vocabularyTypesAreValid}
              >
                Regenerate
              </Button>
            ) : null}
            <Button
              onClick={() => submit(false)}
              disabled={isGenerating || !vocabularyTypesAreValid}
            >
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

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
    if (!analysis.runId) {
      return;
    }

    if (analysis.status !== "queued" && analysis.status !== "running") {
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
    if (!generation?.jobId || (generation.status !== "queued" && generation.status !== "running")) {
      return;
    }

    let cancelled = false;
    const jobId = generation.jobId;
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

          <div className="flex-1 space-y-4 text-center sm:pt-20 sm:text-left">
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

            <MediaNextAction
              media={media}
              analysis={analysis}
              generation={generation}
              isStarting={isPending}
              isGenerationPending={isGenerationPending}
              onStartAnalysis={handleStartAnalysis}
              onOpenGeneration={() => setGenerationDialogOpen(true)}
            />
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
