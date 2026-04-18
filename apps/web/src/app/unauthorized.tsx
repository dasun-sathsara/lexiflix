import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { ElegantButton } from "@/components/ui/button";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <SoftGradientBackground>
      <main className="flex min-h-screen items-center px-6 py-20">
        <div className="mx-auto w-full max-w-2xl text-center">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Large 401 Display */}
            <div className="relative">
              <div className="absolute inset-0 -z-10 blur-3xl opacity-30">
                <div className="mx-auto h-32 w-64 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />
              </div>
              <h1 className="text-8xl font-bold tracking-tighter text-foreground sm:text-9xl">
                401
              </h1>
            </div>

            {/* Error Message */}
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Authentication required
              </h2>
              <p className="mx-auto max-w-md text-base text-muted-foreground">
                You need to be signed in to access this page. Please log in with your LexiFlix
                account to continue.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center">
              <ElegantButton size="elegantLg" className="text-base font-medium" asChild>
                <Link href="/auth">Sign In</Link>
              </ElegantButton>
              <ElegantButton
                size="elegantLg"
                variant="elegantSecondary"
                className="text-base font-medium"
                asChild
              >
                <Link href="/">Go Home</Link>
              </ElegantButton>
            </div>

            {/* Info Card */}
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border/40 bg-card/90 p-6 text-left shadow-sm backdrop-blur-md dark:bg-card/80">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Why do I need to sign in?
              </h3>
              <p className="text-sm text-muted-foreground">
                LexiFlix requires authentication to provide personalized vocabulary packs, track
                your learning progress, and save your study sessions across devices.
              </p>
            </div>
          </div>
        </div>
      </main>
    </SoftGradientBackground>
  );
}
