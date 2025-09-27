"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useSendVerificationEmail, useSignIn } from "@/hooks/use-auth-client";
import { cn } from "@/lib/utils";

import { parseAuthError, requiresEmailVerification } from "./auth-error-utils";
import { GoogleIcon } from "./google-icon";

type LoginFormVariant = "standalone" | "tab";

interface LoginFormProps {
  className?: string;
  variant?: LoginFormVariant;
  onNavigateToSignup?: () => void;
}

type EmailCredentials = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export function LoginForm({
  className,
  variant = "standalone",
  onNavigateToSignup,
}: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const signIn = useSignIn();
  const { sendVerificationEmail } = useSendVerificationEmail();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const emailSignIn = useMutation({
    mutationFn: async (credentials: EmailCredentials) => {
      const result = await signIn.email({
        ...credentials,
        fetchOptions: { throw: false },
      });

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (error) => {
      const { message } = parseAuthError(error);

      toast({
        title: "Unable to sign in",
        description: message,
        variant: "destructive",
      });
    },
  });

  const googleSignIn = useMutation({
    mutationFn: async () => {
      const result = await signIn.social({ provider: "google", fetchOptions: { throw: false } });

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
    onSuccess: () => {
      router.push("/dashboard");
    },
    onError: (error) => {
      const { message } = parseAuthError(error);

      toast({
        title: "Google sign in failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const aggregatedAuthError = useMemo(
    () => parseAuthError(emailSignIn.error ?? googleSignIn.error),
    [emailSignIn.error, googleSignIn.error],
  );
  const shouldVerifyEmail = requiresEmailVerification(emailSignIn.error);
  const isProcessing = emailSignIn.isPending || googleSignIn.isPending;
  const passwordResetSuccess = searchParams.get("passwordReset") === "1";
  const emailVerifiedSuccess = searchParams.get("verified") === "1";
  const resendVerification = useMutation({
    mutationFn: async () => {
      const nextEmail = email.trim();

      if (!nextEmail) {
        throw new Error("Enter your email to receive a verification link.");
      }

      await sendVerificationEmail({
        email: nextEmail,
        callbackURL: `${window.location.origin}/login`,
      });
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent",
        description: "Check your inbox for a fresh verification link.",
      });
    },
    onError: (error) => {
      const { message } = parseAuthError(error);

      toast({
        title: "Unable to resend verification",
        description: message,
        variant: "destructive",
      });
    },
  });
  const isResendingVerification = resendVerification.isPending;

  const cardClasses = useMemo(
    () =>
      cn(
        "mx-auto flex w-full flex-col",
        variant === "standalone"
          ? "max-w-md border-border/70 bg-white/80 backdrop-blur-md dark:border-border/40 dark:bg-slate-950/70"
          : "max-w-none border-none bg-transparent p-0 shadow-none backdrop-blur-0",
        variant === "tab" ? "rounded-none" : "",
        className,
      ),
    [className, variant],
  );

  const footerButtonWidth = "w-full";
  const footerGap = variant === "tab" ? "gap-3" : "gap-4";
  const contentSpacing = variant === "tab" ? "space-y-5" : "space-y-4";
  const headerSpacing = variant === "tab" ? "space-y-3" : "space-y-2";
  const headerPadding = variant === "tab" ? "p-0" : "px-6 pt-6";
  const contentPadding = variant === "tab" ? "p-0" : "px-6";
  const footerPadding = variant === "tab" ? "p-0 pt-4" : "px-6 pb-6 pt-2";
  const formClasses = cn("space-y-5", variant === "tab" ? "mt-6" : "");

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      emailSignIn.reset();

      try {
        await emailSignIn.mutateAsync({ email, password, rememberMe });
      } catch {
        // handled via onError
      }
    },
    [email, password, rememberMe, emailSignIn],
  );

  const handleGoogleSignIn = useCallback(async () => {
    googleSignIn.reset();

    try {
      await googleSignIn.mutateAsync();
    } catch {
      // handled via onError
    }
  }, [googleSignIn]);

  return (
    <Card className={cardClasses}>
      <CardHeader className={cn(headerSpacing, headerPadding)}>
        <CardTitle className={variant === "tab" ? "text-3xl" : "text-2xl"}>Welcome back</CardTitle>
        <CardDescription>
          Sign in to pick up where you left off with your LexiFlix study packs.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className={formClasses}>
        <CardContent className={cn(contentSpacing, contentPadding)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isProcessing}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isProcessing}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="remember-me" className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                disabled={isProcessing}
              />
              <span className="select-none">Remember me</span>
            </Label>
            <span className="text-xs text-muted-foreground">
              Need an account?{" "}
              {onNavigateToSignup ? (
                <button
                  type="button"
                  onClick={onNavigateToSignup}
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </button>
              ) : (
                <Link href="/signup" className="font-medium text-primary hover:underline">
                  Sign up
                </Link>
              )}
            </span>
          </div>
          {passwordResetSuccess ? (
            <p className="rounded-md border border-emerald-400/40 bg-emerald-400/5 px-3 py-2 text-sm text-emerald-400">
              Password updated. Sign in with your new credentials.
            </p>
          ) : null}
          {emailVerifiedSuccess ? (
            <p className="rounded-md border border-indigo-400/40 bg-indigo-400/5 px-3 py-2 text-sm text-indigo-400">
              Email verified successfully. You can sign in now.
            </p>
          ) : null}
          {shouldVerifyEmail ? (
            <div className="flex flex-col gap-3 rounded-md border border-yellow-400/40 bg-yellow-400/5 px-3 py-2 text-sm text-yellow-400">
              <p>
                Please verify your email before signing in. Check your inbox for a verification
                link.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => resendVerification.mutate()}
                disabled={isResendingVerification || !email}
                className="w-fit border-yellow-400/40 bg-transparent text-xs font-medium text-yellow-400 hover:bg-yellow-400/10 hover:text-yellow-300"
              >
                {isResendingVerification ? "Sending..." : "Resend verification email"}
              </Button>
            </div>
          ) : null}
          {aggregatedAuthError.message ? (
            <p
              className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              aria-live="polite"
            >
              {aggregatedAuthError.message}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className={cn("flex-col", footerGap, footerPadding)}>
          <Button type="submit" className={footerButtonWidth} disabled={isProcessing}>
            {emailSignIn.isPending ? "Signing in..." : "Sign in"}
          </Button>
          <div className="relative my-3">
            <div aria-hidden="true" className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "group gap-3 border-border/60 bg-background/95 text-foreground shadow-sm transition hover:bg-background focus-visible:ring-offset-2 dark:bg-slate-950/70 dark:hover:bg-slate-950/60",
              footerButtonWidth,
            )}
            onClick={handleGoogleSignIn}
            disabled={isProcessing}
          >
            <GoogleIcon className="size-5 transition group-hover:scale-105" />
            <span className="font-medium">
              {googleSignIn.isPending ? "Connecting with Google..." : "Continue with Google"}
            </span>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
