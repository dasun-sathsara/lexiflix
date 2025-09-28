import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <SoftGradientBackground>
      <main className="flex min-h-screen items-center px-6 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl lg:px-4">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center lg:gap-16 xl:gap-20">
            <section className="order-2 flex flex-col gap-10 text-center lg:order-1 lg:text-left">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-200/60 bg-purple-50/70 px-4 py-2 text-sm font-medium text-purple-600 shadow-sm backdrop-blur dark:border-purple-500/40 dark:bg-purple-500/15 dark:text-purple-200">
                <span className="size-2 rounded-full bg-purple-500 shadow-[0_0_0_4px_rgba(168,85,247,0.18)]" />
                Reset Your Password
              </div>
              <header className="space-y-5">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                  Create a fresh password for your account
                </h1>
                <p className="mx-auto max-w-xl text-base text-muted-foreground">
                  Enter a new password and confirm it to regain secure access to your LexiFlix
                  account.
                </p>
              </header>
            </section>
            <section className="order-1 flex justify-center lg:order-2 lg:justify-end">
              <ResetPasswordForm />
            </section>
          </div>
        </div>
      </main>
    </SoftGradientBackground>
  );
}
