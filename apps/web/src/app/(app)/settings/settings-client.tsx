"use client";

import {
  CheckCircle2,
  GraduationCap,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { AppPanel } from "@/components/common/app-surface";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CEFR_LEVELS, type CefrLevel } from "@/features/assessment/lib/types";
import {
  changePasswordAction,
  deleteAccountAction,
  updateProfileAction,
  updateSettingsPreferencesAction,
} from "@/features/settings/actions";
import type { SettingsPreferences } from "@/features/settings/types";
import type { StoredVocabularyKind } from "@/lib/server/db/json-contracts";

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
  preferences: SettingsPreferences;
};

type ManualOverrideSelection = CefrLevel | "assessed";
type SettingsTab = "account" | "preferences";

function toSettingsTab(value: string | null): SettingsTab {
  return value === "preferences" ? "preferences" : "account";
}

const vocabularyTypeLabels: Record<StoredVocabularyKind, string> = {
  word: "Words",
  phrasal_verb: "Phrasal verbs",
  idiom: "Idioms",
  slang: "Slang",
};
const STUDY_VOCABULARY_TYPES: StoredVocabularyKind[] = ["word", "phrasal_verb", "idiom", "slang"];
const CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH = 1200;
const settingsCardClass =
  "gap-0 rounded-[calc(var(--radius)+2px)] border bg-card/60 py-0 shadow-sm";
const settingsCardHeaderClass = "gap-1.5 border-b py-3.5";
const settingsCardContentClass = "py-3.5";
const settingsCardFooterClass =
  "border-t py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";
const settingsFieldClass = "flex flex-col gap-1.5";
const settingsLabelClass = "text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground";

function normalizeCustomInstructions(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function SettingsClient({ user, preferences }: SettingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
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
  const [preferencesStatus, setPreferencesStatus] = useState<StatusState>(null);

  const [initialPreferences, setInitialPreferences] = useState(preferences);
  const [manualOverrideSelection, setManualOverrideSelection] = useState<ManualOverrideSelection>(
    preferences.manualOverrideLevel ?? "assessed",
  );
  const [newCardsPerDay, setNewCardsPerDay] = useState(String(preferences.newCardsPerDay));
  const [frequencyPreference, setFrequencyPreference] = useState(preferences.frequencyPreference);
  const [studyVocabularyTypes, setStudyVocabularyTypes] = useState<StoredVocabularyKind[]>(
    preferences.studyVocabularyTypes,
  );
  const [generationPackSizeDefault, setGenerationPackSizeDefault] = useState(
    String(preferences.generationPackSizeDefault),
  );
  const [generationCefrWindowMode, setGenerationCefrWindowMode] = useState(
    preferences.generationCefrWindowMode,
  );
  const [generationKnownTermHandling, setGenerationKnownTermHandling] = useState(
    preferences.generationKnownTermHandling,
  );
  const [generationExampleSentenceCount, setGenerationExampleSentenceCount] = useState(
    String(preferences.generationExampleSentenceCount),
  );
  const [generationCustomInstructionsDefault, setGenerationCustomInstructionsDefault] = useState(
    preferences.generationCustomInstructionsDefault ?? "",
  );
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(
    preferences.emailRemindersEnabled,
  );
  const [streakAlertsEnabled, setStreakAlertsEnabled] = useState(preferences.streakAlertsEnabled);

  const [isSavingProfile, startSavingProfile] = useTransition();
  const [isSavingPreferences, startSavingPreferences] = useTransition();
  const [isUpdatingPassword, startUpdatingPassword] = useTransition();
  const [isDeletingAccount, startDeletingAccount] = useTransition();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => toSettingsTab(tabParam));

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    setActiveTab(toSettingsTab(tabParam));
  }, [tabParam]);

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

  const parsedNewCardsPerDay = Number.parseInt(newCardsPerDay, 10);
  const newCardsPerDayIsValid =
    Number.isInteger(parsedNewCardsPerDay) &&
    parsedNewCardsPerDay >= 1 &&
    parsedNewCardsPerDay <= 100;
  const parsedGenerationPackSize = Number.parseInt(generationPackSizeDefault, 10);
  const generationPackSizeIsValid =
    Number.isInteger(parsedGenerationPackSize) &&
    parsedGenerationPackSize >= 1 &&
    parsedGenerationPackSize <= 100;
  const parsedGenerationExampleSentenceCount = Number.parseInt(generationExampleSentenceCount, 10);
  const generationExampleSentenceCountIsValid =
    parsedGenerationExampleSentenceCount === 1 ||
    parsedGenerationExampleSentenceCount === 2 ||
    parsedGenerationExampleSentenceCount === 3;
  const normalizedCustomInstructions = normalizeCustomInstructions(
    generationCustomInstructionsDefault,
  );
  const customInstructionsIsValid =
    generationCustomInstructionsDefault.trim().length <= CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH;
  const vocabularyTypesAreValid = studyVocabularyTypes.length > 0;
  const manualOverrideLevel: CefrLevel | null =
    manualOverrideSelection === "assessed" ? null : manualOverrideSelection;
  const preferencesChanged =
    manualOverrideLevel !== initialPreferences.manualOverrideLevel ||
    parsedNewCardsPerDay !== initialPreferences.newCardsPerDay ||
    frequencyPreference !== initialPreferences.frequencyPreference ||
    [...studyVocabularyTypes].sort().join("|") !==
      [...initialPreferences.studyVocabularyTypes].sort().join("|") ||
    parsedGenerationPackSize !== initialPreferences.generationPackSizeDefault ||
    generationCefrWindowMode !== initialPreferences.generationCefrWindowMode ||
    generationKnownTermHandling !== initialPreferences.generationKnownTermHandling ||
    parsedGenerationExampleSentenceCount !== initialPreferences.generationExampleSentenceCount ||
    normalizedCustomInstructions !== initialPreferences.generationCustomInstructionsDefault ||
    emailRemindersEnabled !== initialPreferences.emailRemindersEnabled ||
    streakAlertsEnabled !== initialPreferences.streakAlertsEnabled;
  const preferencesSubmitDisabled =
    isSavingPreferences ||
    !newCardsPerDayIsValid ||
    !generationPackSizeIsValid ||
    !generationExampleSentenceCountIsValid ||
    !customInstructionsIsValid ||
    !vocabularyTypesAreValid ||
    !preferencesChanged;
  const effectiveCefrLevel = manualOverrideLevel ?? initialPreferences.assessedLevel;

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
        const result = await updateProfileAction(formData);

        if (!result.ok) {
          setProfileStatus({ type: "error", message: result.error });
          toast.error(result.error);
          return;
        }

        const nextName = result.data.user.name;
        const nextImage = result.data.user.image;

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
        setProfileStatus({
          type: "error",
          message: "Failed to update profile.",
        });
        toast.error("Failed to update profile");
      }
    });
  };

  const handlePreferencesSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (preferencesSubmitDisabled) {
      return;
    }

    startSavingPreferences(async () => {
      try {
        const result = await updateSettingsPreferencesAction({
          manualOverrideLevel,
          newCardsPerDay: parsedNewCardsPerDay,
          frequencyPreference,
          studyVocabularyTypes,
          generationPackSizeDefault: parsedGenerationPackSize,
          generationCefrWindowMode,
          generationKnownTermHandling,
          generationExampleSentenceCount: parsedGenerationExampleSentenceCount as 1 | 2 | 3,
          generationCustomInstructionsDefault: normalizedCustomInstructions,
          emailRemindersEnabled,
          streakAlertsEnabled,
        });

        if (!result.ok) {
          setPreferencesStatus({ type: "error", message: result.error });
          toast.error(result.error);
          return;
        }

        const nextPreferences = result.data.preferences;
        setInitialPreferences(nextPreferences);
        setManualOverrideSelection(nextPreferences.manualOverrideLevel ?? "assessed");
        setNewCardsPerDay(String(nextPreferences.newCardsPerDay));
        setFrequencyPreference(nextPreferences.frequencyPreference);
        setStudyVocabularyTypes(nextPreferences.studyVocabularyTypes);
        setGenerationPackSizeDefault(String(nextPreferences.generationPackSizeDefault));
        setGenerationCefrWindowMode(nextPreferences.generationCefrWindowMode);
        setGenerationKnownTermHandling(nextPreferences.generationKnownTermHandling);
        setGenerationExampleSentenceCount(String(nextPreferences.generationExampleSentenceCount));
        setGenerationCustomInstructionsDefault(
          nextPreferences.generationCustomInstructionsDefault ?? "",
        );
        setEmailRemindersEnabled(nextPreferences.emailRemindersEnabled);
        setStreakAlertsEnabled(nextPreferences.streakAlertsEnabled);
        setPreferencesStatus({
          type: "success",
          message: "Preferences updated successfully.",
        });
        toast.success("Preferences updated");
        router.refresh();
      } catch (error) {
        console.error("Failed to update preferences", error);
        setPreferencesStatus({
          type: "error",
          message: "Failed to update preferences.",
        });
        toast.error("Failed to update preferences");
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

      if (!result.ok) {
        setPasswordStatus({
          type: "error",
          message: result.error,
        });
        toast.error(result.error);
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

      if (!result.ok) {
        setDeleteStatus({ type: "error", message: result.error });
        toast.error(result.error);
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

  const toggleVocabularyType = (kind: StoredVocabularyKind, checked: boolean) => {
    setStudyVocabularyTypes((current) => {
      if (checked) {
        return current.includes(kind) ? current : [...current, kind];
      }

      const next = current.filter((value) => value !== kind);
      return next.length > 0 ? next : current;
    });
    setPreferencesStatus(null);
  };

  const handleTabChange = (tab: string) => {
    const nextTab = toSettingsTab(tab);
    setActiveTab(nextTab);

    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "account") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  return (
    <AppPageShell>
      <AppPageHeader
        eyebrow={
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Settings
          </span>
        }
        heading="User settings"
        description="Manage how you show up in shared sessions and keep your LexiFlix account safeguarded."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
        <TabsList className="w-full justify-start sm:w-fit">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <form onSubmit={handleProfileSubmit} className="contents">
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
                          <AvatarFallback className="text-base font-medium">
                            {initials}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex flex-1 flex-col gap-3">
                        <p className="text-sm text-muted-foreground">
                          JPG, PNG, or WebP. Maximum 5 MB.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
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
                              avatarPreview === null &&
                              avatarFile === null &&
                              !initialProfile.avatar
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
              </form>

              <form onSubmit={handlePasswordSubmit} className="contents">
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
              </form>
            </div>

            <div className="flex flex-col gap-4">
              <Card
                id="danger"
                className={`${settingsCardClass} border-destructive/40 bg-destructive/5`}
              >
                <CardHeader className={settingsCardHeaderClass}>
                  <CardTitle>Delete account</CardTitle>
                  <CardDescription>Permanent account removal.</CardDescription>
                </CardHeader>
                <CardContent
                  className={`${settingsCardContentClass} space-y-2 text-sm text-muted-foreground`}
                >
                  <p>Deletes packs, progress, and billing records immediately.</p>
                </CardContent>
                <CardFooter className={settingsCardFooterClass}>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                          This action is permanent. All packs, analytics, and billing records
                          disappear immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeletingAccount}>
                          Never mind
                        </AlertDialogCancel>
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
        </TabsContent>

        <TabsContent value="preferences" className="mt-0">
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
                            Use assessment result
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
                      Controls how many new cards can be introduced each app day. Due reviews are
                      not capped.
                    </p>
                    {!newCardsPerDayIsValid ? (
                      <p className="text-xs text-destructive">
                        Enter a whole number between 1 and 100.
                      </p>
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
                          max={100}
                          value={generationPackSizeDefault}
                          onChange={(event) => {
                            setGenerationPackSizeDefault(event.target.value);
                            setPreferencesStatus(null);
                          }}
                        />
                        {!generationPackSizeIsValid ? (
                          <p className="text-xs text-destructive">
                            Enter a whole number between 1 and 100.
                          </p>
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
                            <SelectItem value="same_level">Same level</SelectItem>
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
                            <SelectItem value="exclude_known">Exclude known</SelectItem>
                            <SelectItem value="downrank_known">Downrank known</SelectItem>
                            <SelectItem value="include_known">Include known</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className={settingsFieldClass}>
                        <Label htmlFor="frequency-preference" className={settingsLabelClass}>
                          Frequency preference
                        </Label>
                        <Select
                          value={frequencyPreference}
                          onValueChange={(value) => {
                            setFrequencyPreference(
                              value as SettingsPreferences["frequencyPreference"],
                            );
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
                          <p className="text-xs text-destructive">
                            Select at least one vocabulary type.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className={settingsFieldClass}>
                      <Label
                        htmlFor="generation-custom-instructions"
                        className={settingsLabelClass}
                      >
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
                          Custom instructions must stay under{" "}
                          {CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH} characters.
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
                      <p className="text-sm text-muted-foreground">
                        Reminder email for waiting queues.
                      </p>
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
        </TabsContent>
      </Tabs>
    </AppPageShell>
  );
}
