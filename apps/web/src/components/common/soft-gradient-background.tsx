import { cn } from "@/lib/utils";

interface SoftGradientBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export function SoftGradientBackground({ className, children }: SoftGradientBackgroundProps) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-gradient-to-b",
        "from-slate-100 via-white to-slate-200",
        "dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-1/2 top-[-20%] h-[420px] w-[720px] -translate-x-1/2 rounded-[999px] bg-sky-100/40 blur-3xl dark:bg-sky-900/40" />
      <div className="pointer-events-none absolute bottom-[-25%] left-1/2 h-[460px] w-[880px] -translate-x-1/2 rounded-[999px] bg-indigo-100/35 blur-3xl dark:bg-indigo-900/35" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#94a3b81a_1px,_transparent_1px)] [background-size:48px_48px] dark:bg-[radial-gradient(#1f29377a_1px,_transparent_1px)]" />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}
