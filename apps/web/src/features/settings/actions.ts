"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

type ActionResponse =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResponse> {
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: input.currentPassword,
        newPassword: input.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });

    return { success: true };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message ?? "Unable to update password.",
      };
    }

    console.error("Unexpected error updating password", { error });
    return {
      success: false,
      message: "Unexpected error updating password.",
    };
  }
}

export async function deleteAccountAction(): Promise<ActionResponse> {
  try {
    await auth.api.deleteUser({
      headers: await headers(),
    });

    return { success: true };
  } catch (error) {
    if (error instanceof APIError) {
      return {
        success: false,
        message: error.message ?? "Unable to delete account.",
      };
    }

    console.error("Unexpected error deleting account", { error });
    return {
      success: false,
      message: "Unexpected error deleting account.",
    };
  }
}
