import { AuthTabs } from "@/components/auth/auth-tabs";
import { SoftGradientBackground } from "@/components/ui/soft-gradient-background";

export default function SignupPage() {
  return (
    <SoftGradientBackground>
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-24">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/70 px-4 py-2 text-sm font-medium text-emerald-600 shadow-sm backdrop-blur lg:justify-start dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
              <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]" />
              Start your LexiFlix journey
            </div>
            <div className="space-y-5">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Create an account to pre-learn every episode in style
              </h1>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground lg:mx-0">
                Discover vocabulary packs aligned to your CEFR level, complete
                with AI-crafted examples and review reminders that help you prep
                before the opening credits roll.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/40 bg-white/80 p-4 text-left shadow-sm backdrop-blur dark:border-border/30 dark:bg-slate-950/70">
                <p className="text-sm font-semibold text-foreground">
                  Curated word banks
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every show comes with vocab lists matched to your goals and
                  difficulty level.
                </p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-white/80 p-4 text-left shadow-sm backdrop-blur dark:border-border/30 dark:bg-slate-950/70">
                <p className="text-sm font-semibold text-foreground">
                  Guided practice
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Interactive prompts and spaced reminders ensure new phrases
                  stick for the binge.
                </p>
              </div>
            </div>
          </div>
          <AuthTabs defaultTab="signup" />
        </div>
      </main>
    </SoftGradientBackground>
  );
}
