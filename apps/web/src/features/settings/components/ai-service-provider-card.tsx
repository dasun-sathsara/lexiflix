"use client";

import { CheckCircle2, KeyRound, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  settingsCardClass,
  settingsCardContentClass,
  settingsCardFooterClass,
  settingsCardHeaderClass,
  settingsFieldClass,
  settingsLabelClass,
} from "@/features/settings/lib/utils";
import {
  deleteAiServiceCredentialAction,
  saveAiServiceCredentialAction,
  setAiServiceCredentialEnabledAction,
} from "@/features/settings/server/actions";
import type {
  AiServiceCredentialInput,
  AiServiceProviderView,
  AiServicesSettings,
} from "@/features/settings/types";

type FieldName =
  | "apiKey"
  | "endpoint"
  | "model"
  | "imageModel"
  | "accessKeyId"
  | "secretAccessKey"
  | "region";

type FieldConfig = {
  name: FieldName;
  label: string;
  placeholder?: string;
  secret?: boolean;
  optional?: boolean;
  description?: string;
};

const PROVIDER_FIELDS: Record<AiServiceProviderView["provider"], FieldConfig[]> = {
  gemini: [
    {
      name: "apiKey",
      label: "Gemini API key",
      secret: true,
      placeholder: "AIza…",
      description: "Google AI Studio key used for pack text generation.",
    },
  ],
  "azure-foundry": [
    {
      name: "endpoint",
      label: "Resource endpoint",
      placeholder: "https://my-resource.openai.azure.com",
    },
    { name: "apiKey", label: "API key", secret: true },
    { name: "model", label: "Text deployment", optional: true, placeholder: "Optional" },
    { name: "imageModel", label: "Image deployment", optional: true, placeholder: "Optional" },
  ],
  "aws-polly": [
    { name: "accessKeyId", label: "Access key ID", placeholder: "AKIA…" },
    { name: "secretAccessKey", label: "Secret access key", secret: true },
    { name: "region", label: "Region", optional: true, placeholder: "us-east-1" },
  ],
  "azure-mai": [
    { name: "apiKey", label: "Speech API key", secret: true },
    { name: "region", label: "Region", optional: true, placeholder: "eastus2" },
  ],
};

const PROVIDER_DESCRIPTIONS: Record<AiServiceProviderView["provider"], string> = {
  gemini: "Text generation for your generated packs.",
  "azure-foundry": "Text and image generation through your own Azure AI Foundry deployment.",
  "aws-polly": "Pronunciation audio synthesis with your own AWS account.",
  "azure-mai": "Pronunciation audio synthesis with your own Azure Speech resource.",
};

function buildInput(
  provider: AiServiceProviderView["provider"],
  values: Record<string, string>,
): AiServiceCredentialInput {
  switch (provider) {
    case "gemini":
      return { provider, apiKey: values.apiKey ?? "" };
    case "azure-foundry":
      return {
        provider,
        endpoint: values.endpoint ?? "",
        apiKey: values.apiKey ?? "",
        model: values.model ?? "",
        imageModel: values.imageModel ?? "",
      };
    case "aws-polly":
      return {
        provider,
        accessKeyId: values.accessKeyId ?? "",
        secretAccessKey: values.secretAccessKey ?? "",
        region: values.region ?? "",
      };
    case "azure-mai":
      return { provider, apiKey: values.apiKey ?? "", region: values.region ?? "" };
  }
}

type AiServiceProviderCardProps = {
  provider: AiServiceProviderView;
  locked: boolean;
  lockReason: string | null;
  onSettingsChange: (settings: AiServicesSettings) => void;
};

/**
 * One provider's bring-your-own-credentials form. Stored secrets are write-only: the UI shows
 * a masked hint and requires re-entering the key to change it.
 */
export function AiServiceProviderCard({
  provider,
  locked,
  lockReason,
  onSettingsChange,
}: AiServiceProviderCardProps) {
  const fields = PROVIDER_FIELDS[provider.provider];
  const [values, setValues] = useState<Record<string, string>>(() => ({
    endpoint: provider.metadata.endpoint ?? "",
    model: provider.metadata.model ?? "",
    imageModel: provider.metadata.imageModel ?? "",
    accessKeyId: provider.metadata.accessKeyId ?? "",
    region: provider.metadata.region ?? "",
  }));
  const [isSaving, startSaving] = useTransition();
  const [isRemoving, startRemoving] = useTransition();
  const [isTogglingEnabled, startTogglingEnabled] = useTransition();

  const usingUserCredentials = provider.effectiveSource === "user";

  function handleEnabledChange(enabled: boolean) {
    startTogglingEnabled(async () => {
      const result = await setAiServiceCredentialEnabledAction({
        provider: provider.provider,
        enabled,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onSettingsChange(result.data.aiServices);
      toast.success(
        enabled
          ? `Using your ${provider.label} key`
          : `${provider.label} falls back to the system key`,
      );
    });
  }

  function handleSave() {
    startSaving(async () => {
      const result = await saveAiServiceCredentialAction(buildInput(provider.provider, values));

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onSettingsChange(result.data.aiServices);
      setValues((current) => ({ ...current, apiKey: "", secretAccessKey: "" }));
      toast.success(`${provider.label} credentials saved`);
    });
  }

  function handleRemove() {
    startRemoving(async () => {
      const result = await deleteAiServiceCredentialAction({ provider: provider.provider });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onSettingsChange(result.data.aiServices);
      toast.success(`${provider.label} credentials removed`);
    });
  }

  return (
    <Card className={settingsCardClass}>
      <CardHeader className={settingsCardHeaderClass}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            {provider.label}
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {usingUserCredentials ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="size-3" />
                Using your key
              </Badge>
            ) : (
              <Badge variant="outline">
                {provider.systemConfigured ? "Using system key" : "Not configured"}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>{PROVIDER_DESCRIPTIONS[provider.provider]}</CardDescription>
      </CardHeader>

      <CardContent className={`${settingsCardContentClass} space-y-3`}>
        {provider.configured ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2">
            <p className="text-sm text-muted-foreground">
              Saved key {provider.secretHint}. Enter a new key to replace it.
            </p>
            <div className="flex items-center gap-2">
              {isTogglingEnabled ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : null}
              <Switch
                checked={provider.enabled}
                onCheckedChange={handleEnabledChange}
                disabled={locked || isTogglingEnabled}
                aria-label={`Use my ${provider.label} key`}
              />
            </div>
          </div>
        ) : null}

        {fields.map((field) => {
          const inputId = `${provider.provider}-${field.name}`;
          return (
            <div key={field.name} className={settingsFieldClass}>
              <Label htmlFor={inputId} className={settingsLabelClass}>
                {field.label}
                {field.optional ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
                ) : null}
              </Label>
              <Input
                id={inputId}
                type={field.secret ? "password" : "text"}
                autoComplete="off"
                spellCheck={false}
                disabled={locked || isSaving}
                placeholder={field.placeholder}
                value={values[field.name] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
              />
              {field.description ? (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              ) : null}
            </div>
          );
        })}

        {locked && lockReason ? (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            {lockReason}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className={settingsCardFooterClass}>
        <div className="text-xs text-muted-foreground">
          {provider.updatedAt
            ? `Updated ${new Date(provider.updatedAt).toLocaleDateString()}`
            : "No custom credentials saved"}
        </div>
        <div className="flex items-center gap-2">
          {provider.configured ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5" disabled={isRemoving}>
                  {isRemoving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {provider.label} credentials?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Future generations will fall back to the system configuration.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemove}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          <Button type="button" onClick={handleSave} disabled={locked || isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            {provider.configured ? "Replace key" : "Save key"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
