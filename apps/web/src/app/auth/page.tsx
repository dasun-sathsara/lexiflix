import { SoftGradientBackground } from "@/components/common/soft-gradient-background";
import { AuthTabs } from "@/features/auth/components/auth-tabs";

interface Benefit {
  title: string;
  description: string;
}

const LOGIN_BENEFITS: Benefit[] = [
  {
    title: "Stay in flow",
    description: "Resume saved study packs and keep momentum across every series you follow.",
  },
  {
    title: "Progress that adapts",
    description: "Personalized reviews that flex to your pace with real-time mastery tracking.",
  },
];

export default function AuthPage() {
  return (
    <SoftGradientBackground>
      <main className="flex min-h-screen items-center px-6 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl lg:px-4">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center lg:gap-16 xl:gap-20">
            <section className="order-2 flex flex-col gap-10 text-center lg:order-1 lg:text-left">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/70 px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm backdrop-blur dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-200">
                <span className="size-2 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20" />
                LexiFlix Learner Login
              </div>
              <header className="space-y-5">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">
                  Sign in to unlock smarter subtitle study sessions
                </h1>
                <p className="mx-auto max-w-xl text-base text-muted-foreground">
                  Continue pre-learning vocabulary tailored to the stories you plan to watch. Your
                  dashboard awaits with personalized packs, spaced review goals, and more.
                </p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                {LOGIN_BENEFITS.map((benefit) => (
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
              <AuthTabs className="w-full max-w-md lg:ml-auto" />
            </section>
          </div>
        </div>
      </main>
    </SoftGradientBackground>
  );
}
