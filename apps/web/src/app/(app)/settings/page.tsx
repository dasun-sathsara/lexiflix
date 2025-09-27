"use client";

import { CheckCircle2, ShieldAlert, ShieldCheck, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

const INITIAL_USERNAME = "lexi.studio";

export default function SettingsPage() {
  const [username, setUsername] = useState(INITIAL_USERNAME);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview((previous) => {
      if (previous?.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }
      return objectUrl;
    });
    setAvatarFileName(file.name);
    setProfileStatus(null);
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(null);
    setAvatarFileName(null);
    setProfileStatus(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const hasProfileChanges = username.trim() !== INITIAL_USERNAME || avatarPreview !== null;

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasProfileChanges) {
      return;
    }

    setProfileStatus(
      "Profile updated. Your learners will see the new details within a few moments.",
    );
  };

  const profileSubmitDisabled = !username.trim() || !hasProfileChanges;

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      setPasswordStatus({
        type: "error",
        message: "Use at least 8 characters for your new password.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: "The new password fields need to match exactly.",
      });
      return;
    }

    setPasswordStatus({
      type: "success",
      message: "Password updated. We will sign you out of other devices to keep things secure.",
    });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const passwordSubmitDisabled =
    !currentPassword.trim() ||
    !newPassword.trim() ||
    !confirmPassword.trim() ||
    newPassword.length < 8;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="space-y-3">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">
          Account
        </span>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">User settings</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Manage how you show up in shared sessions and keep your LexiFlix account safeguarded.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <form onSubmit={handleProfileSubmit} className="contents">
            <Card id="profile">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Refresh your avatar and display name so collaborators recognize you instantly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border/70 bg-muted/30 p-4 sm:flex-row sm:items-center sm:gap-5">
                  <Avatar className="size-16 sm:size-20">
                    {avatarPreview ? (
                      <AvatarImage src={avatarPreview} alt="Profile preview" />
                    ) : (
                      <AvatarFallback className="text-base font-medium">LS</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-1 flex-col gap-3">
                    <p className="text-sm text-muted-foreground">
                      Upload a square image (JPG, PNG, or WebP). Keep it under 1 MB for the
                      snappiest sync.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <Button type="button" size="sm" onClick={triggerFilePicker}>
                        <Upload className="size-4" />
                        Upload new
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={!avatarPreview}
                        onClick={handleRemoveAvatar}
                      >
                        Reset
                      </Button>
                      {avatarFileName ? (
                        <span
                          className="truncate text-xs text-muted-foreground"
                          title={avatarFileName}
                        >
                          {avatarFileName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2 space-y-2">
                    <Label htmlFor="username">Display name</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(event) => {
                        setUsername(event.target.value);
                        setProfileStatus(null);
                      }}
                      placeholder="Your public username"
                    />
                    <p className="text-xs text-muted-foreground">
                      This appears on study leaderboards, shared packs, and invitations you send.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm">
                  {profileStatus ? (
                    <>
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {profileStatus}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="size-4 text-indigo-500" />
                      <span className="text-muted-foreground">
                        Changes save instantly across the dashboard once you hit save.
                      </span>
                    </>
                  )}
                </div>
                <Button type="submit" disabled={profileSubmitDisabled}>
                  Save profile
                </Button>
              </CardFooter>
            </Card>
          </form>

          <form onSubmit={handlePasswordSubmit} className="contents">
            <Card id="security">
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Rotate your credentials regularly to keep your learning streaks and billing
                  details secure.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current password</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
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
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
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
              <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                      <span className="text-muted-foreground">
                        Use a unique phrase. We will never share it with anyone.
                      </span>
                    </>
                  )}
                </div>
                <Button type="submit" disabled={passwordSubmitDisabled}>
                  Update password
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>

        <div className="flex flex-col gap-6">
          <Card id="danger" className="border-destructive/40 bg-destructive/5">
            <CardHeader className="space-y-1.5">
              <CardTitle>Delete account</CardTitle>
              <CardDescription>Remove your LexiFlix data permanently.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Deleting your account wipes packs, progress, and billing records right away. Export
                anything you need before you continue.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {deleteStatus ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">{deleteStatus}</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="size-4 text-destructive" />
                    <span>Only proceed if you are sure.</span>
                  </>
                )}
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="px-3">
                    <Trash2 className="size-4" />
                    Delete account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action is permanent. All packs, analytics, and billing records disappear
                      immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Never mind</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
                      onClick={() => {
                        setDeleteStatus("Request received. We'll email confirmation soon.");
                      }}
                    >
                      Delete anyway
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
