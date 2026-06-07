"use client";

import { Info, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { AppPanel } from "@/components/common/app-surface";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AiServiceProviderCard } from "@/features/settings/components/ai-service-provider-card";
import {
  settingsCardClass,
  settingsCardContentClass,
  settingsCardHeaderClass,
} from "@/features/settings/lib/utils";
import { setAiCredentialPolicyAction } from "@/features/settings/server/actions";
import type { AiServicesSettings } from "@/features/settings/types";

type AiServicesSettingsCardProps = {
  aiServices: AiServicesSettings;
};

function getLockReason(settings: AiServicesSettings): string | null {
  if (settings.enforceSystemCredentials) {
    return "An administrator requires all AI generation to use the system configuration, so custom credentials are disabled.";
  }

  if (!settings.encryptionAvailable) {
    return "This server is not configured to store credentials securely, so custom credentials are disabled.";
  }

  return null;
}

/**
 * "AI Services" settings section. Learners can store their own provider credentials; those
 * credentials are used for their own pack generation only. Administrators can force every
 * account onto the system `.env` configuration.
 */
export function AiServicesSettingsCard({ aiServices }: AiServicesSettingsCardProps) {
  const [settings, setSettings] = useState(aiServices);
  const [isSavingPolicy, startSavingPolicy] = useTransition();

  useEffect(() => {
    setSettings(aiServices);
  }, [aiServices]);

  const lockReason = getLockReason(settings);
  const locked = lockReason !== null;

  function handleEnforcementChange(checked: boolean) {
    startSavingPolicy(async () => {
      const result = await setAiCredentialPolicyAction({ enforceSystemCredentials: checked });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setSettings(result.data.aiServices);
      toast.success(
        checked
          ? "All users now use the system AI configuration"
          : "Users may now use their own AI credentials",
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className={settingsCardClass}>
        <CardHeader className={settingsCardHeaderClass}>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" />
            AI services
          </CardTitle>
          <CardDescription>
            Use your own provider credentials for pack generation, or fall back to the system
            configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className={`${settingsCardContentClass} space-y-3`}>
          <AppPanel className="flex items-start gap-2 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              Credentials you save here are encrypted and used only for your own pack generation.
              Shared subtitle analysis always runs on the system configuration, because its results
              are reused across accounts.
              {settings.isAdmin
                ? " As an administrator you use the system configuration by default until you save your own key."
                : ""}
            </span>
          </AppPanel>

          {settings.isAdmin ? (
            <AppPanel className="flex items-start justify-between gap-4 p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Require the system AI configuration</p>
                <p className="text-sm text-muted-foreground">
                  Applies to every account. Custom credentials stay saved but are ignored while this
                  is on.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSavingPolicy ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : null}
                <Switch
                  checked={settings.enforceSystemCredentials}
                  onCheckedChange={handleEnforcementChange}
                  disabled={isSavingPolicy}
                  aria-label="Require the system AI configuration for all users"
                />
              </div>
            </AppPanel>
          ) : null}

          {lockReason ? <p className="text-sm text-muted-foreground">{lockReason}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {settings.providers.map((provider) => (
          <AiServiceProviderCard
            key={provider.provider}
            provider={provider}
            locked={locked}
            lockReason={lockReason}
            onSettingsChange={setSettings}
          />
        ))}
      </div>
    </div>
  );
}
