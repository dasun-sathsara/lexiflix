"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteAccountCard } from "@/features/settings/components/delete-account-card";
import { PasswordSettingsCard } from "@/features/settings/components/password-settings-card";
import { PreferencesSettingsCard } from "@/features/settings/components/preferences-settings-card";
import { ProfileSettingsCard } from "@/features/settings/components/profile-settings-card";
import { getInitials, toSettingsTab } from "@/features/settings/components/utils";
import {
  changePasswordAction,
  deleteAccountAction,
  updateProfileAction,
} from "@/features/settings/server/actions";
import type { SettingsPreferences, SettingsTab, StatusState } from "@/features/settings/types";

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

  // -- Transition wrappers ----------------------------------------------------
  const [isSavingProfile, startSavingProfile] = useTransition();
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
          <PreferencesSettingsCard preferences={preferences} />
        </TabsContent>
      </Tabs>
    </AppPageShell>
  );
}
