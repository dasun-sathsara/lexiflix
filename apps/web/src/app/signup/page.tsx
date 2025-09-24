import { AuthTabs } from "@/components/auth/auth-tabs";
import { SoftGradientBackground } from "@/components/ui/soft-gradient-background";

interface Benefit {
  title: string;
  description: string;
}

const SIGNUP_BENEFITS: Benefit[] = [
  {
    title: "Curated word banks",
    description: "Every show comes with vocab lists matched to your goals and difficulty level.",
  },
  {
    title: "Guided practice",
    description: "Interactive prompts and spaced reminders ensure new phrases stick for the binge.",
  },
];

export default function SignupPage() {

  return (
    <SoftGradientBackground>
      <main className="flex min-h-screen items-center px-6 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl lg:px-4">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center lg:gap-16 xl:gap-20">
            <section className="order-2 flex flex-col gap-10 text-center lg:order-1 lg:text-left">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/70 px-4 py-2 text-sm font-medium text-emerald-600 shadow-sm backdrop-blur dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
                <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.18)]" />
                Start your LexiFlix journey
              </div>
              <header className="space-y-5">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Create an account to pre-learn every episode in style
                </h1>
                <p className="mx-auto max-w-xl text-base text-muted-foreground lg:mx-0">
                  Discover vocabulary packs aligned to your CEFR level, complete with AI-crafted
                  examples and review reminders that help you prep before the opening credits roll.
                </p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                {SIGNUP_BENEFITS.map((benefit) => (
                  <div
                    key={benefit.title}
                    className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-white/85 p-5 text-left shadow-sm backdrop-blur-md dark:border-border/30 dark:bg-slate-950/70"
                  >
                    <p className="text-sm font-semibold text-foreground">{benefit.title}</p>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="order-1 flex justify-center lg:order-2 lg:justify-end">
              <AuthTabs defaultTab="signup" className="w-full max-w-md lg:ml-auto" />
            </section>
          </div>
        </div>
      </main>
    </SoftGradientBackground>
  );
}
