import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AppStat({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  variant = "pill",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  tone?: "default" | "accent" | "warm" | "success" | "danger";
  variant?: "pill" | "card";
  className?: string;
}) {
  const toneStyles = {
    default: "bg-card text-foreground",
    accent: "bg-blue-500/8 text-blue-700 dark:text-blue-200",
    warm: "bg-amber-500/10 text-amber-700 dark:text-amber-200",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
    danger: "bg-rose-500/10 text-rose-700 dark:text-rose-200",
  };

  if (variant === "card") {
    return (
      <div
        className={cn(
          "flex min-h-[104px] items-start justify-between gap-4 rounded-[calc(var(--radius)+2px)] border border-border/80 bg-card/70 p-4 shadow-xs",
          className,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                toneStyles[tone],
              )}
            >
              <Icon className="size-4" />
            </span>
          ) : null}
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-2 text-sm shadow-xs",
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
      <CardContent className="flex flex-col items-center gap-3 px-4 py-8 text-center sm:py-10">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
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

export function AppNotice({
  tone,
  title,
  children,
  className,
}: {
  tone: "info" | "success" | "warning" | "error";
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const toneStyles = {
    info: "border-blue-200/70 bg-blue-500/10 text-blue-900 dark:border-blue-500/20 dark:text-blue-100",
    success:
      "border-emerald-200/70 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/20 dark:text-emerald-100",
    warning:
      "border-amber-200/70 bg-amber-500/10 text-amber-900 dark:border-amber-500/20 dark:text-amber-100",
    error:
      "border-rose-200/70 bg-rose-500/10 text-rose-900 dark:border-rose-500/20 dark:text-rose-100",
  };
  const icons = {
    info: Info,
    success: CheckCircle2,
    warning: AlertTriangle,
    error: XCircle,
  };
  const Icon = icons[tone];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-sm",
        toneStyles[tone],
        className,
      )}
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <p className="font-medium">{title}</p>
        {children ? <div className="leading-6 opacity-90">{children}</div> : null}
      </div>
    </div>
  );
}

export function AppPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[calc(var(--radius)+2px)] border border-border/80 bg-card/70 shadow-xs",
        className,
      )}
      {...props}
    />
  );
}
