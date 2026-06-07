import type { AiCredentialSource } from "@/lib/server/ai-credentials/types";

/**
 * Decides whether a provider call runs on system `.env` credentials or on the credentials a
 * learner saved themselves.
 *
 * Precedence:
 * 1. Admin enforcement always wins, so an operator can pin every user to the system config.
 * 2. Otherwise an enabled, complete user credential is used.
 * 3. Otherwise the system credentials apply — which is why administrators (who normally keep
 *    no personal keys) run on the system `.env` configuration by default.
 */
export function chooseCredentialSource(input: {
  enforceSystemCredentials: boolean;
  hasUsableUserCredential: boolean;
}): AiCredentialSource {
  if (input.enforceSystemCredentials) {
    return "system";
  }

  return input.hasUsableUserCredential ? "user" : "system";
}
