"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
};

const PROVIDER_FIELDS: Record<AiServiceProviderView["provider"], FieldConfig[]> = {
  gemini: [{ name: "apiKey", label: "API key", secret: true, placeholder: "AIza…" }],
  "azure-foundry": [
    { name: "endpoint", label: "Endpoint", placeholder: "https://my-resource.openai.azure.com" },
    { name: "apiKey", label: "API key", secret: true },
    { name: "model", label: "Text deployment", optional: true },
    { name: "imageModel", label: "Image deployment", optional: true },
  ],
  "aws-polly": [
    { name: "accessKeyId", label: "Access key ID", placeholder: "AKIA…" },
    { name: "secretAccessKey", label: "Secret access key", secret: true },
    { name: "region", label: "Region", optional: true, placeholder: "us-east-1" },
  ],
  "azure-mai": [
    { name: "apiKey", label: "API key", secret: true },
    { name: "region", label: "Region", optional: true, placeholder: "eastus2" },
  ],
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

function describeStatus(provider: AiServiceProviderView): string {
  if (provider.effectiveSource === "user") {
    return `Your key ${provider.secretHint ?? ""}`.trim();
  }

  if (provider.configured) {
    return provider.systemConfigured ? "Your key is off — using system key" : "Your key is off";
  }

  return provider.systemConfigured ? "System key" : "Not configured";
}

type AiServiceProviderRowProps = {
  provider: AiServiceProviderView;
  locked: boolean;
  onSettingsChange: (settings: AiServicesSettings) => void;
};

/**
 * One provider in the AI services list. Collapsed it shows only which key is in use; the
 * credential fields appear on demand. Stored secrets are write-only, so replacing a key
 * means typing the new one.
 */
export function AiServiceProviderRow({
  provider,
  locked,
  onSettingsChange,
}: AiServiceProviderRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => ({
    endpoint: provider.metadata.endpoint ?? "",
    model: provider.metadata.model ?? "",
    imageModel: provider.metadata.imageModel ?? "",
    accessKeyId: provider.metadata.accessKeyId ?? "",
    region: provider.metadata.region ?? "",
  }));
  const [isPending, startPending] = useTransition();

  function handleSave() {
    startPending(async () => {
      const result = await saveAiServiceCredentialAction(buildInput(provider.provider, values));

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onSettingsChange(result.data.aiServices);
      setValues((current) => ({ ...current, apiKey: "", secretAccessKey: "" }));
      setIsOpen(false);
      toast.success(`${provider.label} key saved`);
    });
  }

  function handleRemove() {
    startPending(async () => {
      const result = await deleteAiServiceCredentialAction({ provider: provider.provider });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onSettingsChange(result.data.aiServices);
      setIsOpen(false);
      toast.success(`${provider.label} key removed`);
    });
  }

  function handleEnabledChange(enabled: boolean) {
    startPending(async () => {
      const result = await setAiServiceCredentialEnabledAction({
        provider: provider.provider,
        enabled,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onSettingsChange(result.data.aiServices);
    });
  }

  return (
    <div className="px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{provider.label}</p>
          <p className="text-xs text-muted-foreground">{describeStatus(provider)}</p>
        </div>
        <div className="flex items-center gap-2">
          {provider.configured ? (
            <Switch
              checked={provider.enabled}
              onCheckedChange={handleEnabledChange}
              disabled={locked || isPending}
              aria-label={`Use my ${provider.label} key`}
            />
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={locked}
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
          >
            {isOpen ? "Cancel" : provider.configured ? "Replace" : "Add key"}
          </Button>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {PROVIDER_FIELDS[provider.provider].map((field) => {
              const inputId = `${provider.provider}-${field.name}`;
              return (
                <div key={field.name} className="space-y-1.5">
                  <Label htmlFor={inputId} className="text-xs font-medium">
                    {field.label}
                    {field.optional ? (
                      <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                    ) : null}
                  </Label>
                  <Input
                    id={inputId}
                    type={field.secret ? "password" : "text"}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isPending}
                    placeholder={field.placeholder}
                    value={values[field.name] ?? ""}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [field.name]: event.target.value }))
                    }
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
            {provider.configured ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={handleRemove}
                disabled={isPending}
              >
                Remove key
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
