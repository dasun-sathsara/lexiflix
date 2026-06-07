import { AppPageShell } from "@/components/common/app-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function CuratedLoading() {
  return (
    <AppPageShell className="gap-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => `curated-card-${index}`).map((key) => (
          <Skeleton key={key} className="h-64 rounded-[calc(var(--radius)+2px)]" />
        ))}
      </div>
    </AppPageShell>
  );
}
