import { Suspense } from "react";
import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { VerifyEmailForm } from "@/features/auth/components/verify-email-form";

function VerifyEmailContent() {
  return (
    <SoftGradientBackground>
      <main className="flex min-h-screen items-center px-6 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl lg:px-4">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center lg:gap-16 xl:gap-20">
            <section className="order-2 flex flex-col gap-10 text-center lg:order-1 lg:text-left">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/70 px-4 py-2 text-sm font-medium text-emerald-600 shadow-sm backdrop-blur dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
                <span className="size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                Email Verification
              </div>
              <header className="space-y-5">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                  Verify your email to get started
                </h1>
                <p className="mx-auto max-w-xl text-base text-muted-foreground">
                  We're confirming your email address to ensure the security of your account. This
                  will only take a moment.
                </p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-white/85 p-5 text-left shadow-sm backdrop-blur-md dark:border-border/30 dark:bg-slate-950/70">
                  <p className="text-sm font-semibold text-foreground">Secure access</p>
                  <p className="text-sm text-muted-foreground">
                    Email verification helps protect your account and personal learning data.
                  </p>
                </div>
                <div className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-white/85 p-5 text-left shadow-sm backdrop-blur-md dark:border-border/30 dark:bg-slate-950/70">
                  <p className="text-sm font-semibold text-foreground">Quick setup</p>
                  <p className="text-sm text-muted-foreground">
                    Once verified, you'll have instant access to all LexiFlix features.
                  </p>
                </div>
              </div>
            </section>
            <section className="order-1 flex justify-center lg:order-2 lg:justify-end">
              <VerifyEmailForm />
            </section>
          </div>
        </div>
      </main>
    </SoftGradientBackground>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <SoftGradientBackground>
          <main className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
            </div>
          </main>
        </SoftGradientBackground>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
