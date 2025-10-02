"use client";

import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

type Status = "loading" | "success" | "error";

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const verifyEmail = useCallback(
    async (token: string) => {
      try {
        const { error } = await authClient.verifyEmail({ query: { token } });

        if (error) {
          setStatus("error");
          setErrorMessage(error.message || "Verification failed. Please try again.");
          return;
        }

        setStatus("success");
        const redirectTimer = setTimeout(() => {
          router.replace("/dashboard");
        }, 2000);

        return () => clearTimeout(redirectTimer);
      } catch {
        setStatus("error");
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    },
    [router],
  );

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMessage(
        ["INVALID_TOKEN", "invalid_token"].includes(error)
          ? "This verification link is invalid or has expired."
          : "An error occurred during verification.",
      );
      return;
    }

    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided.");
      return;
    }

    verifyEmail(token);
  }, [searchParams, verifyEmail]);

  const handleResendEmail = () => {
    router.push("/auth");
  };

  return (
    <Card className="w-full max-w-md rounded-2xl border-border/70 bg-white/80 backdrop-blur-md dark:border-border/40 dark:bg-slate-950/70">
      <CardHeader className="space-y-1.5 px-5 pt-5 text-center">
        <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20">
          {status === "loading" && (
            <Loader2 className="size-6 animate-spin text-emerald-600 dark:text-emerald-400" />
          )}
          {status === "success" && (
            <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
          )}
          {status === "error" && <AlertCircle className="size-6 text-red-600 dark:text-red-400" />}
        </div>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          {status === "loading" && "Verifying your email..."}
          {status === "success" && "Email verified!"}
          {status === "error" && "Verification failed"}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/90">
          {status === "loading" && "Please wait while we verify your email."}
          {status === "success" && "Your account is now active. Redirecting to dashboard..."}
          {status === "error" && errorMessage}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3.5 px-5 pb-5">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex gap-1.5">
              <div className="size-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.3s]" />
              <div className="size-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.15s]" />
              <div className="size-2 animate-bounce rounded-full bg-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">Confirming your email address...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 backdrop-blur-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <CheckCircle2 className="size-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Successfully verified
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                You'll be redirected shortly.
              </p>
            </div>
          </div>
        )}

        {status === "error" && (
          <>
            <div className="flex items-start gap-3 rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 backdrop-blur-sm dark:border-red-500/30 dark:bg-red-500/10">
              <AlertCircle className="size-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Unable to verify email
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  The verification link may have expired or is invalid.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="button"
                onClick={handleResendEmail}
                className="flex w-full h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-500"
              >
                <Mail className="size-4" />
                <span>Resend verification email</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/auth")}
                className="w-full h-11 rounded-lg"
              >
                Back to sign in
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
