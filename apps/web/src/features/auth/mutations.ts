import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

interface SocialAuthOptions {
  callbackURL?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useGoogleSignIn(options?: SocialAuthOptions) {
  const { callbackURL = "/dashboard", onSuccess, onError } = options || {};

  return useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
      return result;
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error("Google sign-in error:", error);
      onError?.(error);
    },
  });
}

export function useGoogleSignUp(options?: SocialAuthOptions) {
  const { callbackURL = "/dashboard", onSuccess, onError } = options || {};

  return useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
      return result;
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error("Google sign-up error:", error);
      onError?.(error);
    },
  });
}
