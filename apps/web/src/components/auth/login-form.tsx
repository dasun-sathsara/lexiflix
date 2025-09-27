"use client";

import { ArrowRight, Eye, Lock, Mail } from "lucide-react";

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
import { GoogleIcon } from "./google-icon";

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onForgotPassword: () => void;
}

export function LoginForm({ onSwitchToSignup, onForgotPassword }: LoginFormProps) {
  return (
    <Card className="w-full max-w-md rounded-2xl border-border/70 bg-white/80 backdrop-blur-md dark:border-border/40 dark:bg-slate-950/70">
      <CardHeader className="space-y-1.5 px-5 pt-5 text-center">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          Welcome back
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/90">
          Sign in to access your personalized study packs.
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-sm font-medium text-purple-600 hover:text-purple-500 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
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

          <div className="flex items-center justify-between pt-1">
            <Label
              htmlFor="remember-me"
              className="flex cursor-pointer items-center gap-2.5 text-sm font-medium"
            >
              <Checkbox id="remember-me" className="rounded-md" />
              <span className="select-none">Remember me</span>
            </Label>
            <div className="text-sm text-muted-foreground">
              Need an account?{" "}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="font-semibold text-purple-600 hover:text-purple-500 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
              >
                Sign up
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3.5 px-5 pb-5 pt-1">
          <Button
            type="submit"
            className="w-full h-11 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-sm shadow-purple-500/30 hover:from-purple-500 hover:to-purple-500"
          >
            <span>Sign in</span>
            <ArrowRight className="size-4" />
          </Button>

          <div className="relative w-full my-2">
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
            className="w-full group h-11 rounded-lg border-2 bg-background/95 font-semibold text-foreground"
          >
            <GoogleIcon className="size-5 mr-2" />
            <span>Continue with Google</span>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
