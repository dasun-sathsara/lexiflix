import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function StudySessionLoading() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-muted-foreground">Preparing your study session…</p>
    </div>
  );
}
