import { Skeleton } from "@/components/ui/skeleton";

export default function PackStagingLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-6">
      <Skeleton className="h-40 rounded-[calc(var(--radius)+2px)]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-[calc(var(--radius)+2px)]" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => `pack-card-${index}`).map((key) => (
              <Skeleton key={key} className="h-24 rounded-[calc(var(--radius)+2px)]" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-56 rounded-[calc(var(--radius)+2px)]" />
          <Skeleton className="h-72 rounded-[calc(var(--radius)+2px)]" />
        </div>
      </div>
    </div>
  );
}
