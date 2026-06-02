"use client";

import { CheckCircle2, GraduationCap, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Controller } from "react-hook-form";

import { AppPanel } from "@/components/common/app-surface";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CEFR_LEVELS } from "@/features/assessment/types";
import type { SettingsPreferences } from "@/features/settings/types";
import { usePreferencesForm } from "../hooks/use-preferences-form";
import {
  CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
  STUDY_VOCABULARY_TYPES,
  settingsCardClass,
  settingsCardContentClass,
  settingsCardFooterClass,
  settingsCardHeaderClass,
  settingsFieldClass,
  settingsLabelClass,
  vocabularyTypeLabels,
} from "../lib/utils";

type PreferencesSettingsCardProps = {
  preferences: SettingsPreferences;
};

/**
 * Preferences settings card — groups CEFR level override, daily card cap,
 * content generation defaults, notification toggles, and vocabulary-type
 * selection into a single submit-scoped form using react-hook-form.
 */
export function PreferencesSettingsCard({ preferences }: PreferencesSettingsCardProps) {
  const {
    form,
    initialPreferences,
    effectiveCefrLevel,
    preferencesStatus,
    setPreferencesStatus,
    isSavingPreferences,
    handleSubmit,
    isDirty,
    errors,
    toggleVocabularyType,
  } = usePreferencesForm(preferences);

  const { control, register, watch } = form;
  const customInstructions = watch("generationCustomInstructionsDefault") ?? "";
  const studyVocabularyTypes = watch("studyVocabularyTypes");

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
                <p className="text-xs text-muted-foreground">
                  Multi-language support is coming soon.
                </p>
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
                {...register("newCardsPerDay", {
                  valueAsNumber: true,
                  onChange: () => setPreferencesStatus(null),
                })}
              />
              <p className="text-xs text-muted-foreground">
                Controls how many new cards can be introduced each app day. Due reviews are not
                capped.
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
                          onCheckedChange={(checked) =>
                            toggleVocabularyType(kind, checked === true)
                          }
                        />
                        {vocabularyTypeLabels[kind]}
                      </label>
                    ))}
                  </div>
                  {errors.studyVocabularyTypes && (
                    <p className="text-xs text-destructive">
                      {errors.studyVocabularyTypes.message}
                    </p>
                  )}
                </div>
              </div>

              <div className={settingsFieldClass}>
                <Label htmlFor="generation-custom-instructions" className={settingsLabelClass}>
                  Default custom instructions
                </Label>
                <Textarea
                  id="generation-custom-instructions"
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

        <Card id="preferences-notifications" className={settingsCardClass}>
          <CardHeader className={settingsCardHeaderClass}>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Reminder and streak toggles.</CardDescription>
          </CardHeader>
          <CardContent className={`${settingsCardContentClass} space-y-3`}>
            <AppPanel className="flex items-start justify-between gap-4 p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Email reminders</p>
                <p className="text-sm text-muted-foreground">Reminder email for waiting queues.</p>
              </div>
              <Controller
                control={control}
                name="emailRemindersEnabled"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setPreferencesStatus(null);
                    }}
                    aria-label="Toggle email reminders"
                  />
                )}
              />
            </AppPanel>

            <AppPanel className="flex items-start justify-between gap-4 p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Streak alerts</p>
                <p className="text-sm text-muted-foreground">
                  Alert before the current streak lapses.
                </p>
              </div>
              <Controller
                control={control}
                name="streakAlertsEnabled"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setPreferencesStatus(null);
                    }}
                    aria-label="Toggle streak alerts"
                  />
                )}
              />
            </AppPanel>
          </CardContent>
          <CardFooter className={settingsCardFooterClass}>
            <div className="flex w-full items-center gap-2 text-sm">
              {preferencesStatus ? (
                <>
                  {preferencesStatus.type === "success" ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <ShieldAlert className="size-4 text-destructive" />
                  )}
                  <span
                    className={
                      preferencesStatus.type === "success"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive"
                    }
                  >
                    {preferencesStatus.message}
                  </span>
                </>
              ) : null}
            </div>
            <Button type="submit" disabled={isSavingPreferences || !isDirty}>
              {isSavingPreferences ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save preferences"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  );
}
