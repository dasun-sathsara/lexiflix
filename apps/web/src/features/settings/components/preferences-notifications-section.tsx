"use client";

import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";

import { AppPanel } from "@/components/common/app-surface";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { PreferencesSettingsInput, StatusState } from "@/features/settings/types";
import {
  settingsCardClass,
  settingsCardContentClass,
  settingsCardFooterClass,
  settingsCardHeaderClass,
} from "../lib/utils";

type PreferencesNotificationsSectionProps = {
  control: Control<PreferencesSettingsInput>;
  preferencesStatus: StatusState;
  setPreferencesStatus: (status: null) => void;
  isSavingPreferences: boolean;
  isDirty: boolean;
};

export function PreferencesNotificationsSection({
  control,
  preferencesStatus,
  setPreferencesStatus,
  isSavingPreferences,
  isDirty,
}: PreferencesNotificationsSectionProps) {
  return (
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
            <p className="text-sm text-muted-foreground">Alert before the current streak lapses.</p>
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
  );
}
