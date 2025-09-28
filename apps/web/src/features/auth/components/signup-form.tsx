"use client";

import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";

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
import { GoogleIcon } from "./google-icon";

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  return (
    <Card className="w-full max-w-md rounded-2xl border-border/70 bg-white/80 backdrop-blur-md dark:border-border/40 dark:bg-slate-950/70">
      <CardHeader className="space-y-1.5 px-5 pt-5 text-center">
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          Create your account
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/90">
          Join LexiFlix to start your guided language-learning journey.
        </CardDescription>
      </CardHeader>

      <form className="mt-1">
        <CardContent className="space-y-3 px-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="first-name">First name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="first-name" placeholder="Lexi" className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last-name">Last name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="last-name" placeholder="Learner" className="pl-10" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="signup-password"
                type="password"
                placeholder="Create a strong password"
                className="pl-10 pr-10"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
                <Eye className="size-4" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-password-confirm">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="signup-password-confirm"
                type="password"
                placeholder="Repeat your password"
                className="pl-10 pr-10"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
                <EyeOff className="size-4" />
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-1.5 px-5 pb-5 pt-2">
          <Button
            type="submit"
            className="w-full h-11 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-500"
          >
            <span>Create account</span>
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
