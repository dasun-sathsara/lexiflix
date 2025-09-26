"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useSignUp, useSignIn } from "@/hooks/use-auth-client";
import { cn } from "@/lib/utils";

import { GoogleIcon } from "./google-icon";
import { parseAuthError } from "./auth-error-utils";

type SignupFormVariant = "standalone" | "tab";

interface SignupFormProps {
  className?: string;
  variant?: SignupFormVariant;
  onNavigateToLogin?: () => void;
}

type SignupPayload = {
  email: string;
  password: string;
  name: string;
};

export function SignupForm({
  className,
  variant = "standalone",
  onNavigateToLogin,
}: SignupFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const signUp = useSignUp();
  const signIn = useSignIn();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const signUpMutation = useMutation({
    mutationFn: async (payload: SignupPayload) => {
      const result = await signUp.email({
        ...payload,
        fetchOptions: { throw: false },
      });

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
    onSuccess: () => {
      setClientError(null);
      router.push("/dashboard");
    },
    onError: (error) => {
      const { message } = parseAuthError(error);

      toast({
        title: "Unable to create account",
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
      setClientError(null);
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

  const remoteError = useMemo(
    () => parseAuthError(signUpMutation.error ?? googleSignIn.error),
    [googleSignIn.error, signUpMutation.error],
  );
  const inlineError = clientError ?? remoteError.message;
  const isProcessing = signUpMutation.isPending || googleSignIn.isPending;

  const cardClasses = cn(
    "mx-auto flex w-full flex-col",
    variant === "standalone"
      ? "max-w-2xl border-border/70 bg-white/85 backdrop-blur-md dark:border-border/40 dark:bg-slate-950/70"
      : "max-w-none border-none bg-transparent p-0 shadow-none backdrop-blur-0",
    variant === "tab" ? "rounded-none" : "",
    className,
  );
  const headerSpacing = variant === "tab" ? "space-y-2" : "space-y-3";
  const footerAlignment = variant === "tab" ? "items-stretch" : "";
  const primaryButtonWidth = variant === "tab" ? "w-full" : "w-full md:w-auto";
  const headerPadding = variant === "tab" ? "p-0" : "px-6 pt-6";
  const contentPadding = variant === "tab" ? "p-0" : "px-6";
  const footerPadding = variant === "tab" ? "p-0 pt-5" : "px-6 pb-6 pt-2";
  const footerGap = variant === "tab" ? "gap-3" : "gap-4";
  const formClasses = cn("space-y-5", variant === "tab" ? "mt-6" : "");

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setClientError(null);
      signUpMutation.reset();

      if (password !== confirmPassword) {
        const message = "Passwords need to match before we can create your account.";
        setClientError(message);
        toast({
          title: "Check your password",
          description: message,
          variant: "destructive",
        });
        return;
      }

      const fullName = [firstName, lastName].filter(Boolean).join(" ");

      try {
        await signUpMutation.mutateAsync({ email, password, name: fullName });
      } catch {
        // handled via onError
      }
    },
    [
      confirmPassword,
      email,
      firstName,
      lastName,
      password,
      signUpMutation,
      toast,
    ],
  );

  const handleGoogleSignIn = useCallback(async () => {
    setClientError(null);
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
        <CardTitle className="text-3xl">Create your LexiFlix account</CardTitle>
        <CardDescription>
          Personalize your learning journey, track vocabulary growth, and sync your study packs
          across devices.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className={formClasses}>
        <CardContent className={cn("space-y-5", contentPadding)}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                autoComplete="given-name"
                placeholder="Lexi"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                autoComplete="family-name"
                placeholder="Learner"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                disabled={isProcessing}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isProcessing}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password-confirm">Confirm password</Label>
              <Input
                id="signup-password-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isProcessing}
              />
            </div>
          </div>
          {inlineError ? (
            <p
              className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              aria-live="polite"
            >
              {inlineError}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className={cn("flex flex-col", footerGap, footerAlignment, footerPadding)}>
          <Button type="submit" className={primaryButtonWidth} disabled={isProcessing}>
            {signUpMutation.isPending ? "Creating account..." : "Create account"}
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
              primaryButtonWidth,
            )}
            onClick={handleGoogleSignIn}
            disabled={isProcessing}
          >
            <GoogleIcon className="size-5 transition group-hover:scale-105" />
            <span className="font-medium">
              {googleSignIn.isPending ? "Connecting with Google..." : "Continue with Google"}
            </span>
          </Button>
          <p className="text-sm text-muted-foreground">
            Already part of LexiFlix?{" "}
            {onNavigateToLogin ? (
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </button>
            ) : (
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
