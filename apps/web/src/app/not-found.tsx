import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { ElegantButton } from "@/components/ui/button";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <SoftGradientBackground>
      <main className="flex min-h-screen items-center px-6 py-20">
        <div className="mx-auto w-full max-w-2xl text-center">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Large 404 Display */}
            <div className="relative">
              <div className="absolute inset-0 -z-10 blur-3xl opacity-30">
                <div className="mx-auto h-32 w-64 rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
              </div>
              <h1 className="text-8xl font-bold tracking-tighter text-foreground sm:text-9xl">
                404
              </h1>
            </div>

            {/* Error Message */}
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Page not found
              </h2>
              <p className="mx-auto max-w-md text-base text-muted-foreground">
                The page you're looking for doesn't exist or may have been moved. Let's get you back
                on track.
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
                <Link href="/auth">Sign In</Link>
              </ElegantButton>
            </div>

            {/* Helpful Links */}
            <div className="pt-8">
              <p className="mb-4 text-sm text-muted-foreground">Popular pages:</p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href="/"
                  className="rounded-xl border border-border/40 bg-card/90 px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-primary/5 hover:border-primary/30 hover:text-primary dark:bg-card/80 dark:hover:bg-primary/10 dark:hover:text-primary"
                >
                  Home
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-xl border border-border/40 bg-card/90 px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-primary/5 hover:border-primary/30 hover:text-primary dark:bg-card/80 dark:hover:bg-primary/10 dark:hover:text-primary"
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className="rounded-xl border border-border/40 bg-card/90 px-4 py-2 text-sm font-medium text-foreground transition-all hover:bg-primary/5 hover:border-primary/30 hover:text-primary dark:bg-card/80 dark:hover:bg-primary/10 dark:hover:text-primary"
                >
                  Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </SoftGradientBackground>
  );
}
