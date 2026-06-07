import { AppPageShell } from "@/components/common/app-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <AppPageShell className="gap-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-96" />
      </div>
      <Skeleton className="h-9 w-64 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-72 rounded-[calc(var(--radius)+2px)]" />
        <Skeleton className="h-72 rounded-[calc(var(--radius)+2px)]" />
      </div>
    </AppPageShell>
  );
}
