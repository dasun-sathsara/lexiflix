"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { signInAction } from "../actions";
import { useGoogleSignIn } from "../mutations";
import { type SignInInput, SignInSchema } from "../schemas";
import { FormError } from "./form-error";
import { SocialAuthButtons } from "./social-auth-buttons";

interface LoginFormProps {
  onForgotPassword?: () => void;
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignInInput>({
    resolver: zodResolver(SignInSchema),
    mode: "onChange",
  });

  const googleSignIn = useGoogleSignIn();

  const onSubmit = async (data: SignInInput) => {
    setServerError(null);

    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("rememberMe", rememberMe.toString());

    const result = await signInAction(formData);

    if (!result.success) {
      if (result.errors) {
        // Handle field-specific errors
        Object.entries(result.errors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            setError(field as keyof SignInInput, {
              type: "server",
              message: messages[0],
            });
          }
        });
      }
      if (result.message) {
        setServerError(result.message);
        toast.error(result.message);
      }
    } else {
      toast.success("Welcome back!");
      router.push("/dashboard");
    }
  };

  const handleGoogleSignIn = () => {
    googleSignIn.mutate();
  };

  const isLoading = isSubmitting || googleSignIn.isPending;

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

      <form onSubmit={handleSubmit(onSubmit)} className="mt-1">
        <CardContent className="space-y-3.5 px-5">
          {serverError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3">
              <FormError error={serverError} className="justify-center" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="pl-10"
                disabled={isLoading}
                aria-invalid={!!errors.email}
                {...register("email")}
              />
            </div>
            {errors.email && <FormError error={errors.email.message} />}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {onForgotPassword && (
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm font-medium text-purple-600 hover:text-purple-500 hover:underline dark:text-purple-400 dark:hover:text-purple-300"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pl-10 pr-10"
                disabled={isLoading}
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && <FormError error={errors.password.message} />}
          </div>

          <div className="flex items-center justify-between p-1">
            <Label
              htmlFor="remember-me"
              className="flex cursor-pointer items-center gap-2.5 text-sm font-medium"
            >
              <Checkbox
                id="remember-me"
                className="rounded-md"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isLoading}
              />
              <span className="select-none">Remember me</span>
            </Label>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-1.5 px-5 pb-5 pt-1">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-sm shadow-purple-500/30 hover:from-purple-500 hover:to-purple-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          <SocialAuthButtons
            mode="signin"
            onGoogleClick={handleGoogleSignIn}
            isLoading={googleSignIn.isPending}
          />
        </CardFooter>
      </form>
    </Card>
  );
}
