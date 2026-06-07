"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Loader2, SlidersHorizontal } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
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
import {
  type GenerationDialogDefaults,
  type GenerationDialogInput,
  generationDialogSchema,
} from "@/features/media/types";
import { VOCABULARY_KIND_LABELS, VOCABULARY_KINDS } from "@/lib/domain/vocabulary";
import type { StoredVocabularyKind } from "@/lib/server/db/json-contracts";

export type PackGenerationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: GenerationDialogDefaults;
  isGenerating: boolean;
  isRegeneration: boolean;
  onSubmit: (request: GenerationDialogDefaults & { forceRegenerate?: boolean }) => void;
};

export function PackGenerationDialog({
  open,
  onOpenChange,
  defaults,
  isGenerating,
  isRegeneration,
  onSubmit,
}: PackGenerationDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<GenerationDialogInput>({
    resolver: zodResolver(generationDialogSchema),
    mode: "onChange",
    defaultValues: {
      cefrWindowMode: defaults.cefrWindowMode,
      knownTermHandling: defaults.knownTermHandling,
      packSize: defaults.packSize,
      exampleSentenceCount: defaults.exampleSentenceCount,
      audioVoiceGender: defaults.audioVoiceGender,
      imageEnabled: defaults.imageEnabled,
      selectedVocabularyTypes:
        defaults.selectedVocabularyTypes as GenerationDialogInput["selectedVocabularyTypes"],
      customInstructions: defaults.customInstructions,
    },
  });

  useEffect(() => {
    reset({
      cefrWindowMode: defaults.cefrWindowMode,
      knownTermHandling: defaults.knownTermHandling,
      packSize: defaults.packSize,
      exampleSentenceCount: defaults.exampleSentenceCount,
      audioVoiceGender: defaults.audioVoiceGender,
      imageEnabled: defaults.imageEnabled,
      selectedVocabularyTypes:
        defaults.selectedVocabularyTypes as GenerationDialogInput["selectedVocabularyTypes"],
      customInstructions: defaults.customInstructions,
    });
  }, [defaults, reset]);

  const submit = (data: GenerationDialogInput) => {
    onSubmit({
      ...defaults,
      cefrWindowMode: data.cefrWindowMode,
      knownTermHandling: data.knownTermHandling,
      packSize: data.packSize,
      exampleSentenceCount: data.exampleSentenceCount,
      audioVoiceGender: data.audioVoiceGender,
      imageEnabled: data.imageEnabled,
      selectedVocabularyTypes: data.selectedVocabularyTypes as StoredVocabularyKind[],
      customInstructions: data.customInstructions?.trim() ? data.customInstructions : null,
      forceRegenerate: isRegeneration,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit(submit)}>
          <DialogHeader>
            <DialogTitle>Generate Pack</DialogTitle>
            <DialogDescription>Configure the vocabulary pack for this title.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 pt-4 sm:grid-cols-2">
            <div className="space-y-1.5 text-sm">
              <Label>CEFR window</Label>
              <Controller
                control={control}
                name="cefrWindowMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="same_level">Same level</SelectItem>
                      <SelectItem value="one_level_above">One level above</SelectItem>
                      <SelectItem value="all_levels_above">All levels above</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5 text-sm">
              <Label>Known terms</Label>
              <Controller
                control={control}
                name="knownTermHandling"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclude_known">Exclude known</SelectItem>
                      <SelectItem value="downrank_known">Downrank known</SelectItem>
                      <SelectItem value="include_known">Include known</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5 text-sm">
              <Label htmlFor="generation-pack-size">Pack size</Label>
              <Input
                id="generation-pack-size"
                className="h-9"
                type="number"
                min={1}
                aria-invalid={!!errors.packSize}
                {...register("packSize", { valueAsNumber: true })}
              />
              {errors.packSize ? (
                <p className="text-xs text-destructive">{errors.packSize.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5 text-sm">
              <Label>Examples</Label>
              <Controller
                control={control}
                name="exampleSentenceCount"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(val) => field.onChange(Number(val))}
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
                )}
              />
            </div>
            <div className="space-y-1.5 text-sm">
              <Label>Audio voice</Label>
              <Controller
                control={control}
                name="audioVoiceGender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5 text-sm">
              <Label>Image generation</Label>
              <Controller
                control={control}
                name="imageEnabled"
                render={({ field }) => (
                  <Select
                    value={field.value ? "enabled" : "disabled"}
                    onValueChange={(val) => field.onChange(val === "enabled")}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Generate images</SelectItem>
                      <SelectItem value="disabled">Skip image generation</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5 text-sm sm:col-span-2">
              <Label>Vocabulary types</Label>
              <Controller
                control={control}
                name="selectedVocabularyTypes"
                render={({ field }) => (
                  <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
                    {VOCABULARY_KINDS.map((kind) => {
                      const checked = field.value.includes(
                        kind as GenerationDialogInput["selectedVocabularyTypes"][number],
                      );
                      return (
                        <label
                          key={kind}
                          htmlFor={`generation-vocabulary-type-${kind}`}
                          className="flex items-center gap-2 leading-none"
                        >
                          <Checkbox
                            id={`generation-vocabulary-type-${kind}`}
                            checked={checked}
                            onCheckedChange={(isChecked) => {
                              if (isChecked) {
                                field.onChange([...field.value, kind]);
                              } else {
                                field.onChange(field.value.filter((v) => v !== kind));
                              }
                            }}
                          />
                          {VOCABULARY_KIND_LABELS[kind]}
                        </label>
                      );
                    })}
                  </div>
                )}
              />
              {errors.selectedVocabularyTypes ? (
                <p className="text-xs text-destructive">{errors.selectedVocabularyTypes.message}</p>
              ) : null}
            </div>
          </div>
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 h-8 w-full justify-between px-2 text-xs"
              >
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
                  {...register("customInstructions")}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
          <DialogFooter className="pt-4">
            <Button type="submit" disabled={isGenerating || !isValid}>
              {isGenerating ? <Loader2 className="size-4 animate-spin" /> : null}
              {isRegeneration ? "Regenerate" : "Start"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
