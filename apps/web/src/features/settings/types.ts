import { z } from "zod";

import {
  CEFR_LEVELS,
  type CefrLevel,
  CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
  FREQUENCY_PREFERENCES,
  GENERATION_AUDIO_VOICE_GENDERS,
  GENERATION_CEFR_WINDOW_MODES,
  GENERATION_KNOWN_TERM_HANDLINGS,
  STUDY_VOCABULARY_TYPES,
} from "@/lib/constants";
import type { ActionResult } from "@/lib/contracts/action-result";
import type {
  AiCredentialMetadata,
  AiCredentialSource,
  AiProviderId,
} from "@/lib/server/ai-credentials/types";
import type {
  GenerationAudioVoiceGender,
  GenerationCefrWindowMode,
  GenerationKnownTermHandling,
  StoredFrequencyPreference,
  StoredVocabularyKind,
} from "@/lib/server/db/json-contracts";

export {
  FREQUENCY_PREFERENCES,
  GENERATION_CEFR_WINDOW_MODES,
  GENERATION_KNOWN_TERM_HANDLINGS,
  GENERATION_AUDIO_VOICE_GENDERS,
  STUDY_VOCABULARY_TYPES,
};

export const passwordSettingsSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type PasswordSettingsInput = z.infer<typeof passwordSettingsSchema>;

export const profileSettingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Use at least 2 characters for your display name.")
    .max(80, "Display name must be 80 characters or fewer."),
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;

export const preferencesSettingsSchema = z.object({
  manualOverrideSelection: z.union([z.literal("assessed"), z.enum(CEFR_LEVELS)]),
  newCardsPerDay: z
    .number()
    .int("Enter a whole number between 1 and 100.")
    .min(1, "Enter a whole number between 1 and 100.")
    .max(100, "Enter a whole number between 1 and 100."),
  frequencyPreference: z.enum(FREQUENCY_PREFERENCES),
  studyVocabularyTypes: z
    .array(z.enum(STUDY_VOCABULARY_TYPES))
    .min(1, "Select at least one vocabulary type."),
  generationPackSizeDefault: z
    .number()
    .int("Enter a whole number of 1 or more.")
    .min(1, "Enter a whole number of 1 or more."),
  generationCefrWindowMode: z.enum(GENERATION_CEFR_WINDOW_MODES),
  generationKnownTermHandling: z.enum(GENERATION_KNOWN_TERM_HANDLINGS),
  generationAudioVoiceGenderDefault: z.enum(GENERATION_AUDIO_VOICE_GENDERS),
  generationExampleSentenceCount: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  generationCustomInstructionsDefault: z
    .string()
    .max(
      CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH,
      `Custom instructions must stay under ${CUSTOM_GENERATION_INSTRUCTIONS_MAX_LENGTH} characters.`,
    ),
  emailRemindersEnabled: z.boolean(),
  streakAlertsEnabled: z.boolean(),
});

export type PreferencesSettingsInput = z.infer<typeof preferencesSettingsSchema>;

export type SettingsPreferences = {
  assessedLevel: CefrLevel | null;
  manualOverrideLevel: CefrLevel | null;
  targetLanguage: string;
  newCardsPerDay: number;
  frequencyPreference: StoredFrequencyPreference;
  studyVocabularyTypes: StoredVocabularyKind[];
  generationPackSizeDefault: number;
  generationCefrWindowMode: GenerationCefrWindowMode;
  generationKnownTermHandling: GenerationKnownTermHandling;
  generationAudioVoiceGenderDefault: GenerationAudioVoiceGender;
  generationExampleSentenceCount: 1 | 2 | 3;
  generationCustomInstructionsDefault: string | null;
  emailRemindersEnabled: boolean;
  streakAlertsEnabled: boolean;
};

export type UpdateSettingsPreferencesActionResult = ActionResult<{
  preferences: SettingsPreferences;
}>;

export type UpdateProfileActionResult = ActionResult<{
  user: {
    name: string;
    image: string | null;
  };
}>;

export type StatusState = {
  type: "success" | "error";
  message: string;
} | null;

export type ManualOverrideSelection = CefrLevel | "assessed";

export type SettingsTab = "account" | "preferences" | "ai-services";

// ---------------------------------------------------------------------------
// AI services (bring-your-own credentials)
// ---------------------------------------------------------------------------

export const aiServiceCredentialSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("gemini"),
    apiKey: z.string().trim().min(10, "Enter the full Gemini API key."),
  }),
  z.object({
    provider: z.literal("azure-foundry"),
    endpoint: z.url("Enter the Azure AI Foundry resource endpoint URL."),
    apiKey: z.string().trim().min(10, "Enter the full Azure AI Foundry API key."),
    model: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => value || undefined),
    imageModel: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => value || undefined),
  }),
  z.object({
    provider: z.literal("aws-polly"),
    accessKeyId: z.string().trim().min(10, "Enter the AWS access key ID."),
    secretAccessKey: z.string().trim().min(10, "Enter the AWS secret access key."),
    region: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => value || undefined),
  }),
  z.object({
    provider: z.literal("azure-mai"),
    apiKey: z.string().trim().min(10, "Enter the Azure Speech API key."),
    region: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => value || undefined),
  }),
]);

export type AiServiceCredentialInput = z.input<typeof aiServiceCredentialSchema>;

/** Client-safe view of one provider's configuration. Never contains secret values. */
export type AiServiceProviderView = {
  provider: AiProviderId;
  label: string;
  /** True when the user has saved their own credential for this provider. */
  configured: boolean;
  /** Masked tail of the stored secret, e.g. `••••1234`. */
  secretHint: string | null;
  enabled: boolean;
  /** Non-secret configuration such as endpoint, region and deployment names. */
  metadata: AiCredentialMetadata;
  /** True when the operator has configured this provider in the system environment. */
  systemConfigured: boolean;
  /** Which credentials this provider would use for the current user right now. */
  effectiveSource: AiCredentialSource;
  updatedAt: string | null;
};

export type AiServicesSettings = {
  /** Admin-enforced global use of the system `.env` credentials. */
  enforceSystemCredentials: boolean;
  isAdmin: boolean;
  /** False when the runtime cannot encrypt secrets, which disables custom credentials. */
  encryptionAvailable: boolean;
  providers: AiServiceProviderView[];
};

export type AiServicesSettingsActionResult = ActionResult<{
  aiServices: AiServicesSettings;
}>;
