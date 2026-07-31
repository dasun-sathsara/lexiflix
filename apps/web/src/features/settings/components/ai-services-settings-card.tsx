"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AiServiceProviderRow } from "@/features/settings/components/ai-service-provider-row";
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
    return "An administrator requires the system AI configuration, so your own keys are ignored.";
  }

  if (!settings.encryptionAvailable) {
    return "This server cannot store credentials securely, so your own keys are unavailable.";
  }

  return null;
}

/**
 * "AI services" settings section. Learners can store their own provider keys, which are used
 * for their own pack generation only; administrators can force every account onto the system
 * configuration.
 */
export function AiServicesSettingsCard({ aiServices }: AiServicesSettingsCardProps) {
  const [settings, setSettings] = useState(aiServices);
  const [isSavingPolicy, startSavingPolicy] = useTransition();

  useEffect(() => {
    setSettings(aiServices);
  }, [aiServices]);

  const lockReason = getLockReason(settings);

  function handleEnforcementChange(checked: boolean) {
    startSavingPolicy(async () => {
      const result = await setAiCredentialPolicyAction({ enforceSystemCredentials: checked });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setSettings(result.data.aiServices);
    });
  }

  return (
    <Card className={settingsCardClass}>
      <CardHeader className={settingsCardHeaderClass}>
        <CardTitle>AI services</CardTitle>
        <CardDescription>
          Optional. Add your own provider keys to run your pack generation on them; otherwise the
          system configuration is used. Keys are encrypted and never shown again after saving.
        </CardDescription>
      </CardHeader>
      <CardContent className={`${settingsCardContentClass} space-y-3`}>
        <div className="divide-y rounded-xl border">
          {settings.providers.map((provider) => (
            <AiServiceProviderRow
              key={provider.provider}
              provider={provider}
              locked={lockReason !== null}
              onSettingsChange={setSettings}
            />
          ))}
        </div>

        {lockReason ? <p className="text-xs text-muted-foreground">{lockReason}</p> : null}

        {settings.isAdmin ? (
          <div className="flex items-center justify-between gap-4 border-t pt-3">
            <Label htmlFor="enforce-system-credentials" className="text-sm font-normal">
              Require the system configuration for all users
            </Label>
            <Switch
              id="enforce-system-credentials"
              checked={settings.enforceSystemCredentials}
              onCheckedChange={handleEnforcementChange}
              disabled={isSavingPolicy}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
