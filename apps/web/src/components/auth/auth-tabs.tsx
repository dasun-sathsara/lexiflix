"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { cn } from "@/lib/utils";
import { ForgotPasswordForm } from "./forgot-password-form";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

type AuthView = "login" | "signup" | "forgot-password";

export function AuthTabs({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  const [activeView, setActiveView] = React.useState<AuthView>(
    (searchParams.get("tab") as AuthView) ?? "login",
  );
  const [height, setHeight] = React.useState<number | "auto">("auto");
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      setHeight(el.offsetHeight);
    });
    ro.observe(el);
    setHeight(el.offsetHeight);

    return () => ro.disconnect();
  }, [activeView]);

  const isLogin = activeView === "login";
  const isSignup = activeView === "signup";
  const isForgotPassword = activeView === "forgot-password";

  const renderContent = () => {
    if (isLogin) {
      return (
        <motion.div
          key="login"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          <LoginForm
            onSwitchToSignup={() => setActiveView("signup")}
            onForgotPassword={() => setActiveView("forgot-password")}
          />
        </motion.div>
      );
    }
    if (isSignup) {
      return (
        <motion.div
          key="signup"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          <SignupForm onSwitchToLogin={() => setActiveView("login")} />
        </motion.div>
      );
    }
    return (
      <motion.div
        key="forgot-password"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18 }}
      >
        <ForgotPasswordForm onBackToLogin={() => setActiveView("login")} />
      </motion.div>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      {!isForgotPassword && (
        <div className="mb-4 grid w-full grid-cols-2 rounded-xl border border-border/60 bg-background/80 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveView("login")}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-all",
              isLogin ? "bg-purple-600 text-white shadow-md" : "text-foreground hover:bg-muted/60",
            )}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setActiveView("signup")}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-all",
              isSignup
                ? "bg-emerald-600 text-white shadow-md"
                : "text-foreground hover:bg-muted/60",
            )}
          >
            Sign up
          </button>
        </div>
      )}

      <motion.div
        layout
        initial={false}
        animate={{ height }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="overflow-hidden"
      >
        <div ref={contentRef}>
          <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
