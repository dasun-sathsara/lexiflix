"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

interface AuthTab {
  id: "login" | "signup";
  title: string;
  accent: string;
}

interface AuthTabsProps {
  defaultTab?: AuthTab["id"];
  className?: string;
}

const authTabs: AuthTab[] = [
  { id: "login", title: "Sign in", accent: "bg-indigo-500" },
  { id: "signup", title: "Create account", accent: "bg-emerald-500" },
];

export function AuthTabs({ defaultTab = "login", className }: AuthTabsProps) {
  const [selected, setSelected] = useState<AuthTab["id"]>(defaultTab);
  const [direction, setDirection] = useState(0);

  const indicatorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<AuthTab["id"], HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ width: 0, left: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const button = buttonRefs.current.get(selected);
      const container = containerRef.current;
      if (!button || !container) return;

      const buttonRect = button.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      setIndicator({
        width: buttonRect.width,
        left: buttonRect.left - containerRect.left,
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [selected]);

  const selectedTab = useMemo(
    () => authTabs.find((tab) => tab.id === selected) ?? authTabs[0],
    [selected],
  );

  const handleSelect = (tabId: AuthTab["id"]) => {
    if (tabId === selected) return;
    const currentIndex = authTabs.findIndex((tab) => tab.id === selected);
    const nextIndex = authTabs.findIndex((tab) => tab.id === tabId);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setSelected(tabId);
  };

  return (
    <div className={cn("flex w-full flex-col", className)}>
      <div className="relative mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-border/40 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-border/30 dark:bg-slate-950/80">
        <div
          ref={containerRef}
          className="relative flex items-center gap-2 rounded-full bg-muted/60 p-1 dark:bg-slate-900/70"
        >
          <motion.div
            ref={indicatorRef}
            className={cn(
              "absolute top-1 bottom-1 rounded-full",
              selectedTab.accent,
            )}
            animate={{ width: Math.max(indicator.width, 0), x: indicator.left }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          />
          {authTabs.map((tab) => {
            const isActive = tab.id === selected;
            return (
              <motion.button
                key={tab.id}
                ref={(node) => {
                  if (node) buttonRefs.current.set(tab.id, node);
                  else buttonRefs.current.delete(tab.id);
                }}
                type="button"
                onClick={() => handleSelect(tab.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelect(tab.id);
                  }
                }}
                className={cn(
                  "relative z-[1] flex-1 rounded-full px-6 py-3 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-selected={isActive}
                aria-controls={`auth-tab-${tab.id}`}
              >
                {tab.title}
              </motion.button>
            );
          })}
        </div>

        <div className="relative mt-8 flex-1 min-h-[580px]">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={selectedTab.id}
              custom={direction}
              initial={{
                x: direction >= 0 ? 40 : -40,
                opacity: 0,
                filter: "blur(18px)",
              }}
              animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{
                x: direction >= 0 ? -40 : 40,
                opacity: 0,
                filter: "blur(18px)",
              }}
              transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-0 flex min-h-[580px]"
            >
              {selectedTab.id === "login" ? (
                <LoginForm
                  variant="tab"
                  onNavigateToSignup={() => handleSelect("signup")}
                />
              ) : (
                <SignupForm
                  variant="tab"
                  onNavigateToLogin={() => handleSelect("login")}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
