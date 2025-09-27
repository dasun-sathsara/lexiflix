import { cookies } from "next/headers";
import type * as React from "react";
import { AppInset, AppSidebar, AppTopbar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Persist collapsed/expanded state between navigations
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <AppInset>
        <AppTopbar title="Dashboard" />
        <main className="p-6">{children}</main>
      </AppInset>
    </SidebarProvider>
  );
}
