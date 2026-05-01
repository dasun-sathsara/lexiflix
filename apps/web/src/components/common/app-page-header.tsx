import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppPageHeaderProps = HTMLAttributes<HTMLElement> & {
  eyebrow?: ReactNode;
  heading: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
};

export function AppPageHeader({
  className,
  eyebrow,
  heading,
  description,
  actions,
  stats,
  ...props
}: AppPageHeaderProps) {
  return (
    <header
      className={cn("flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between", className)}
      {...props}
    >
      <div className="max-w-3xl flex flex-col gap-2">
        {eyebrow ? <div className="flex flex-wrap items-center gap-2">{eyebrow}</div> : null}
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px] sm:leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        {stats ? <div className="flex flex-wrap gap-2.5">{stats}</div> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </header>
  );
}

type AppSectionHeaderProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode;
  heading: ReactNode;
  description?: ReactNode;
  titleAs?: "h2" | "h3";
};

export function AppSectionHeader({
  className,
  icon,
  heading,
  description,
  titleAs = "h2",
  ...props
}: AppSectionHeaderProps) {
  const TitleTag = titleAs;

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="flex items-center gap-2">
        {icon}
        <TitleTag className="text-xl font-semibold tracking-tight">{heading}</TitleTag>
      </div>
      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
