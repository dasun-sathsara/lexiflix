import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function AppPageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-6xl px-6", className)} {...props} />;
}

export function AppPageShell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <AppPageContainer className={cn("relative flex flex-col py-6", className)} {...props} />;
}
