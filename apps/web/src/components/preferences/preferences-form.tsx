"use client";

import { CheckCircle2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

type AccountState = {
  displayName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type LanguageState = {
  nativeLanguage: string;
  cefrLevel: string;
};

type NotificationState = {
  emailNotifications: boolean;
  pushNotifications: boolean;
  dailyReviewGoal: number;
};

const cefrOptions = ["A1", "A2", "B1", "B2", "C1", "C2"];

const languageOptions = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Japanese",
  "Korean",
  "Mandarin Chinese",
];

function simulateNetworkDelay(duration = 800) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, duration);
  });
}

export function PreferencesForm() {
  const { toast } = useToast();

  const [account, setAccount] = useState<AccountState>({
    displayName: "Lexi Learner",
    username: "lexiflixfan",
    email: "lexi@example.com",
    password: "",
    confirmPassword: "",
  });

  const [language, setLanguage] = useState<LanguageState>({
    nativeLanguage: "English",
    cefrLevel: "B2",
  });

  const [notifications, setNotifications] = useState<NotificationState>({
    emailNotifications: true,
    pushNotifications: true,
    dailyReviewGoal: 20,
  });

  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const surfaceCardClass =
    "border-border/70 bg-white/80 shadow-lg shadow-indigo-100/40 backdrop-blur-md transition-shadow duration-300 dark:border-border/40 dark:bg-slate-950/75 dark:shadow-indigo-900/10";

  const profileInitials = useMemo(() => {
    const parts = account.displayName.trim().split(/\s+/);
    if (!parts.length) {
      return "LL";
    }
    return parts
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [account.displayName]);

  const goalIntensity = useMemo(() => {
    if (!notifications.dailyReviewGoal) {
      return 0;
    }
    const ratio = notifications.dailyReviewGoal / 40;
    return Math.min(100, Math.round(ratio * 100));
  }, [notifications.dailyReviewGoal]);

  const isPasswordMismatch = useMemo(() => {
    if (!account.password && !account.confirmPassword) {
      return false;
    }
    return account.password !== account.confirmPassword;
  }, [account.password, account.confirmPassword]);

  async function handleAccountSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPasswordMismatch) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure the new password fields match before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingAccount(true);

    try {
      await simulateNetworkDelay();

      toast({
        title: "Account updated",
        description: "Your profile details are ready to sync with our servers.",
      });

      setAccount((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not save your account changes.";
      toast({
        title: "Account update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingAccount(false);
    }
  }

  async function handleLanguageSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSavingLanguage(true);

    try {
      await simulateNetworkDelay(900);

      toast({
        title: "Learning preferences saved",
        description: "We will tune recommendations to match your goals.",
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save language settings right now.";
      toast({
        title: "Language settings failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingLanguage(false);
    }
  }

  async function handleNotificationsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSavingNotifications(true);

    try {
      await simulateNetworkDelay(700);

      toast({
        title: "Notification preferences updated",
        description: "We will keep nudging you at the right cadence.",
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Notifications could not be updated.";
      toast({
        title: "Notification update failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSavingNotifications(false);
    }
  }

  return (
    <section className="space-y-8">
      <Card className={`${surfaceCardClass} px-6 pb-6 pt-8`}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <Avatar className="size-20 border border-indigo-200/60 bg-indigo-500/10 text-2xl font-semibold text-indigo-600 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-100">
              <AvatarFallback className="text-lg font-semibold text-indigo-600 dark:text-indigo-100">
                {profileInitials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold leading-tight">
                  {account.displayName || "Your profile"}
                </h2>
                <p className="text-sm text-muted-foreground">@{account.username || "username"}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:justify-start">
                <Badge className="bg-indigo-500/15 text-indigo-600 shadow-sm dark:bg-indigo-500/20 dark:text-indigo-100">
                  <Sparkles className="size-3.5" />
                  Explorer plan
                </Badge>
                <Badge
                  variant="outline"
                  className="border-indigo-200/60 text-indigo-600 dark:border-indigo-400/40 dark:text-indigo-100"
                >
                  <CheckCircle2 className="size-3.5 text-emerald-500 dark:text-emerald-300" />
                  Streak 12 days
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid w-full gap-6 text-sm text-muted-foreground sm:grid-cols-2 lg:max-w-xl">
            <div className="rounded-xl border border-indigo-100/80 bg-indigo-50/60 p-4 text-indigo-900 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-50">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.32em]">
                <span>CEFR</span>
                <span>Live</span>
              </div>
              <p className="mt-3 text-3xl font-semibold text-indigo-700 dark:text-indigo-100">
                {language.cefrLevel}
              </p>
              <p className="mt-2 text-xs text-indigo-900/80 dark:text-indigo-100/80">
                We calibrate packs and scene notes to your current difficulty band.
              </p>
            </div>
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-border/60 bg-white/70 p-4 shadow-sm dark:border-border/40 dark:bg-slate-950/50">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.32em] text-foreground/70">
                  <span>Daily goal</span>
                  <span>{notifications.dailyReviewGoal} cards</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${Math.max(goalIntensity, 6)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs">
                  Knock out your reviews in under 10 minutes to keep momentum.
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-foreground/60">Primary email</dt>
                  <dd className="font-medium text-foreground/90">{account.email}</dd>
                </div>
                <div>
                  <dt className="text-foreground/60">Member since</dt>
                  <dd>January 2025</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleAccountSubmit} className="space-y-6 lg:col-span-2">
          <Card className={surfaceCardClass}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Account settings</CardTitle>
              <CardDescription>Manage how other learners see you inside LexiFlix.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input
                    id="display-name"
                    value={account.displayName}
                    onChange={(event) =>
                      setAccount((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    placeholder="Lexi Learner"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={account.username}
                    onChange={(event) =>
                      setAccount((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    placeholder="lexiflixfan"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={account.email} disabled />
                <p className="text-sm text-muted-foreground">
                  Email updates are managed through support to keep your progress safe.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={account.password}
                    onChange={(event) =>
                      setAccount((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Create a new password"
                    autoComplete="new-password"
                    minLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-confirm">Confirm new password</Label>
                  <Input
                    id="password-confirm"
                    type="password"
                    value={account.confirmPassword}
                    onChange={(event) =>
                      setAccount((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    placeholder="Repeat your new password"
                    autoComplete="new-password"
                    minLength={8}
                    aria-invalid={isPasswordMismatch || undefined}
                  />
                </div>
              </div>
              {isPasswordMismatch ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Passwords do not match yet.
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-white/50 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-950/60">
              <div className="text-sm text-muted-foreground">
                Your changes will sync once backend wiring is complete.
              </div>
              <Button type="submit" disabled={isSavingAccount}>
                {isSavingAccount ? "Saving..." : "Save account"}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <form onSubmit={handleLanguageSubmit} className="space-y-6">
          <Card className={surfaceCardClass}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Language & learning</CardTitle>
              <CardDescription>
                Tailor LexiFlix to your study goals and native language context.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="native-language">Native language</Label>
                <Select
                  value={language.nativeLanguage}
                  onValueChange={(value) =>
                    setLanguage((current) => ({
                      ...current,
                      nativeLanguage: value,
                    }))
                  }
                >
                  <SelectTrigger id="native-language" className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="cefr-level">CEFR level</Label>
                <Select
                  value={language.cefrLevel}
                  onValueChange={(value) =>
                    setLanguage((current) => ({
                      ...current,
                      cefrLevel: value,
                    }))
                  }
                >
                  <SelectTrigger id="cefr-level" className="w-full">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {cefrOptions.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-white/50 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-950/60">
              <div className="text-sm text-muted-foreground">
                These settings fine-tune vocabulary packs and subtitle pacing.
              </div>
              <Button type="submit" disabled={isSavingLanguage}>
                {isSavingLanguage ? "Saving..." : "Save preferences"}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <form onSubmit={handleNotificationsSubmit} className="space-y-6 lg:col-span-2">
          <Card className={surfaceCardClass}>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Notifications & goals</CardTitle>
              <CardDescription>
                Keep your learning momentum with gentle nudges and review targets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Email notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders and weekly progress summaries.
                  </p>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotifications((current) => ({
                      ...current,
                      emailNotifications: Boolean(checked),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">App notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Get timely nudges when it is time to review.
                  </p>
                </div>
                <Switch
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) =>
                    setNotifications((current) => ({
                      ...current,
                      pushNotifications: Boolean(checked),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-goal">Daily review goal</Label>
                <Input
                  id="daily-goal"
                  type="number"
                  min={5}
                  max={100}
                  step={1}
                  value={notifications.dailyReviewGoal}
                  onChange={(event) =>
                    setNotifications((current) => ({
                      ...current,
                      dailyReviewGoal: Number.parseInt(event.target.value, 10) || 0,
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  How many vocabulary cards would you like to review each day?
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-white/50 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-slate-950/60">
              <div className="text-sm text-muted-foreground">
                Goals help us plan study packs that fit your schedule.
              </div>
              <Button type="submit" disabled={isSavingNotifications}>
                {isSavingNotifications ? "Saving..." : "Save goals"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </section>
  );
}
