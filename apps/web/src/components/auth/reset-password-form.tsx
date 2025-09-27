"use client";

import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  return (
    <Card className="w-full max-w-md rounded-2xl border-border/70 bg-white/80 backdrop-blur-md dark:border-border/40 dark:bg-slate-950/70">
      <CardHeader className="space-y-1.5 px-5 pt-5 text-center">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          Set a new password
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/90">
          Choose a strong password to secure your account.
        </CardDescription>
      </CardHeader>

      <form className="mt-1">
        <CardContent className="space-y-3.5 px-5">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                className="pl-10 pr-10 h-10 rounded-lg"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
              >
                <Eye className="size-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repeat your password"
                className="pl-10 pr-10 h-10 rounded-lg"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
              >
                <EyeOff className="size-4" />
              </button>
            </div>
          </div>

          {/* Success placeholder (static) */}
          <div className="hidden items-start gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 backdrop-blur-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <CheckCircle2 className="size-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Password updated
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                You can now sign in with your new password.
              </p>
            </div>
          </div>
        </CardContent>

        <CardContent className="space-y-3.5 px-5 pb-5">
          <Button
            type="submit"
            className="w-full h-11 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-sm shadow-purple-500/30 hover:from-purple-500 hover:to-purple-500"
          >
            <span>Reset password</span>
            <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
