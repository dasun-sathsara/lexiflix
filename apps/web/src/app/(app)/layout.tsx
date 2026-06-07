import { cookies } from "next/headers";
import type * as React from "react";
import { NavigationProgressProvider } from "@/components/common/navigation-progress";
import { RouteProgressBar } from "@/components/common/route-progress-bar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getStudyPlanForUser } from "@/features/packs/server/study-plan";
import { AppInset, AppSidebar } from "@/features/sidebar/components/app-sidebar";
import { EmailVerificationBanner } from "@/features/sidebar/components/email-verification-banner";
import { mapToSidebarUser } from "@/features/sidebar/lib/user-view";
import { requireSession } from "@/lib/auth/guards";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  const session = await requireSession();
  const studyPlan = await getStudyPlanForUser({ userId: session.user.id });

  const needsEmailVerification =
    "emailVerified" in session.user &&
    typeof session.user.emailVerified === "boolean" &&
    !session.user.emailVerified;

  const sidebarUser = mapToSidebarUser(session.user);

  return (
    <NavigationProgressProvider>
      <RouteProgressBar />
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar user={sidebarUser} dueCount={studyPlan.dueNow} />
        <AppInset>
          {needsEmailVerification && <EmailVerificationBanner />}
          {children}
        </AppInset>
      </SidebarProvider>
    </NavigationProgressProvider>
  );
}
