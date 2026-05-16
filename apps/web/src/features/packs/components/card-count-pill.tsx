import { cn } from "@/lib/utils";

interface CardCountPillProps {
  count: number;
  label: string;
  variant: "new" | "learning" | "due";
}

export function CardCountPill({ count, label, variant }: CardCountPillProps) {
  if (count === 0) return null;

  const styles = {
    new: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-500/30",
    learning:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/30",
    due: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-xs",
        styles[variant],
      )}
    >
      <span className="font-medium tabular-nums">{count}</span>
      <span className="opacity-75">{label}</span>
    </span>
  );
}
