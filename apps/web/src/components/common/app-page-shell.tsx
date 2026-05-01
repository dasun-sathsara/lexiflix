import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function AppPageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8", className)} {...props} />
  );
}

export function AppPageShell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <AppPageContainer className={cn("relative flex flex-col gap-3 py-4", className)} {...props} />
  );
}
