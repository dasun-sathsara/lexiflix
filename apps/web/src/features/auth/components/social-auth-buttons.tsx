"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { GoogleIcon } from "./google-icon";

interface SocialAuthButtonsProps {
  mode: "signin" | "signup";
  onGoogleClick?: () => void;
  isLoading?: boolean;
}

export function SocialAuthButtons({ mode, onGoogleClick, isLoading }: SocialAuthButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const buttonText = mode === "signin" ? "Continue with Google" : "Sign up with Google";
  const activeLoading = isLoading ?? isPending;

  const handleGoogleClick = () => {
    if (onGoogleClick) {
      onGoogleClick();
      return;
    }

    startTransition(async () => {
      try {
        const result = await authClient.signIn.social({
          provider: "google",
          callbackURL: "/dashboard",
        });
        if (result.error) {
          toast.error(result.error.message || "Google sign in failed.");
        }
      } catch (err: unknown) {
        console.error("Google social auth error:", err);
        toast.error("An unexpected error occurred during Google sign in.");
      }
    });
  };

  return (
    <div className="w-full space-y-3">
      <div className="relative w-full">
        <div aria-hidden="true" className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 font-medium text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleClick}
        disabled={activeLoading}
        className="w-full group h-11 rounded-lg border-2 bg-background/95 font-semibold text-foreground disabled:opacity-50"
      >
        {activeLoading ? (
          <Loader2 className="size-5 mr-2 animate-spin" />
        ) : (
          <GoogleIcon className="size-5 mr-2" />
        )}
        <span>{activeLoading ? "Signing in..." : buttonText}</span>
      </Button>
    </div>
  );
}
