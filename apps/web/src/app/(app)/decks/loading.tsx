import { AppPageShell } from "@/components/common/app-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function DecksLoading() {
  return (
    <AppPageShell className="gap-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => `decks-loading-${index}`).map((key) => (
          <div
            key={key}
            className="flex items-center gap-4 rounded-[calc(var(--radius)+2px)] border bg-card/70 p-4"
          >
            <Skeleton className="h-[88px] w-[60px] shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-20 rounded-xl" />
                <Skeleton className="h-6 w-20 rounded-xl" />
              </div>
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </AppPageShell>
  );
}
