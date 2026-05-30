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
import { signupAction } from "../actions";
import { useGoogleSignUp } from "../mutations";
import { type SignUpInput, SignUpSchema } from "../schemas";
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

  const googleSignUp = useGoogleSignUp();

  const onSubmit = async (data: SignUpInput) => {
    setServerError(null);

    const formData = new FormData();
    formData.append("firstName", data.firstName);
    formData.append("lastName", data.lastName);
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);

    const result = await signupAction(formData);

    if (!result.success) {
      if (result.errors) {
        // Handle field-specific errors
        Object.entries(result.errors).forEach(([field, messages]) => {
          if (messages?.[0]) {
            setError(field as keyof SignUpInput, {
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
      toast.success("Account created! Check your inbox to verify your email.");
      router.push("/dashboard");
    }
  };

  const handleGoogleSignUp = () => {
    googleSignUp.mutate();
  };

  const isLoading = isSubmitting || googleSignUp.isPending;

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
              <FormError error={serverError} className="justify-center" />
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="firstName"
                  placeholder="Lexi"
                  className="pl-10"
                  disabled={isLoading}
                  aria-invalid={!!errors.firstName}
                  {...register("firstName")}
                />
              </div>
              {errors.firstName && <FormError error={errors.firstName.message} />}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="lastName"
                  placeholder="Learner"
                  className="pl-10"
                  disabled={isLoading}
                  aria-invalid={!!errors.lastName}
                  {...register("lastName")}
                />
              </div>
              {errors.lastName && <FormError error={errors.lastName.message} />}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
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
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
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

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat your password"
                className="pl-10 pr-10"
                disabled={isLoading}
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {errors.confirmPassword && <FormError error={errors.confirmPassword.message} />}
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-1.5 px-5 pb-5 pt-2">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-sm shadow-emerald-500/30 hover:from-emerald-500 hover:to-emerald-500 disabled:opacity-50"
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

          <SocialAuthButtons
            mode="signup"
            onGoogleClick={handleGoogleSignUp}
            isLoading={googleSignUp.isPending}
          />
        </CardFooter>
      </form>
    </Card>
  );
}
