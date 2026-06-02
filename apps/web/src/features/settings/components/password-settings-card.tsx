"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { changePasswordAction } from "@/features/settings/server/actions";
import {
  type PasswordSettingsInput,
  passwordSettingsSchema,
  type StatusState,
} from "@/features/settings/types";
import {
  settingsCardClass,
  settingsCardContentClass,
  settingsCardFooterClass,
  settingsCardHeaderClass,
  settingsFieldClass,
  settingsLabelClass,
} from "../lib/utils";

/**
 * Password settings card — handles credential updates via react-hook-form.
 */
export function PasswordSettingsCard() {
  const [status, setStatus] = useState<StatusState>(null);
  const [isUpdating, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PasswordSettingsInput>({
    resolver: zodResolver(passwordSettingsSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: PasswordSettingsInput) => {
    setStatus(null);
    startTransition(async () => {
      const result = await changePasswordAction(data);
      if (result.ok) {
        setStatus({ type: "success", message: "Password updated successfully." });
        toast.success("Password updated successfully.");
        reset();
      } else {
        setStatus({ type: "error", message: result.error });
        toast.error(result.error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="contents">
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
              placeholder="••••••••"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <span className="text-xs text-destructive">{errors.currentPassword.message}</span>
            )}
          </div>
          <div className={settingsFieldClass}>
            <Label htmlFor="new-password" className={settingsLabelClass}>
              New password
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <span className="text-xs text-destructive">{errors.newPassword.message}</span>
            )}
          </div>
          <div className={`sm:col-span-2 ${settingsFieldClass}`}>
            <Label htmlFor="confirm-password" className={settingsLabelClass}>
              Confirm new password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your new password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <span className="text-xs text-destructive">{errors.confirmPassword.message}</span>
            )}
          </div>
        </CardContent>
        <CardFooter className={settingsCardFooterClass}>
          <div className="flex items-center gap-2 text-sm">
            {status ? (
              <>
                {status.type === "success" ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : (
                  <ShieldAlert className="size-4 text-destructive" />
                )}
                <span
                  className={
                    status.type === "success"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }
                >
                  {status.message}
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="size-4 text-indigo-500" />
                <span className="text-muted-foreground">Use at least 8 characters.</span>
              </>
            )}
          </div>
          <Button type="submit" disabled={isUpdating || !isDirty}>
            {isUpdating ? (
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
    </form>
  );
}
