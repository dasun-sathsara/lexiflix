import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface FormErrorProps {
  error?: string | null;
  className?: string;
}

export function FormError({ error, className }: FormErrorProps) {
  if (!error) return null;

  return (
    <div
      className={cn("flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400", className)}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
      <span>{error}</span>
    </div>
  );
}
