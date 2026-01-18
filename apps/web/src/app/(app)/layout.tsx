import { cookies, headers } from "next/headers";
import { unauthorized } from "next/navigation";
import type * as React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppInset, AppSidebar } from "@/features/sidebar/components/app-sidebar";
import { auth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return unauthorized();
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    avatar: session.user.image ?? undefined,
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={user} />
      <AppInset>{children}</AppInset>
    </SidebarProvider>
  );
}
