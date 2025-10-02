"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

interface ForgotPasswordFormProps {
  onBackToLogin?: () => void;
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const { error } = await authClient.forgetPassword({
        email,
        redirectTo: "/auth/reset-password",
      });

      if (error) {
        setStatus("error");
        setErrorMessage(error.message || "Failed to send reset email. Please try again.");
      } else {
        setStatus("success");
      }
    } catch {
      setStatus("error");
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      router.push("/auth");
    }
  };

  return (
    <Card className="w-full max-w-md rounded-2xl border-border/70 bg-white/80 backdrop-blur-md dark:border-border/40 dark:bg-slate-950/70">
      <CardHeader className="space-y-2 px-6 pt-6 text-center">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          Forgot your password?
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/90">
          We'll email you a secure link to reset it.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-6 pb-6">
          {/* Email input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || status === "success"}
                required
              />
            </div>
          </div>

          {/* Success message */}
          {status === "success" && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 backdrop-blur-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <CheckCircle2 className="size-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Reset link sent
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Check your inbox for the secure link.
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {status === "error" && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 backdrop-blur-sm dark:border-red-500/30 dark:bg-red-500/10">
              <AlertCircle className="size-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{errorMessage}</p>
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isLoading || status === "success"}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-sm shadow-purple-500/30 hover:from-purple-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Send reset link</span>
            )}
          </Button>

          {/* Back to login */}
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              <span>Back to sign in</span>
            </button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
