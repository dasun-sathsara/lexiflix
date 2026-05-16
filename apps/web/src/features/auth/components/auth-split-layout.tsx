import { type ReactNode, Suspense } from "react";
import { SoftGradientBackground } from "@/components/common/soft-gradient-background";

export interface Benefit {
  title: string;
  description: string;
}

export const LOGIN_BENEFITS: Benefit[] = [
  {
    title: "Stay in flow",
    description: "Resume saved study packs and keep momentum across every series you follow.",
  },
  {
    title: "Progress that adapts",
    description: "Personalized reviews that flex to your pace with real-time mastery tracking.",
  },
];

const colorStyles = {
  indigo: {
    badge:
      "border-indigo-200/60 bg-indigo-50/70 text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-200",
    bullet: "bg-indigo-500 ring-4 ring-indigo-500/20",
    spinner: "border-indigo-600",
  },
  purple: {
    badge:
      "border-purple-200/60 bg-purple-50/70 text-purple-600 dark:border-purple-500/40 dark:bg-purple-500/15 dark:text-purple-200",
    bullet: "bg-purple-500 ring-4 ring-purple-500/20",
    spinner: "border-purple-600",
  },
  emerald: {
    badge:
      "border-emerald-200/60 bg-emerald-50/70 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200",
    bullet: "bg-emerald-500 ring-4 ring-emerald-500/20",
    spinner: "border-emerald-600",
  },
};

export interface AuthSplitLayoutProps {
  badgeText: string;
  title: string;
  description: string;
  benefits?: Benefit[];
  color?: "indigo" | "purple" | "emerald";
  useSuspense?: boolean;
  children: ReactNode;
}

function AuthSplitLayoutFallback({ color }: { color: "indigo" | "purple" | "emerald" }) {
  return (
    <SoftGradientBackground>
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div
            className={`inline-block size-8 animate-spin rounded-full border-4 border-solid border-r-transparent ${colorStyles[color].spinner}`}
          />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </main>
    </SoftGradientBackground>
  );
}

function AuthSplitLayoutContent({
  badgeText,
  title,
  description,
  benefits,
  color,
  children,
}: Omit<AuthSplitLayoutProps, "useSuspense"> & { color: "indigo" | "purple" | "emerald" }) {
  return (
    <SoftGradientBackground>
      <main className="flex min-h-screen items-center px-6 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl lg:px-4">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center lg:gap-16 xl:gap-20">
            <section className="order-2 flex flex-col gap-10 text-center lg:order-1 lg:text-left">
              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm backdrop-blur ${colorStyles[color].badge}`}
              >
                <span className={`size-2 rounded-full ${colorStyles[color].bullet}`} />
                {badgeText}
              </div>
              <header className="space-y-5">
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">{title}</h1>
                <p className="mx-auto max-w-xl text-base text-muted-foreground">{description}</p>
              </header>
              {benefits && benefits.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {benefits.map((benefit) => (
                    <div
                      key={benefit.title}
                      className="flex flex-col gap-2 rounded-2xl border border-border/40 bg-white/85 p-5 text-left shadow-sm backdrop-blur-md dark:border-border/30 dark:bg-slate-950/70"
                    >
                      <p className="text-sm font-semibold text-foreground">{benefit.title}</p>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="order-1 flex justify-center lg:order-2 lg:justify-end">
              {children}
            </section>
          </div>
        </div>
      </main>
    </SoftGradientBackground>
  );
}

export function AuthSplitLayout({
  badgeText,
  title,
  description,
  benefits,
  color = "indigo",
  useSuspense = false,
  children,
}: AuthSplitLayoutProps) {
  if (useSuspense) {
    return (
      <Suspense fallback={<AuthSplitLayoutFallback color={color} />}>
        <AuthSplitLayoutContent
          badgeText={badgeText}
          title={title}
          description={description}
          benefits={benefits}
          color={color}
        >
          {children}
        </AuthSplitLayoutContent>
      </Suspense>
    );
  }

  return (
    <AuthSplitLayoutContent
      badgeText={badgeText}
      title={title}
      description={description}
      benefits={benefits}
      color={color}
    >
      {children}
    </AuthSplitLayoutContent>
  );
}
