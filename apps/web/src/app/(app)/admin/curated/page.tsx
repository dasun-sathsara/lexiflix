import type { Metadata } from "next";
import { AdminCuratedWorkspace } from "@/features/curation/components/admin-curated-workspace";
import { getCuratedAdminView } from "@/features/curation/server/queries";
import {
  parseCuratedAdminCatalogFilter,
  parseCuratedAdminSearchParams,
} from "@/features/curation/utils";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireAdmin } from "@/lib/auth-guards";

export const metadata: Metadata = {
  title: "Curated Admin — LexiFlix",
  description: "Internal content operations workspace for managing the curated catalog.",
};

export default async function AdminCuratedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const queryState = parseCuratedAdminSearchParams(params);
  const catalogFilter = parseCuratedAdminCatalogFilter(params);
  const viewData = await getCuratedAdminView({ queryState, catalogFilter });

  return (
    <>
      <AppTopbar title="Curated Admin" />
      <AdminCuratedWorkspace queryState={queryState} catalogFilter={catalogFilter} {...viewData} />
    </>
  );
}
