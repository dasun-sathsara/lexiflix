import { AuthTabs } from "@/components/auth/auth-tabs";
import { SoftGradientBackground } from "@/components/ui/soft-gradient-background";

export default function LoginPage() {
  return (
    <SoftGradientBackground>
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-24">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/70 px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm backdrop-blur lg:justify-start dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-200">
              <span className="size-2 rounded-full bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.18)]" />
              LexiFlix Learner Login
            </div>
            <div className="space-y-5">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                Sign in to unlock smarter subtitle study sessions
              </h1>
              <p className="mx-auto max-w-2xl text-base text-muted-foreground lg:mx-0">
                Continue pre-learning vocabulary tailored to the stories you
                plan to watch. Your dashboard awaits with personalized packs,
                spaced review goals, and more.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/40 bg-white/80 p-4 text-left shadow-sm backdrop-blur dark:border-border/30 dark:bg-slate-950/70">
                <p className="text-sm font-semibold text-foreground">
                  Stay in flow
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Resume saved study packs and keep momentum across every series
                  you follow.
                </p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-white/80 p-4 text-left shadow-sm backdrop-blur dark:border-border/30 dark:bg-slate-950/70">
                <p className="text-sm font-semibold text-foreground">
                  Progress that adapts
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Personalized reviews that flex to your pace with real-time
                  mastery tracking.
                </p>
              </div>
            </div>
          </div>
          <AuthTabs defaultTab="login" />
        </div>
      </main>
    </SoftGradientBackground>
  );
}
