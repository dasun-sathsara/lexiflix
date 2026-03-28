"use server";

import { SignInSchema, SignUpSchema } from "@/features/auth/schemas";
import { auth } from "@/lib/auth";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";

type ActionSuccess = { success: true };
type ActionError = {
  success: false;
  message?: string;
  errors?: Record<string, string[] | undefined>;
};
type ActionResponse = ActionSuccess | ActionError;

export async function signupAction(formData: FormData): Promise<ActionResponse> {
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
      success: false,
      errors: fieldErrors,
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
        success: false,
        message: errorData?.message || "Failed to create account",
      };
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof APIError) {
      return {
        success: false,
        message: err.message || "Failed to create account",
      };
    }
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function logoutAction(): Promise<ActionResponse> {
  try {
    await auth.api.signOut({
      headers: await headers(),
      asResponse: true,
    });

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof APIError) {
      return {
        success: false,
        message: err.message || "Failed to sign out",
      };
    }
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}

export async function signInAction(formData: FormData): Promise<ActionResponse> {
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
      success: false,
      errors: fieldErrors,
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
        success: false,
        message: errorData?.message || "Invalid email or password",
      };
    }

    return { success: true };
  } catch (err: unknown) {
    if (err instanceof APIError) {
      return {
        success: false,
        message: err.message || "Invalid email or password",
      };
    }
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
}
