"use client";

import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

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
import { changePasswordAction, deleteAccountAction } from "@/features/settings/actions";

type StatusState = {
  type: "success" | "error";
  message: string;
} | null;

type SettingsClientProps = {
  user: {
    name: string;
    email: string;
    image: string | null;
  };
};

export function SettingsClient({ user }: SettingsClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [initialProfile, setInitialProfile] = useState(() => ({
    name: user.name,
    avatar: user.image ?? null,
  }));
  const [displayName, setDisplayName] = useState(initialProfile.name);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialProfile.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarFileName, setAvatarFileName] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [profileStatus, setProfileStatus] = useState<StatusState>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<StatusState>(null);

  const [deleteStatus, setDeleteStatus] = useState<StatusState>(null);

  const [isSavingProfile, startSavingProfile] = useTransition();
  const [isUpdatingPassword, startUpdatingPassword] = useTransition();
  const [isDeletingAccount, startDeletingAccount] = useTransition();

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const initials = useMemo(
    () =>
      displayName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || "LX",
    [displayName],
  );

  const trimmedDisplayName = displayName.trim();
  const nameIsValid = trimmedDisplayName.length >= 2 && trimmedDisplayName.length <= 80;
  const nameChanged = trimmedDisplayName !== initialProfile.name;
  const avatarChanged =
    removeAvatar || avatarFile !== null || avatarPreview !== initialProfile.avatar;
  const hasProfileChanges = nameChanged || avatarChanged;

  const profileSubmitDisabled = isSavingProfile || !nameIsValid || !hasProfileChanges;

  const passwordSubmitDisabled =
    isUpdatingPassword ||
    !currentPassword.trim() ||
    !newPassword.trim() ||
    !confirmPassword.trim() ||
    newPassword.length < 8;

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setAvatarFile(file);
    setAvatarFileName(file.name);
    setRemoveAvatar(false);
    setProfileStatus(null);
  };

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
    setProfileStatus(null);
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
    setProfileStatus(null);
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (profileSubmitDisabled) {
      return;
    }

    const formData = new FormData();
    formData.append("name", trimmedDisplayName);

    if (avatarFile) {
      formData.append("avatar", avatarFile);
    }

    if (removeAvatar && !avatarFile) {
      formData.append("removeAvatar", "true");
    }

    startSavingProfile(async () => {
      try {
        const response = await fetch("/api/settings/profile", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();

        if (!response.ok || !payload.success) {
          const message = payload.error || "Failed to update profile.";
          setProfileStatus({ type: "error", message });
          toast.error(message);
          return;
        }

        const nextName: string = payload.user?.name ?? trimmedDisplayName;
        const nextImage: string | null = payload.user?.image ?? null;

        setInitialProfile({
          name: nextName,
          avatar: nextImage,
        });
        setDisplayName(nextName);
        setAvatarPreview(nextImage);
        setAvatarFile(null);
        setAvatarFileName(null);
        setRemoveAvatar(false);
        setProfileStatus({
          type: "success",
          message: "Profile updated successfully.",
        });
        clearFileInput();
        toast.success("Profile updated");
        router.refresh();
      } catch (error) {
        console.error("Failed to update profile", error);
        setProfileStatus({ type: "error", message: "Failed to update profile." });
        toast.error("Failed to update profile");
      }
    });
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (passwordSubmitDisabled) {
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: "error",
        message: "The new password fields need to match exactly.",
      });
      return;
    }

    startUpdatingPassword(async () => {
      const result = await changePasswordAction({
        currentPassword,
        newPassword,
      });

      if (!result.success) {
        setPasswordStatus({
          type: "error",
          message: result.message,
        });
        toast.error(result.message);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus({
        type: "success",
        message: "Password updated. You will stay signed in on this device.",
      });
      toast.success("Password updated");
    });
  };

  const handleDeleteAccount = () => {
    startDeletingAccount(async () => {
      const result = await deleteAccountAction();

      if (!result.success) {
        setDeleteStatus({ type: "error", message: result.message });
        toast.error(result.message);
        return;
      }

      setDeleteStatus({
        type: "success",
        message: "Account deleted. Redirecting...",
      });
      toast.success("Account deleted");
      window.location.href = "/";
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6">
      <header className="space-y-3">
        <span className="text-xs font-semibold uppercase text-indigo-500">Account</span>
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
                    <p className="text-sm text-muted-foreground">
                      Upload a square image (JPG, PNG, or WebP). Keep it under 5 MB for the
                      snappiest sync.
                    </p>
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
                        disabled={
                          avatarPreview === null && avatarFile === null && !initialProfile.avatar
                        }
                      >
                        Remove photo
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
                    <Label htmlFor="display-name">Display name</Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(event) => {
                        setDisplayName(event.target.value);
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
                      <span className="text-muted-foreground">
                        Changes save instantly across the dashboard once you hit save.
                      </span>
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
            <CardFooter className="flex flex-row gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {deleteStatus ? (
                  <>
                    {deleteStatus.type === "success" ? (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="size-4 text-destructive" />
                    )}
                    <span
                      className={
                        deleteStatus.type === "success"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-destructive"
                      }
                    >
                      {deleteStatus.message}
                    </span>
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
                  <Button
                    variant="destructive"
                    size="sm"
                    className="px-3"
                    disabled={isDeletingAccount}
                  >
                    {isDeletingAccount ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    {isDeletingAccount ? "Deleting" : "Delete account"}
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
                    <AlertDialogCancel disabled={isDeletingAccount}>Never mind</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/30"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
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
