import Link from "next/link";
import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { ElegantButton } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <SoftGradientBackground>
      <main className="flex min-h-screen items-center px-6 py-20">
        <div className="mx-auto w-full max-w-2xl text-center">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Large 403 Display */}
            <div className="relative">
              <div className="absolute inset-0 -z-10 blur-3xl opacity-30">
                <div className="mx-auto h-32 w-64 rounded-full bg-gradient-to-r from-red-400 via-rose-400 to-pink-400" />
              </div>
              <h1 className="text-8xl font-bold tracking-tighter text-foreground sm:text-9xl">
                403
              </h1>
            </div>

            {/* Error Message */}
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Access forbidden
              </h2>
              <p className="mx-auto max-w-md text-base text-muted-foreground">
                You don't have permission to access this resource. If you believe this is an error,
                please contact support.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
              <ElegantButton size="elegantLg" className="text-base font-medium" asChild>
                <Link href="/">Return Home</Link>
              </ElegantButton>
              <ElegantButton
                size="elegantLg"
                variant="elegantSecondary"
                className="text-base font-medium"
                asChild
              >
                <Link href="/dashboard">My Dashboard</Link>
              </ElegantButton>
            </div>

            {/* Info Card */}
            <div className="mx-auto mt-8 max-w-md rounded-[calc(var(--radius)+2px)] border border-border/40 bg-card/90 p-5 text-left shadow-sm backdrop-blur-md dark:bg-card/80">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Why am I seeing this?</h3>
              <p className="text-sm text-muted-foreground">
                This page or resource requires special permissions. You may need a different account
                type, subscription level, or administrative access to view this content.
              </p>
            </div>
          </div>
        </div>
      </main>
    </SoftGradientBackground>
  );
}
