"use client";

import { useEffect } from "react";
import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { ElegantButton } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SoftGradientBackground>
      <main className="flex min-h-screen items-center px-6 py-20">
        <div className="mx-auto w-full max-w-2xl space-y-6 text-center">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Something went wrong
            </h2>
            <p className="mx-auto max-w-md text-base text-muted-foreground">
              We couldn't load this page. This is sometimes temporary — please try again.
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <ElegantButton
              size="elegantLg"
              className="text-base font-medium"
              onClick={() => reset()}
            >
              Try again
            </ElegantButton>
          </div>
        </div>
      </main>
    </SoftGradientBackground>
  );
}
