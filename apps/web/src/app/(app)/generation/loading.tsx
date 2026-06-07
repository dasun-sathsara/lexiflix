import { AppPageShell } from "@/components/common/app-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function GenerationLoading() {
  return (
    <AppPageShell className="gap-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, index) => `generation-job-${index}`).map((key) => (
          <Skeleton key={key} className="h-20 rounded-xl" />
        ))}
      </div>
    </AppPageShell>
  );
}
