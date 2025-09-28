import { cookies } from "next/headers";
import type * as React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppInset, AppSidebar } from "@/features/sidebar/components/app-sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Persist collapsed/expanded state between navigations
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <AppInset>
        <main>{children}</main>
      </AppInset>
    </SidebarProvider>
  );
}
