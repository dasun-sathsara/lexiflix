"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { SignInSchema, SignUpSchema } from "@/features/auth/types";
import type { ActionResult } from "@/lib/action-result";
import { auth } from "@/lib/auth";

export async function signupAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parseResult = SignUpSchema.safeParse(raw);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors,
    };
  }

  const { firstName, lastName, email, password } = parseResult.data;

  try {
    const response = await auth.api.signUpEmail({
      body: {
        name: `${firstName} ${lastName}`.trim(),
        email,
        password,
      },
      asResponse: true,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        ok: false,
        error: errorData?.message || "Failed to create account",
      };
    }

    return { ok: true, data: undefined };
  } catch (err: unknown) {
    if (err instanceof APIError) {
      return {
        ok: false,
        error: err.message || "Failed to create account",
      };
    }
    return {
      ok: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    await auth.api.signOut({
      headers: await headers(),
      asResponse: true,
    });

    return { ok: true, data: undefined };
  } catch (err: unknown) {
    if (err instanceof APIError) {
      return {
        ok: false,
        error: err.message || "Failed to sign out",
      };
    }
    return {
      ok: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function signInAction(formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parseResult = SignInSchema.safeParse(raw);
  if (!parseResult.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parseResult.error.issues) {
      const path = issue.path.join(".");
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    }
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors,
    };
  }

  const { email, password } = parseResult.data;
  const rememberMe = formData.get("rememberMe") === "true";

  try {
    const response = await auth.api.signInEmail({
      body: {
        email,
        password,
        rememberMe,
      },
      asResponse: true,
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        ok: false,
        error: errorData?.message || "Invalid email or password",
      };
    }

    return { ok: true, data: undefined };
  } catch (err: unknown) {
    if (err instanceof APIError) {
      return {
        ok: false,
        error: err.message || "Invalid email or password",
      };
    }
    return {
      ok: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}
