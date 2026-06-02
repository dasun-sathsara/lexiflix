"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CefrLevel } from "@/features/assessment/lib/types";
import {
  changePasswordAction,
  deleteAccountAction,
  updateProfileAction,
  updateSettingsPreferencesAction,
} from "@/features/settings/actions";
import {
  getEffectiveCefrLevel,
  getInitials,
  type ManualOverrideSelection,
  normalizeCustomInstructions,
  type SettingsTab,
  type StatusState,
  toSettingsTab,
} from "@/features/settings/components/_utils";
import { DeleteAccountCard } from "@/features/settings/components/delete-account-card";
import { PasswordSettingsCard } from "@/features/settings/components/password-settings-card";
import { PreferencesSettingsCard } from "@/features/settings/components/preferences-settings-card";
import { ProfileSettingsCard } from "@/features/settings/components/profile-settings-card";
import type { SettingsPreferences } from "@/features/settings/types";

type SettingsClientProps = {
  user: {
    name: string;
    email: string;
    image: string | null;
  };
  preferences: SettingsPreferences;
};

/**
 * Top-level settings page client component. Owns all form state, validation,
 * and submission logic across the account, password, preferences, and
 * delete-account sections, delegating rendering to focused sub-components.
 */
export function SettingsClient({ user, preferences }: SettingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Profile state ----------------------------------------------------------
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

  // -- Password state ---------------------------------------------------------
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<StatusState>(null);

  // -- Delete state -----------------------------------------------------------
  const [deleteStatus, setDeleteStatus] = useState<StatusState>(null);

  // -- Preferences state ------------------------------------------------------
  const [preferencesStatus, setPreferencesStatus] = useState<StatusState>(null);
  const [initialPreferences, setInitialPreferences] = useState(preferences);
  const [manualOverrideSelection, setManualOverrideSelection] = useState<ManualOverrideSelection>(
    preferences.manualOverrideLevel ?? "assessed",
  );
  const [newCardsPerDay, setNewCardsPerDay] = useState(String(preferences.newCardsPerDay));
  const [frequencyPreference, setFrequencyPreference] = useState(preferences.frequencyPreference);
  const [studyVocabularyTypes, setStudyVocabularyTypes] = useState(
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
  const [generationAudioVoiceGenderDefault, setGenerationAudioVoiceGenderDefault] = useState(
    preferences.generationAudioVoiceGenderDefault,
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

  // -- Transition wrappers ----------------------------------------------------
  const [isSavingProfile, startSavingProfile] = useTransition();
  const [isSavingPreferences, startSavingPreferences] = useTransition();
  const [isUpdatingPassword, startUpdatingPassword] = useTransition();
  const [isDeletingAccount, startDeletingAccount] = useTransition();

  // -- Tab state --------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => toSettingsTab(tabParam));

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const initials = useMemo(() => getInitials(displayName), [displayName]);

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
  const parsedGenerationPackSize = Number.parseInt(generationPackSizeDefault, 10);
  const parsedGenerationExampleSentenceCount = Number.parseInt(generationExampleSentenceCount, 10);

  const normalizedCustomInstructions = normalizeCustomInstructions(
    generationCustomInstructionsDefault,
  );

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
    generationAudioVoiceGenderDefault !== initialPreferences.generationAudioVoiceGenderDefault ||
    parsedGenerationExampleSentenceCount !== initialPreferences.generationExampleSentenceCount ||
    normalizedCustomInstructions !== initialPreferences.generationCustomInstructionsDefault ||
    emailRemindersEnabled !== initialPreferences.emailRemindersEnabled ||
    streakAlertsEnabled !== initialPreferences.streakAlertsEnabled;

  const preferencesSubmitDisabled =
    isSavingPreferences ||
    !(
      Number.isInteger(parsedNewCardsPerDay) &&
      parsedNewCardsPerDay >= 1 &&
      parsedNewCardsPerDay <= 100
    ) ||
    !(Number.isInteger(parsedGenerationPackSize) && parsedGenerationPackSize >= 1) ||
    !(parsedGenerationExampleSentenceCount >= 1 && parsedGenerationExampleSentenceCount <= 3) ||
    generationCustomInstructionsDefault.trim().length > 1200 ||
    studyVocabularyTypes.length === 0 ||
    !preferencesChanged;

  const effectiveCefrLevel = getEffectiveCefrLevel(
    manualOverrideLevel,
    initialPreferences.assessedLevel,
  );

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

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
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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
          generationAudioVoiceGenderDefault,
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
        setGenerationAudioVoiceGenderDefault(nextPreferences.generationAudioVoiceGenderDefault);
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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <AppPageShell>
      <AppPageHeader
        eyebrow={<span className="text-xs font-semibold tracking-wide text-primary">Settings</span>}
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
                <ProfileSettingsCard
                  displayName={displayName}
                  setDisplayName={setDisplayName}
                  avatarPreview={avatarPreview}
                  setAvatarPreview={setAvatarPreview}
                  avatarFile={avatarFile}
                  setAvatarFile={setAvatarFile}
                  avatarFileName={avatarFileName}
                  setAvatarFileName={setAvatarFileName}
                  setRemoveAvatar={setRemoveAvatar}
                  initialAvatar={initialProfile.avatar}
                  initials={initials}
                  hasProfileChanges={hasProfileChanges}
                  profileStatus={profileStatus}
                  setProfileStatus={setProfileStatus}
                  profileSubmitDisabled={profileSubmitDisabled}
                  isSavingProfile={isSavingProfile}
                  fileInputRef={fileInputRef}
                />
              </form>

              <form onSubmit={handlePasswordSubmit} className="contents">
                <PasswordSettingsCard
                  currentPassword={currentPassword}
                  setCurrentPassword={setCurrentPassword}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  passwordStatus={passwordStatus}
                  setPasswordStatus={setPasswordStatus}
                  passwordSubmitDisabled={passwordSubmitDisabled}
                  isUpdatingPassword={isUpdatingPassword}
                />
              </form>
            </div>

            <div className="flex flex-col gap-4">
              <DeleteAccountCard
                deleteStatus={deleteStatus}
                isDeletingAccount={isDeletingAccount}
                handleDeleteAccount={handleDeleteAccount}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-0">
          <PreferencesSettingsCard
            initialPreferences={initialPreferences}
            manualOverrideSelection={manualOverrideSelection}
            setManualOverrideSelection={setManualOverrideSelection}
            newCardsPerDay={newCardsPerDay}
            setNewCardsPerDay={setNewCardsPerDay}
            frequencyPreference={frequencyPreference}
            setFrequencyPreference={setFrequencyPreference}
            studyVocabularyTypes={studyVocabularyTypes}
            setStudyVocabularyTypes={setStudyVocabularyTypes}
            generationPackSizeDefault={generationPackSizeDefault}
            setGenerationPackSizeDefault={setGenerationPackSizeDefault}
            generationCefrWindowMode={generationCefrWindowMode}
            setGenerationCefrWindowMode={setGenerationCefrWindowMode}
            generationKnownTermHandling={generationKnownTermHandling}
            setGenerationKnownTermHandling={setGenerationKnownTermHandling}
            generationAudioVoiceGenderDefault={generationAudioVoiceGenderDefault}
            setGenerationAudioVoiceGenderDefault={setGenerationAudioVoiceGenderDefault}
            generationExampleSentenceCount={generationExampleSentenceCount}
            setGenerationExampleSentenceCount={setGenerationExampleSentenceCount}
            generationCustomInstructionsDefault={generationCustomInstructionsDefault}
            setGenerationCustomInstructionsDefault={setGenerationCustomInstructionsDefault}
            emailRemindersEnabled={emailRemindersEnabled}
            setEmailRemindersEnabled={setEmailRemindersEnabled}
            streakAlertsEnabled={streakAlertsEnabled}
            setStreakAlertsEnabled={setStreakAlertsEnabled}
            effectiveCefrLevel={effectiveCefrLevel}
            preferencesStatus={preferencesStatus}
            setPreferencesStatus={setPreferencesStatus}
            preferencesSubmitDisabled={preferencesSubmitDisabled}
            isSavingPreferences={isSavingPreferences}
            handlePreferencesSubmit={handlePreferencesSubmit}
          />
        </TabsContent>
      </Tabs>
    </AppPageShell>
  );
}
