import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import { Skeleton } from "./skeleton";

interface FormSkeletonProps {
  className?: string;
  showHeader?: boolean;
  showSocial?: boolean;
  fields?: number;
}

export function FormSkeleton({
  className,
  showHeader = true,
  showSocial = true,
  fields = 2,
}: FormSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("w-full space-y-6", className)}
    >
      {showHeader && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={`field-${i}`} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-full" />

        {showSocial && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Skeleton className="h-px w-full" />
              </div>
              <div className="relative flex justify-center">
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-full" />
          </>
        )}
      </div>

      <div className="flex justify-center">
        <Skeleton className="h-4 w-48" />
      </div>
    </motion.div>
  );
}

export function AuthTabsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex w-full flex-col", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-border/40 bg-white/90 p-8 backdrop-blur-2xl dark:border-border/30 dark:bg-slate-950/80"
      >
        <div className="flex items-center gap-2 rounded-full bg-muted/60 p-1 dark:bg-slate-900/70">
          <Skeleton className="h-10 flex-1 rounded-full" />
          <Skeleton className="h-10 flex-1 rounded-full" />
        </div>

        <div className="mt-8 min-h-[580px]">
          <FormSkeleton />
        </div>
      </motion.div>
    </div>
  );
}
