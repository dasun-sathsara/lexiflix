"use client";

import { GraduationCap } from "lucide-react";
import Link from "next/link";
import type { Control, FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";
import { Controller } from "react-hook-form";

import { AppPanel } from "@/components/common/app-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { PreferencesSettingsInput, SettingsPreferences } from "@/features/settings/types";
import { STUDY_VOCABULARY_TYPES } from "@/lib/constants";
import { CEFR_LEVELS } from "@/lib/domain/cefr";
import type { StoredVocabularyKind } from "@/lib/domain/types";
import { VOCABULARY_KIND_LABELS } from "@/lib/domain/vocabulary";
import {
  CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
  settingsCardClass,
  settingsCardContentClass,
  settingsCardHeaderClass,
  settingsFieldClass,
  settingsLabelClass,
} from "../lib/utils";

type PreferencesGenerationSectionProps = {
  control: Control<PreferencesSettingsInput>;
  register: UseFormRegister<PreferencesSettingsInput>;
  watch: UseFormWatch<PreferencesSettingsInput>;
  errors: FieldErrors<PreferencesSettingsInput>;
  initialPreferences: SettingsPreferences;
  effectiveCefrLevel: string | null;
  setPreferencesStatus: (status: null) => void;
  toggleVocabularyType: (kind: StoredVocabularyKind, checked: boolean) => void;
};

export function PreferencesGenerationSection({
  control,
  register,
  watch,
  errors,
  initialPreferences,
  effectiveCefrLevel,
  setPreferencesStatus,
  toggleVocabularyType,
}: PreferencesGenerationSectionProps) {
  const customInstructions = watch("generationCustomInstructionsDefault") ?? "";
  const studyVocabularyTypes = watch("studyVocabularyTypes");

  return (
    <Card id="preferences" className={settingsCardClass}>
      <CardHeader className={settingsCardHeaderClass}>
        <CardTitle>Learning preferences</CardTitle>
        <CardDescription>CEFR level, pace, and generation defaults.</CardDescription>
      </CardHeader>
      <CardContent className={`${settingsCardContentClass} space-y-4`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={settingsFieldClass}>
            <Label htmlFor="current-cefr-level" className={settingsLabelClass}>
              Current CEFR level
            </Label>
            <Controller
              control={control}
              name="manualOverrideSelection"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(val) => {
                    field.onChange(val);
                    setPreferencesStatus(null);
                  }}
                >
                  <SelectTrigger id="current-cefr-level" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assessed">
                      Use my adaptive test result
                      {initialPreferences.assessedLevel
                        ? ` (${initialPreferences.assessedLevel})`
                        : ""}
                    </SelectItem>
                    {CEFR_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Effective level:{" "}
              {effectiveCefrLevel ? (
                <Badge variant="secondary" className="ml-1">
                  {effectiveCefrLevel}
                </Badge>
              ) : (
                "Not assessed yet"
              )}
            </p>
          </div>

          <div className={settingsFieldClass}>
            <Label htmlFor="target-language" className={settingsLabelClass}>
              Target language
            </Label>
            <Input
              id="target-language"
              value={initialPreferences.targetLanguage}
              readOnly
              disabled
            />
            <p className="text-xs text-muted-foreground">Multi-language support is coming soon.</p>
          </div>
        </div>

        <div className={settingsFieldClass}>
          <Label htmlFor="new-cards-per-day" className={settingsLabelClass}>
            New cards per day
          </Label>
          <Input
            id="new-cards-per-day"
            type="number"
            min={1}
            max={100}
            placeholder="20"
            aria-invalid={!!errors.newCardsPerDay}
            {...register("newCardsPerDay", {
              valueAsNumber: true,
              onChange: () => setPreferencesStatus(null),
            })}
          />
          <p className="text-xs text-muted-foreground">
            Controls how many new cards can be introduced each app day. Due reviews are not capped.
          </p>
          {errors.newCardsPerDay && (
            <p className="text-xs text-destructive">{errors.newCardsPerDay.message}</p>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Generation defaults</h3>
            <p className="text-sm text-muted-foreground">
              Used as the starting point when creating a pack from a media page.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className={settingsFieldClass}>
              <Label htmlFor="generation-pack-size" className={settingsLabelClass}>
                Pack size
              </Label>
              <Input
                id="generation-pack-size"
                type="number"
                min={1}
                aria-invalid={!!errors.generationPackSizeDefault}
                {...register("generationPackSizeDefault", {
                  valueAsNumber: true,
                  onChange: () => setPreferencesStatus(null),
                })}
              />
              {errors.generationPackSizeDefault && (
                <p className="text-xs text-destructive">
                  {errors.generationPackSizeDefault.message}
                </p>
              )}
            </div>

            <div className={settingsFieldClass}>
              <Label htmlFor="generation-example-count" className={settingsLabelClass}>
                Example sentences
              </Label>
              <Controller
                control={control}
                name="generationExampleSentenceCount"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(val) => {
                      field.onChange(Number(val));
                      setPreferencesStatus(null);
                    }}
                  >
                    <SelectTrigger id="generation-example-count" className="w-full">
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

            <div className={settingsFieldClass}>
              <Label htmlFor="generation-cefr-window" className={settingsLabelClass}>
                CEFR window
              </Label>
              <Controller
                control={control}
                name="generationCefrWindowMode"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      setPreferencesStatus(null);
                    }}
                  >
                    <SelectTrigger id="generation-cefr-window" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="same_level">Keep at my current level</SelectItem>
                      <SelectItem value="one_level_above">One level above</SelectItem>
                      <SelectItem value="all_levels_above">All levels above</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className={settingsFieldClass}>
              <Label htmlFor="generation-known-terms" className={settingsLabelClass}>
                Known terms
              </Label>
              <Controller
                control={control}
                name="generationKnownTermHandling"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      setPreferencesStatus(null);
                    }}
                  >
                    <SelectTrigger id="generation-known-terms" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclude_known">Skip words I already know</SelectItem>
                      <SelectItem value="downrank_known">De-prioritize words I know</SelectItem>
                      <SelectItem value="include_known">
                        Include everything (even known words)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className={settingsFieldClass}>
              <Label htmlFor="frequency-preference" className={settingsLabelClass}>
                Vocabulary Selection Priority
              </Label>
              <Controller
                control={control}
                name="frequencyPreference"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      setPreferencesStatus(null);
                    }}
                  >
                    <SelectTrigger id="frequency-preference" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="common_first">Common first</SelectItem>
                      <SelectItem value="challenge_first">Challenge first</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className={settingsFieldClass}>
              <Label htmlFor="generation-audio-voice-gender" className={settingsLabelClass}>
                Audio voice
              </Label>
              <Controller
                control={control}
                name="generationAudioVoiceGenderDefault"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      setPreferencesStatus(null);
                    }}
                  >
                    <SelectTrigger id="generation-audio-voice-gender" className="w-full">
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

            <div className={settingsFieldClass}>
              <Label className={settingsLabelClass}>Vocabulary types</Label>
              <div className="grid gap-2 rounded-[calc(var(--radius)+2px)] border bg-muted/20 p-3">
                {STUDY_VOCABULARY_TYPES.map((kind) => (
                  <label
                    key={kind}
                    htmlFor={`vocabulary-type-${kind}`}
                    className="flex items-center gap-2 text-sm leading-none"
                  >
                    <Checkbox
                      id={`vocabulary-type-${kind}`}
                      checked={studyVocabularyTypes.includes(kind)}
                      onCheckedChange={(checked) => toggleVocabularyType(kind, checked === true)}
                    />
                    {VOCABULARY_KIND_LABELS[kind]}
                  </label>
                ))}
              </div>
              {errors.studyVocabularyTypes && (
                <p className="text-xs text-destructive">{errors.studyVocabularyTypes.message}</p>
              )}
            </div>
          </div>

          <div className={settingsFieldClass}>
            <Label htmlFor="generation-custom-instructions" className={settingsLabelClass}>
              Default custom instructions
            </Label>
            <Textarea
              id="generation-custom-instructions"
              aria-invalid={!!errors.generationCustomInstructionsDefault}
              maxLength={CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH}
              placeholder="Optional guidance copied into each new generation request."
              {...register("generationCustomInstructionsDefault", {
                onChange: () => setPreferencesStatus(null),
              })}
            />
            <p className="text-xs text-muted-foreground">
              {customInstructions.trim().length}/{CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH}{" "}
              characters
            </p>
            {errors.generationCustomInstructionsDefault && (
              <p className="text-xs text-destructive">
                {errors.generationCustomInstructionsDefault.message}
              </p>
            )}
          </div>
        </div>

        <Separator />

        <AppPanel className="flex flex-col gap-3 border-dashed p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Retake CEFR assessment</p>
            <p className="text-sm text-muted-foreground">
              Run a new adaptive test if you want a fresh estimated level.
            </p>
          </div>
          <Button type="button" variant="outline" asChild>
            <Link href="/onboarding/assessment">
              <GraduationCap className="size-4" />
              Retake assessment
            </Link>
          </Button>
        </AppPanel>
      </CardContent>
    </Card>
  );
}
