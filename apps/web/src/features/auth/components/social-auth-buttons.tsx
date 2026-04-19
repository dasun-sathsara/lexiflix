"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "./google-icon";

interface SocialAuthButtonsProps {
  mode: "signin" | "signup";
  onGoogleClick: () => void;
  isLoading?: boolean;
}

export function SocialAuthButtons({ mode, onGoogleClick, isLoading }: SocialAuthButtonsProps) {
  const buttonText = mode === "signin" ? "Continue with Google" : "Sign up with Google";

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
        onClick={onGoogleClick}
        disabled={isLoading}
        className="w-full group h-11 rounded-lg border-2 bg-background/95 font-semibold text-foreground disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="size-5 mr-2 animate-spin" />
        ) : (
          <GoogleIcon className="size-5 mr-2" />
        )}
        <span>{isLoading ? "Signing in..." : buttonText}</span>
      </Button>
    </div>
  );
}
