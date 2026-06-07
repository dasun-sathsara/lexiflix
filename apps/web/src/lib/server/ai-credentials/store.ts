import "server-only";

import { and, eq } from "drizzle-orm";
import type {
  AiCredentialMetadata,
  AiProviderId,
  StoredAiCredential,
} from "@/lib/server/ai-credentials/types";
import { db } from "@/lib/server/db";
import { aiCredentialPolicy, userAiCredential } from "@/lib/server/db/schema";

const POLICY_ID = "global";

/** Reads every stored credential for a user; secrets stay encrypted. */
export async function listUserAiCredentials(userId: string): Promise<StoredAiCredential[]> {
  const rows = await db
    .select({
      provider: userAiCredential.provider,
      secretCiphertext: userAiCredential.secretCiphertext,
      secretHint: userAiCredential.secretHint,
      metadata: userAiCredential.metadata,
      enabled: userAiCredential.enabled,
      updatedAt: userAiCredential.updatedAt,
    })
    .from(userAiCredential)
    .where(eq(userAiCredential.userId, userId));

  return rows.map((row) => ({ ...row, metadata: row.metadata ?? {} }));
}

export async function upsertUserAiCredential(input: {
  userId: string;
  provider: AiProviderId;
  secretCiphertext: string;
  secretHint: string;
  metadata: AiCredentialMetadata;
  enabled: boolean;
}) {
  const now = new Date();

  await db
    .insert(userAiCredential)
    .values({
      userId: input.userId,
      provider: input.provider,
      secretCiphertext: input.secretCiphertext,
      secretHint: input.secretHint,
      metadata: input.metadata,
      enabled: input.enabled,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [userAiCredential.userId, userAiCredential.provider],
      set: {
        secretCiphertext: input.secretCiphertext,
        secretHint: input.secretHint,
        metadata: input.metadata,
        enabled: input.enabled,
        updatedAt: now,
      },
    });
}

export async function setUserAiCredentialEnabled(input: {
  userId: string;
  provider: AiProviderId;
  enabled: boolean;
}) {
  await db
    .update(userAiCredential)
    .set({ enabled: input.enabled, updatedAt: new Date() })
    .where(
      and(eq(userAiCredential.userId, input.userId), eq(userAiCredential.provider, input.provider)),
    );
}

export async function deleteUserAiCredential(input: { userId: string; provider: AiProviderId }) {
  await db
    .delete(userAiCredential)
    .where(
      and(eq(userAiCredential.userId, input.userId), eq(userAiCredential.provider, input.provider)),
    );
}

/** Global enforcement flag; defaults to "not enforced" until an admin changes it. */
export async function getEnforceSystemCredentials(): Promise<boolean> {
  const [row] = await db
    .select({ enforceSystemCredentials: aiCredentialPolicy.enforceSystemCredentials })
    .from(aiCredentialPolicy)
    .where(eq(aiCredentialPolicy.id, POLICY_ID))
    .limit(1);

  return row?.enforceSystemCredentials ?? false;
}

export async function setEnforceSystemCredentials(input: {
  enforceSystemCredentials: boolean;
  updatedByUserId: string;
}) {
  const now = new Date();

  await db
    .insert(aiCredentialPolicy)
    .values({
      id: POLICY_ID,
      enforceSystemCredentials: input.enforceSystemCredentials,
      updatedByUserId: input.updatedByUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiCredentialPolicy.id,
      set: {
        enforceSystemCredentials: input.enforceSystemCredentials,
        updatedByUserId: input.updatedByUserId,
        updatedAt: now,
      },
    });
}
