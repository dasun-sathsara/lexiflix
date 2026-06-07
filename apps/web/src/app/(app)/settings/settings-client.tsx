"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { AppPageHeader } from "@/components/common/app-page-header";
import { AppPageShell } from "@/components/common/app-page-shell";
import { useReportNavigationPending } from "@/components/common/navigation-progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiServicesSettingsCard } from "@/features/settings/components/ai-services-settings-card";
import { DeleteAccountCard } from "@/features/settings/components/delete-account-card";
import { PasswordSettingsCard } from "@/features/settings/components/password-settings-card";
import { PreferencesSettingsCard } from "@/features/settings/components/preferences-settings-card";
import { ProfileSettingsCard } from "@/features/settings/components/profile-settings-card";
import { toSettingsTab } from "@/features/settings/lib/utils";
import { deleteAccountAction } from "@/features/settings/server/actions";
import type {
  AiServicesSettings,
  SettingsPreferences,
  SettingsTab,
  StatusState,
} from "@/features/settings/types";

type SettingsClientProps = {
  user: {
    name: string;
    email: string;
    image: string | null;
  };
  preferences: SettingsPreferences;
  aiServices: AiServicesSettings;
};

/**
 * Top-level settings page client component. Delegating form state to focused sub-components.
 */
export function SettingsClient({ user, preferences, aiServices }: SettingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // -- Delete state -----------------------------------------------------------
  const [deleteStatus, setDeleteStatus] = useState<StatusState>(null);
  const [isDeletingAccount, startDeletingAccount] = useTransition();

  // -- Tab state --------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => toSettingsTab(tabParam));
  const [isSwitchingTab, startSwitchingTab] = useTransition();

  useReportNavigationPending(isSwitchingTab);

  useEffect(() => {
    setActiveTab(toSettingsTab(tabParam));
  }, [tabParam]);

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
    startSwitchingTab(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    });
  };

  return (
    <AppPageShell>
      <AppPageHeader
        eyebrow={<span className="text-xs font-semibold tracking-wide text-primary">Settings</span>}
        heading="User settings"
        description="Manage how you show up in shared sessions and keep your LexiFlix account safeguarded."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
        <TabsList className="w-full justify-start sm:w-fit">
          <TabsTrigger value="account" className="gap-1.5">
            Account
            {isSwitchingTab && activeTab === "account" ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5">
            Preferences
            {isSwitchingTab && activeTab === "preferences" ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="ai-services" className="gap-1.5">
            AI services
            {isSwitchingTab && activeTab === "ai-services" ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <ProfileSettingsCard user={user} />
              <PasswordSettingsCard />
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

        <TabsContent value="ai-services" className="mt-0">
          <AiServicesSettingsCard aiServices={aiServices} />
        </TabsContent>
      </Tabs>
    </AppPageShell>
  );
}
