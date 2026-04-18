import type { ComponentType, HTMLAttributes, ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AppStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: "default" | "accent" | "warm" | "success" | "danger";
  className?: string;
}) {
  const toneStyles = {
    default: "bg-card text-foreground",
    accent: "bg-blue-500/8 text-blue-700 dark:text-blue-200",
    warm: "bg-amber-500/10 text-amber-700 dark:text-amber-200",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    danger: "bg-rose-500/10 text-rose-700 dark:text-rose-200",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-2 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn("flex size-6 items-center justify-center rounded-full", toneStyles[tone])}
        >
          <Icon className="size-3.5" />
        </span>
      ) : null}
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export function AppEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-dashed bg-card/70", className)}>
      <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
        <div className="flex max-w-sm flex-col gap-1.5">
          <p className="text-base font-semibold tracking-tight">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export function AppPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[calc(var(--radius)+2px)] border border-border/80 bg-card/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
      {...props}
    />
  );
}
