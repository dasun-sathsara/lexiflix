"use client";

import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Separator } from "@/components/ui/separator";

import {
  type StatusState,
  settingsCardClass,
  settingsCardContentClass,
  settingsCardFooterClass,
  settingsCardHeaderClass,
  settingsFieldClass,
  settingsLabelClass,
} from "./_utils";

type ProfileSettingsCardProps = {
  displayName: string;
  setDisplayName: (value: string) => void;
  avatarPreview: string | null;
  setAvatarPreview: (url: string | null) => void;
  avatarFile: File | null;
  setAvatarFile: (file: File | null) => void;
  avatarFileName: string | null;
  setAvatarFileName: (name: string | null) => void;
  setRemoveAvatar: (remove: boolean) => void;
  initialAvatar: string | null;
  initials: string;
  hasProfileChanges: boolean;
  profileStatus: StatusState;
  setProfileStatus: (status: StatusState) => void;
  profileSubmitDisabled: boolean;
  isSavingProfile: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
};

/**
 * Profile settings card — manages avatar upload and display name.
 */
export function ProfileSettingsCard({
  displayName,
  setDisplayName,
  avatarPreview,
  setAvatarPreview,
  avatarFile,
  setAvatarFile,
  avatarFileName,
  setAvatarFileName,
  setRemoveAvatar,
  initialAvatar,
  initials,
  hasProfileChanges,
  profileStatus,
  setProfileStatus,
  profileSubmitDisabled,
  isSavingProfile,
  fileInputRef,
}: ProfileSettingsCardProps) {
  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview(URL.createObjectURL(file));
    setAvatarFile(file);
    setAvatarFileName(file.name);
    setRemoveAvatar(false);
    setProfileStatus(null);
  };

  const handleAvatarReset = () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview(initialAvatar);
    setAvatarFile(null);
    setAvatarFileName(null);
    setRemoveAvatar(false);
    clearFileInput();
    setProfileStatus(null);
  };

  const handleAvatarRemove = () => {
    if (!initialAvatar && !avatarPreview && !avatarFile) {
      return;
    }

    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview(null);
    setAvatarFile(null);
    setAvatarFileName(null);
    setRemoveAvatar(true);
    clearFileInput();
    setProfileStatus(null);
  };

  return (
    <Card id="profile" className={settingsCardClass}>
      <CardHeader className={settingsCardHeaderClass}>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Avatar and display name.</CardDescription>
      </CardHeader>
      <CardContent className={`${settingsCardContentClass} space-y-4`}>
        <div className="flex flex-col gap-3 rounded-[calc(var(--radius)+2px)] border border-dashed border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center sm:gap-4">
          <Avatar className="size-16 sm:size-20">
            {avatarPreview ? (
              <AvatarImage
                src={avatarPreview}
                alt="Profile preview"
                className="size-full object-cover"
              />
            ) : (
              <AvatarFallback className="text-base font-medium">{initials}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-1 flex-col gap-3">
            <p className="text-sm text-muted-foreground">JPG, PNG, or WebP. Maximum 5 MB.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" />
                Upload new
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleAvatarReset}
                disabled={!hasProfileChanges}
              >
                Reset
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleAvatarRemove}
                disabled={avatarPreview === null && avatarFile === null && !initialAvatar}
              >
                Remove photo
              </Button>
              {avatarFileName ? (
                <span className="truncate text-xs text-muted-foreground" title={avatarFileName}>
                  {avatarFileName}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`sm:col-span-2 ${settingsFieldClass}`}>
            <Label htmlFor="display-name" className={settingsLabelClass}>
              Display name
            </Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setProfileStatus(null);
              }}
              placeholder="Your public username"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className={settingsCardFooterClass}>
        <div className="flex items-center gap-2 text-sm">
          {profileStatus ? (
            <>
              {profileStatus.type === "success" ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <ShieldAlert className="size-4 text-destructive" />
              )}
              <span
                className={
                  profileStatus.type === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                }
              >
                {profileStatus.message}
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="size-4 text-indigo-500" />
              <span className="text-muted-foreground">No unsaved profile changes.</span>
            </>
          )}
        </div>
        <Button type="submit" disabled={profileSubmitDisabled}>
          {isSavingProfile ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving
            </>
          ) : (
            "Save profile"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
