import { AppPageShell } from "@/components/common/app-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function BrowseLoading() {
  return (
    <AppPageShell className="gap-8">
      <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-indigo-500/5 blur-[80px]" />
      <div className="pointer-events-none absolute -right-20 top-1/2 size-72 rounded-full bg-purple-500/5 blur-[80px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-72 rounded-full bg-rose-500/5 blur-[80px]" />

      {/* Zone A Loading */}
      <div className="relative space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-10 w-full md:w-64" />
          <Skeleton className="h-10 w-full md:w-72" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Zone B Loading */}
      <div className="relative grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => `browse-loading-${index}`).map((key) => (
          <div key={key} className="space-y-3">
            <Skeleton className="aspect-[2/3] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </AppPageShell>
  );
}
