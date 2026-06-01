"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "../server/actions";
import { type SignUpInput, SignUpSchema } from "../types";
import { FormError } from "./form-error";
import { SocialAuthButtons } from "./social-auth-buttons";

export function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: SignUpInput) => {
    setServerError(null);

    const formData = new FormData();
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);

    const result = await signupAction(formData);

    if (!result.ok) {
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            setError(field as keyof SignUpInput, {
              type: "server",
              message: messages[0],
            });
          }
        });
      }

      if (result.error) {
        setServerError(result.error);
        toast.error(result.error);
      }
    } else {
      toast.success("Account created successfully! Check your email to verify.");
      router.push("/dashboard");
    }
  };

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

      <form onSubmit={handleSubmit(onSubmit)} className="mt-1">
        <CardContent className="space-y-3 px-5">
          {serverError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-3">
              <FormError error={serverError} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs font-semibold text-foreground">
                First Name
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="firstName"
                  placeholder="Jane"
                  className="h-11 pl-10 text-sm font-medium"
                  aria-invalid={!!errors.firstName}
                  {...register("firstName")}
                />
              </div>
              {errors.firstName && (
                <p className="text-xs font-medium text-destructive mt-1 font-sans">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs font-semibold text-foreground">
                Last Name
              </Label>
              <Input
                id="lastName"
                placeholder="Doe"
                className="h-11 text-sm font-medium"
                aria-invalid={!!errors.lastName}
                {...register("lastName")}
              />
              {errors.lastName && (
                <p className="text-xs font-medium text-destructive mt-1 font-sans">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-foreground">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="h-11 pl-10 text-sm font-medium"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-xs font-medium text-destructive mt-1 font-sans">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-foreground">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                className="h-11 pl-10 pr-10 text-sm font-medium"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs font-medium text-destructive mt-1 font-sans">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat password"
                className="h-11 pl-10 pr-10 text-sm font-medium"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs font-medium text-destructive mt-1 font-sans">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-1.5 px-5 pb-5 pt-1">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-sm shadow-purple-500/30 hover:from-purple-500 hover:to-purple-500 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          <SocialAuthButtons mode="signup" />
        </CardFooter>
      </form>
    </Card>
  );
}
