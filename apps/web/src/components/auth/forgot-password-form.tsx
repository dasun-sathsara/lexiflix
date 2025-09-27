"use client";

import { ArrowRight, CheckCircle2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ForgotPasswordFormProps {
  onBackToLogin: () => void;
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  return (
    <Card className="w-full max-w-md rounded-2xl border-border/70 bg-white/80 backdrop-blur-md dark:border-border/40 dark:bg-slate-950/70">
      <CardHeader className="space-y-1.5 px-5 pt-5 text-center">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          Forgot your password?
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/90">
          We'll email you a secure link to reset it.
        </CardDescription>
      </CardHeader>

      <form className="mt-1">
        <CardContent className="space-y-3.5 px-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="pl-10 h-10 rounded-lg"
              />
            </div>
          </div>

          {/* Success message (static placeholder) */}
          <div className="hidden items-start gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 backdrop-blur-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
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

          {/* Error message (static placeholder) */}
          <div className="hidden rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-sm font-medium text-destructive">
              Unable to send reset email. Please try again.
            </p>
          </div>
        </CardContent>

        <CardContent className="space-y-3.5 px-5 pb-5">
          <Button
            type="submit"
            className="w-full h-11 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-sm shadow-purple-500/30 hover:from-purple-500 hover:to-purple-500"
          >
            <span>Send reset link</span>
            <ArrowRight className="size-4" />
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
            >
              &larr; Back to sign in
            </button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
