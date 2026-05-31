import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { GenerationDialogDefaults, PackGenerationSnapshot } from "@/features/media/types";
import {
  getGenerationProgressState,
  getGenerationStatusMessage,
} from "@/features/pack-generation/lib/status";
import type { StoredVocabularyKind } from "@/lib/server/db/json-contracts";

import { GENERATION_VOCABULARY_TYPES, VOCABULARY_TYPE_LABELS } from "./_utils";

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
  const [form, setForm] = React.useState(generationDefaults);
  const isProcessing = generation?.status === "queued" || generation?.status === "running";
  const progress = generation ? getGenerationProgressState(generation) : null;
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
  const isRegeneration = generation?.status === "completed";

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

    onStartGeneration({ ...form, forceRegenerate: forceRegenerate || isRegeneration });
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
          <div className="rounded-xl border border-rose-200/60 bg-rose-500/10 p-3 text-sm text-rose-700 dark:border-rose-500/20 dark:text-rose-300">
            {getGenerationStatusMessage(generation)}
          </div>
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
            <DialogDescription>Configure the vocabulary pack for this title.</DialogDescription>
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
            <div className="space-y-1.5 text-sm">
              <Label>Audio voice</Label>
              <Select
                value={form.audioVoiceGender}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    audioVoiceGender: value as GenerationDialogDefaults["audioVoiceGender"],
                  }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
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
                    {VOCABULARY_TYPE_LABELS[kind]}
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
            <Button
              onClick={() => submit(isRegeneration)}
              disabled={isGenerating || !vocabularyTypesAreValid}
            >
              {isRegeneration ? "Regenerate" : "Start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
