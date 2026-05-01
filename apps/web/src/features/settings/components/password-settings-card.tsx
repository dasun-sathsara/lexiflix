"use client";

import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  type StatusState,
  settingsCardClass,
  settingsCardContentClass,
  settingsCardFooterClass,
  settingsCardHeaderClass,
  settingsFieldClass,
  settingsLabelClass,
} from "./_utils";

type PasswordSettingsCardProps = {
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  passwordStatus: StatusState;
  setPasswordStatus: (status: StatusState) => void;
  passwordSubmitDisabled: boolean;
  isUpdatingPassword: boolean;
};

/**
 * Password settings card — handles credential updates via the legacy
 * password-based auth flow.
 */
export function PasswordSettingsCard({
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordStatus,
  setPasswordStatus,
  passwordSubmitDisabled,
  isUpdatingPassword,
}: PasswordSettingsCardProps) {
  return (
    <Card id="security" className={settingsCardClass}>
      <CardHeader className={settingsCardHeaderClass}>
        <CardTitle>Password</CardTitle>
        <CardDescription>Account credential update.</CardDescription>
      </CardHeader>
      <CardContent className={`${settingsCardContentClass} grid gap-3 sm:grid-cols-2`}>
        <div className={settingsFieldClass}>
          <Label htmlFor="current-password" className={settingsLabelClass}>
            Current password
          </Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setPasswordStatus(null);
            }}
            placeholder="••••••••"
          />
        </div>
        <div className={settingsFieldClass}>
          <Label htmlFor="new-password" className={settingsLabelClass}>
            New password
          </Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => {
              setNewPassword(event.target.value);
              setPasswordStatus(null);
            }}
            placeholder="At least 8 characters"
          />
        </div>
        <div className={`sm:col-span-2 ${settingsFieldClass}`}>
          <Label htmlFor="confirm-password" className={settingsLabelClass}>
            Confirm new password
          </Label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setPasswordStatus(null);
            }}
            placeholder="Repeat your new password"
          />
        </div>
      </CardContent>
      <CardFooter className={settingsCardFooterClass}>
        <div className="flex items-center gap-2 text-sm">
          {passwordStatus ? (
            <>
              {passwordStatus.type === "success" ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <ShieldAlert className="size-4 text-destructive" />
              )}
              <span
                className={
                  passwordStatus.type === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }
              >
                {passwordStatus.message}
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="size-4 text-indigo-500" />
              <span className="text-muted-foreground">Use at least 8 characters.</span>
            </>
          )}
        </div>
        <Button type="submit" disabled={passwordSubmitDisabled}>
          {isUpdatingPassword ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Updating
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
