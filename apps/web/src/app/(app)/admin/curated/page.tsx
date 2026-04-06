import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireAdmin } from "@/lib/auth-guards";

export default async function AdminCuratedPage() {
  await requireAdmin();

  return (
    <>
      <AppTopbar title="Curated Admin" />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Badge className="border border-amber-300/70 bg-amber-500/15 text-amber-900 dark:border-amber-500/30 dark:text-amber-100">
            Admin
          </Badge>
          <p className="text-sm text-muted-foreground">
            Admin access is active. Curated catalog management lands here in the next phase.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Curated Catalog Admin</CardTitle>
            <CardDescription>
              Phase 1 only establishes access control and shell visibility. Search, filtering, and
              curation actions are the next implementation step.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The route is already guarded server-side, so non-admin users will be redirected to the
            forbidden page instead of discovering admin tooling through client-side hiding alone.
          </CardContent>
        </Card>
      </div>
    </>
  );
}
