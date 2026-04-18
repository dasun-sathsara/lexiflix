"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMessage(
        error === "INVALID_TOKEN"
          ? "This reset link is invalid or has expired."
          : "An error occurred. Please request a new reset link.",
      );
    } else if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setStatus("error");
      setErrorMessage("No reset token provided. Please request a new reset link.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid reset token. Please request a new reset link.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setStatus("error");
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    setStatus("idle");
    setErrorMessage("");

    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (error) {
        setStatus("error");
        setErrorMessage(error.message || "Failed to reset password. Please try again.");
      } else {
        setStatus("success");
        setTimeout(() => {
          router.push("/auth");
        }, 2000);
      }
    } catch {
      setStatus("error");
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md rounded-2xl border-border/70 bg-white/80 backdrop-blur-md dark:border-border/40 dark:bg-slate-950/70">
      <CardHeader className="space-y-2 px-6 pt-6 text-center">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          Set a new password
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/90">
          Choose a strong password to secure your account.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 px-6 pb-6">
          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                className="pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || status === "success" || !token}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Confirm password field */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat your password"
                className="pl-10 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading || status === "success" || !token}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Success message */}
          {status === "success" && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 backdrop-blur-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <CheckCircle2 className="size-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Password updated
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Redirecting to sign in...
                </p>
              </div>
            </div>
          )}

          {/* Error message */}
          {status === "error" && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 backdrop-blur-sm dark:border-red-500/30 dark:bg-red-500/10">
              <AlertCircle className="size-5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{errorMessage}</p>
                {!token && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/auth/forgot-password")}
                    className="h-auto p-0 text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Request new reset link →
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isLoading || status === "success" || !token}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-sm shadow-purple-500/30 hover:from-purple-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <span>Reset password</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
