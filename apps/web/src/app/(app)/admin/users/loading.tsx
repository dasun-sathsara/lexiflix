import { AppPageShell } from "@/components/common/app-page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersLoading() {
  return (
    <AppPageShell className="gap-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-14 rounded-[calc(var(--radius)+2px)]" />
      <div className="space-y-1">
        {Array.from({ length: 8 }, (_, index) => `admin-user-${index}`).map((key) => (
          <Skeleton key={key} className="h-16 rounded-xl" />
        ))}
      </div>
    </AppPageShell>
  );
}
