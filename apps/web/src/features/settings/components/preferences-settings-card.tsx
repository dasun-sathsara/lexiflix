"use client";

import { CheckCircle2, GraduationCap, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";

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
import { CEFR_LEVELS, type CefrLevel } from "@/features/assessment/lib/types";
import type { SettingsPreferences } from "@/features/settings/types";
import type { StoredVocabularyKind } from "@/lib/server/db/json-contracts";

import {
  CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
  type ManualOverrideSelection,
  STUDY_VOCABULARY_TYPES,
  type StatusState,
  settingsCardClass,
  settingsCardContentClass,
  settingsCardFooterClass,
  settingsCardHeaderClass,
  settingsFieldClass,
  settingsLabelClass,
  vocabularyTypeLabels,
} from "./_utils";

type PreferencesSettingsCardProps = {
  initialPreferences: SettingsPreferences;
  manualOverrideSelection: ManualOverrideSelection;
  setManualOverrideSelection: (value: ManualOverrideSelection) => void;
  newCardsPerDay: string;
  setNewCardsPerDay: (value: string) => void;
  frequencyPreference: SettingsPreferences["frequencyPreference"];
  setFrequencyPreference: (value: SettingsPreferences["frequencyPreference"]) => void;
  studyVocabularyTypes: StoredVocabularyKind[];
  setStudyVocabularyTypes: (value: StoredVocabularyKind[]) => void;
  generationPackSizeDefault: string;
  setGenerationPackSizeDefault: (value: string) => void;
  generationCefrWindowMode: SettingsPreferences["generationCefrWindowMode"];
  setGenerationCefrWindowMode: (value: SettingsPreferences["generationCefrWindowMode"]) => void;
  generationKnownTermHandling: SettingsPreferences["generationKnownTermHandling"];
  setGenerationKnownTermHandling: (
    value: SettingsPreferences["generationKnownTermHandling"],
  ) => void;
  generationAudioVoiceGenderDefault: SettingsPreferences["generationAudioVoiceGenderDefault"];
  setGenerationAudioVoiceGenderDefault: (
    value: SettingsPreferences["generationAudioVoiceGenderDefault"],
  ) => void;
  generationExampleSentenceCount: string;
  setGenerationExampleSentenceCount: (value: string) => void;
  generationCustomInstructionsDefault: string;
  setGenerationCustomInstructionsDefault: (value: string) => void;
  emailRemindersEnabled: boolean;
  setEmailRemindersEnabled: (value: boolean) => void;
  streakAlertsEnabled: boolean;
  setStreakAlertsEnabled: (value: boolean) => void;
  effectiveCefrLevel: CefrLevel | null;
  preferencesStatus: StatusState;
  setPreferencesStatus: (status: StatusState) => void;
  preferencesSubmitDisabled: boolean;
  isSavingPreferences: boolean;
  handlePreferencesSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

/**
 * Preferences settings card — groups CEFR level override, daily card cap,
 * content generation defaults, notification toggles, and vocabulary-type
 * selection into a single submit-scoped form.
 */
export function PreferencesSettingsCard({
  initialPreferences,
  manualOverrideSelection,
  setManualOverrideSelection,
  newCardsPerDay,
  setNewCardsPerDay,
  frequencyPreference,
  setFrequencyPreference,
  studyVocabularyTypes,
  setStudyVocabularyTypes,
  generationPackSizeDefault,
  setGenerationPackSizeDefault,
  generationCefrWindowMode,
  setGenerationCefrWindowMode,
  generationKnownTermHandling,
  setGenerationKnownTermHandling,
  generationAudioVoiceGenderDefault,
  setGenerationAudioVoiceGenderDefault,
  generationExampleSentenceCount,
  setGenerationExampleSentenceCount,
  generationCustomInstructionsDefault,
  setGenerationCustomInstructionsDefault,
  emailRemindersEnabled,
  setEmailRemindersEnabled,
  streakAlertsEnabled,
  setStreakAlertsEnabled,
  effectiveCefrLevel,
  preferencesStatus,
  setPreferencesStatus,
  preferencesSubmitDisabled,
  isSavingPreferences,
  handlePreferencesSubmit,
}: PreferencesSettingsCardProps) {
  const parsedNewCardsPerDay = Number.parseInt(newCardsPerDay, 10);
  const newCardsPerDayIsValid =
    Number.isInteger(parsedNewCardsPerDay) &&
    parsedNewCardsPerDay >= 1 &&
    parsedNewCardsPerDay <= 100;

  const parsedGenerationPackSize = Number.parseInt(generationPackSizeDefault, 10);
  const generationPackSizeIsValid =
    Number.isInteger(parsedGenerationPackSize) && parsedGenerationPackSize >= 1;

  const customInstructionsIsValid =
    generationCustomInstructionsDefault.trim().length <= CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH;

  const vocabularyTypesAreValid = studyVocabularyTypes.length > 0;

  const toggleVocabularyType = (kind: StoredVocabularyKind, checked: boolean) => {
    if (checked) {
      setStudyVocabularyTypes(
        studyVocabularyTypes.includes(kind)
          ? studyVocabularyTypes
          : [...studyVocabularyTypes, kind],
      );
    } else {
      const next = studyVocabularyTypes.filter((value) => value !== kind);
      if (next.length > 0) {
        setStudyVocabularyTypes(next);
      }
    }
    setPreferencesStatus(null);
  };

  return (
    <form onSubmit={handlePreferencesSubmit}>
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
                <Select
                  value={manualOverrideSelection}
                  onValueChange={(value) => {
                    if (value === "assessed" || CEFR_LEVELS.includes(value as CefrLevel)) {
                      setManualOverrideSelection(value as ManualOverrideSelection);
                    }
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
                value={newCardsPerDay}
                onChange={(event) => {
                  setNewCardsPerDay(event.target.value);
                  setPreferencesStatus(null);
                }}
                placeholder="20"
              />
              <p className="text-xs text-muted-foreground">
                Controls how many new cards can be introduced each app day. Due reviews are not
                capped.
              </p>
              {!newCardsPerDayIsValid ? (
                <p className="text-xs text-destructive">Enter a whole number between 1 and 100.</p>
              ) : null}
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
                    value={generationPackSizeDefault}
                    onChange={(event) => {
                      setGenerationPackSizeDefault(event.target.value);
                      setPreferencesStatus(null);
                    }}
                  />
                  {!generationPackSizeIsValid ? (
                    <p className="text-xs text-destructive">Enter a whole number of 1 or more.</p>
                  ) : null}
                </div>

                <div className={settingsFieldClass}>
                  <Label htmlFor="generation-example-count" className={settingsLabelClass}>
                    Example sentences
                  </Label>
                  <Select
                    value={generationExampleSentenceCount}
                    onValueChange={(value) => {
                      setGenerationExampleSentenceCount(value);
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
                </div>

                <div className={settingsFieldClass}>
                  <Label htmlFor="generation-cefr-window" className={settingsLabelClass}>
                    CEFR window
                  </Label>
                  <Select
                    value={generationCefrWindowMode}
                    onValueChange={(value) => {
                      setGenerationCefrWindowMode(
                        value as SettingsPreferences["generationCefrWindowMode"],
                      );
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
                </div>

                <div className={settingsFieldClass}>
                  <Label htmlFor="generation-known-terms" className={settingsLabelClass}>
                    Known terms
                  </Label>
                  <Select
                    value={generationKnownTermHandling}
                    onValueChange={(value) => {
                      setGenerationKnownTermHandling(
                        value as SettingsPreferences["generationKnownTermHandling"],
                      );
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
                </div>

                <div className={settingsFieldClass}>
                  <Label htmlFor="frequency-preference" className={settingsLabelClass}>
                    Vocabulary Selection Priority
                  </Label>
                  <Select
                    value={frequencyPreference}
                    onValueChange={(value) => {
                      setFrequencyPreference(value as SettingsPreferences["frequencyPreference"]);
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
                </div>

                <div className={settingsFieldClass}>
                  <Label htmlFor="generation-audio-voice-gender" className={settingsLabelClass}>
                    Audio voice
                  </Label>
                  <Select
                    value={generationAudioVoiceGenderDefault}
                    onValueChange={(value) => {
                      setGenerationAudioVoiceGenderDefault(
                        value as SettingsPreferences["generationAudioVoiceGenderDefault"],
                      );
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
                  {!vocabularyTypesAreValid ? (
                    <p className="text-xs text-destructive">Select at least one vocabulary type.</p>
                  ) : null}
                </div>
              </div>

              <div className={settingsFieldClass}>
                <Label htmlFor="generation-custom-instructions" className={settingsLabelClass}>
                  Default custom instructions
                </Label>
                <Textarea
                  id="generation-custom-instructions"
                  value={generationCustomInstructionsDefault}
                  maxLength={CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH}
                  onChange={(event) => {
                    setGenerationCustomInstructionsDefault(event.target.value);
                    setPreferencesStatus(null);
                  }}
                  placeholder="Optional guidance copied into each new generation request."
                />
                <p className="text-xs text-muted-foreground">
                  {generationCustomInstructionsDefault.trim().length}/
                  {CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH} characters
                </p>
                {!customInstructionsIsValid ? (
                  <p className="text-xs text-destructive">
                    Custom instructions must stay under {CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH}{" "}
                    characters.
                  </p>
                ) : null}
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
              <Switch
                checked={emailRemindersEnabled}
                onCheckedChange={(checked) => {
                  setEmailRemindersEnabled(checked);
                  setPreferencesStatus(null);
                }}
                aria-label="Toggle email reminders"
              />
            </AppPanel>

            <AppPanel className="flex items-start justify-between gap-4 p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Streak alerts</p>
                <p className="text-sm text-muted-foreground">
                  Alert before the current streak lapses.
                </p>
              </div>
              <Switch
                checked={streakAlertsEnabled}
                onCheckedChange={(checked) => {
                  setStreakAlertsEnabled(checked);
                  setPreferencesStatus(null);
                }}
                aria-label="Toggle streak alerts"
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
            <Button type="submit" disabled={preferencesSubmitDisabled}>
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
