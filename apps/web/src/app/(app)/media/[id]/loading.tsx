import { AppPageShell } from "@/components/common/app-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function MediaDetailLoading() {
  return (
    <AppPageShell className="gap-6">
      <Skeleton className="h-56 rounded-[calc(var(--radius)+2px)]" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-[calc(var(--radius)+2px)]" />
          <Skeleton className="h-64 rounded-[calc(var(--radius)+2px)]" />
        </div>
        <Skeleton className="h-80 rounded-[calc(var(--radius)+2px)]" />
      </div>
    </AppPageShell>
  );
}
