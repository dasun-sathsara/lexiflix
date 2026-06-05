"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck, Upload } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { updateProfileAction } from "@/features/settings/server/actions";
import {
  type ProfileSettingsInput,
  profileSettingsSchema,
  type StatusState,
} from "@/features/settings/types";
import {
  getInitials,
  settingsCardClass,
  settingsCardContentClass,
  settingsCardFooterClass,
  settingsCardHeaderClass,
  settingsFieldClass,
  settingsLabelClass,
} from "../lib/utils";

type ProfileSettingsCardProps = {
  user: {
    name: string;
    image: string | null;
  };
};

/**
 * Profile settings card — manages display name via RHF and avatar upload via standard React state.
 */
export function ProfileSettingsCard({ user }: ProfileSettingsCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<StatusState>(null);
  const [isSaving, startTransition] = useTransition();

  const [initialProfile, setInitialProfile] = useState(() => ({
    name: user.name,
    avatar: user.image ?? null,
  }));

  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialProfile.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProfileSettingsInput>({
    resolver: zodResolver(profileSettingsSchema),
    defaultValues: {
      displayName: user.name,
    },
  });

  const displayName = watch("displayName");
  const initials = useMemo(() => getInitials(displayName || user.name), [displayName, user.name]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const nameChanged = displayName.trim() !== initialProfile.name;
  const avatarChanged =
    removeAvatar || avatarFile !== null || avatarPreview !== initialProfile.avatar;
  const hasChanges = nameChanged || avatarChanged;

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
    setStatus(null);
  };

  const handleAvatarReset = () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview(initialProfile.avatar);
    setAvatarFile(null);
    setAvatarFileName(null);
    setRemoveAvatar(false);
    clearFileInput();
    setStatus(null);
  };

  const handleAvatarRemove = () => {
    if (!initialProfile.avatar && !avatarPreview && !avatarFile) {
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
    setStatus(null);
  };

  const onSubmit = (data: ProfileSettingsInput) => {
    setStatus(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("name", data.displayName.trim());
        if (removeAvatar) {
          formData.append("removeAvatar", "true");
        }
        if (avatarFile) {
          formData.append("avatar", avatarFile);
        }

        const result = await updateProfileAction(formData);
        if (result.ok) {
          const updatedUser = result.data.user;
          setInitialProfile({
            name: updatedUser.name,
            avatar: updatedUser.image,
          });
          setAvatarPreview(updatedUser.image);
          setAvatarFile(null);
          setAvatarFileName(null);
          setRemoveAvatar(false);
          clearFileInput();

          reset({ displayName: updatedUser.name });
          setStatus({ type: "success", message: "Profile updated successfully." });
          toast.success("Profile updated successfully.");
        } else {
          const errorMsg = result.error || "Failed to update profile.";
          setStatus({ type: "error", message: errorMsg });
          toast.error(errorMsg);
        }
      } catch (error) {
        console.error("Failed to update profile", error);
        setStatus({
          type: "error",
          message: "Failed to update profile.",
        });
        toast.error("Failed to update profile.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="contents">
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
                  disabled={!hasChanges}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleAvatarRemove}
                  disabled={avatarPreview === null && avatarFile === null && !initialProfile.avatar}
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
                placeholder="Your public username"
                aria-invalid={!!errors.displayName}
                {...register("displayName")}
              />
              {errors.displayName && (
                <span className="text-xs text-destructive">{errors.displayName.message}</span>
              )}
            </div>
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
                <span className="text-muted-foreground">No unsaved profile changes.</span>
              </>
            )}
          </div>
          <Button type="submit" disabled={isSaving || !hasChanges}>
            {isSaving ? (
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
    </form>
  );
}
