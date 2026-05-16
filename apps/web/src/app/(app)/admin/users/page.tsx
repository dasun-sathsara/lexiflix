import type { Metadata } from "next";
import { AdminUsersWorkspace } from "@/features/admin-users/components/admin-users-workspace";
import { getAdminUsersView } from "@/features/admin-users/server/queries";
import { parseAdminUsersSearchParams } from "@/features/admin-users/utils";
import { AppTopbar } from "@/features/sidebar/components/app-sidebar";
import { requireAdmin } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "User Admin — LexiFlix",
  description: "Internal user access and generation management workspace.",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const adminSession = await requireAdmin();
  const queryState = parseAdminUsersSearchParams(await searchParams);
  const viewData = await getAdminUsersView(queryState);

  return (
    <>
      <AppTopbar title="User Admin" />
      <AdminUsersWorkspace
        queryState={{ ...queryState, page: viewData.pagination.page }}
        currentAdminId={adminSession.user.id}
        {...viewData}
      />
    </>
  );
}
