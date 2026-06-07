import { AppPageShell } from "@/components/common/app-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCuratedLoading() {
  return (
    <AppPageShell className="gap-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-12 rounded-[calc(var(--radius)+2px)]" />
      <div className="space-y-1">
        {Array.from({ length: 8 }, (_, index) => `admin-curated-row-${index}`).map((key) => (
          <Skeleton key={key} className="h-16 rounded-xl" />
        ))}
      </div>
    </AppPageShell>
  );
}
