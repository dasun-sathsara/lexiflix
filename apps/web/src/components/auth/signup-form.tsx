"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useToast } from "@/components/ui/use-toast";
import { useAuthClient } from "@/hooks/use-auth-client";
import { cn } from "@/lib/utils";

function getInitials(firstName: string, lastName: string) {
  const firstInitial = firstName.at(0)?.toUpperCase() ?? "L";
  const lastInitial = lastName.at(0)?.toUpperCase() ?? "F";
  return `${firstInitial}${lastInitial}`;
}

type SignupFormVariant = "standalone" | "tab";

interface SignupFormProps {
  className?: string;
  variant?: SignupFormVariant;
  onNavigateToLogin?: () => void;
}

export function SignupForm({
  className,
  variant = "standalone",
  onNavigateToLogin,
}: SignupFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuthClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardClasses = cn(
    "mx-auto flex h-full w-full flex-col",
    variant === "standalone"
      ? "max-w-2xl border-border/70 bg-white/85 backdrop-blur-md dark:border-border/40 dark:bg-slate-950/70"
      : "max-w-none border-none bg-transparent p-0 shadow-none backdrop-blur-0",
    variant === "tab" ? "rounded-none" : "",
    className,
  );

  const footerAlignment = variant === "tab" ? "items-stretch" : "";
  const primaryButtonWidth = variant === "tab" ? "w-full" : "w-full md:w-auto";
  const headerPadding = variant === "tab" ? "p-0" : "px-6 pt-6";
  const contentPadding = variant === "tab" ? "p-0" : "px-6";
  const footerPadding = variant === "tab" ? "p-0 pt-6" : "px-6 pb-6 pt-2";
  const formClasses = cn("space-y-6", variant === "tab" ? "mt-8" : "");

  useEffect(() => {
    if (!profileImage) {
      setPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(profileImage);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [profileImage]);

  const initials = useMemo(
    () => getInitials(firstName, lastName),
    [firstName, lastName],
  );

  function resetErrors() {
    setError(null);
  }

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setProfileImage(file);
  }

  function handleClearImage() {
    setProfileImage(null);
    setPreviewUrl(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    resetErrors();

    if (password !== confirmPassword) {
      const message =
        "Passwords need to match before we can create your account.";
      setError(message);
      toast({
        title: "Check your password",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await auth.signUp.email({
        email,
        password,
        firstName,
        lastName,
        image: profileImage,
      });

      router.push("/dashboard");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "We ran into a glitch while creating your account.";

      setError(message);
      toast({
        title: "Unable to create account",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className={cardClasses}>
      <CardHeader className={cn("space-y-3", headerPadding)}>
        <CardTitle className="text-3xl">Create your LexiFlix account</CardTitle>
        <CardDescription>
          Personalize your learning journey, track vocabulary growth, and sync
          your study packs across devices.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className={formClasses}>
        <CardContent className={cn("space-y-6", contentPadding)}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                {previewUrl ? (
                  <AvatarImage
                    src={previewUrl}
                    alt="Profile preview"
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-medium">Profile image</p>
                <p className="text-sm text-muted-foreground">
                  Optional, square images work best.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="text-sm">
                <label htmlFor="profile-image" className="cursor-pointer">
                  Upload
                </label>
              </Button>
              {profileImage ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClearImage}
                >
                  Clear
                </Button>
              ) : null}
              <Input
                id="profile-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first-name">First name</Label>
              <Input
                id="first-name"
                autoComplete="given-name"
                placeholder="Lexi"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">Last name</Label>
              <Input
                id="last-name"
                autoComplete="family-name"
                placeholder="Learner"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a strong password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password-confirm">Confirm password</Label>
              <Input
                id="signup-password-confirm"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>
          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter
          className={cn("flex flex-col gap-4", footerAlignment, footerPadding)}
        >
          <Button
            type="submit"
            className={primaryButtonWidth}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already part of LexiFlix?{" "}
            {onNavigateToLogin ? (
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </button>
            ) : (
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
