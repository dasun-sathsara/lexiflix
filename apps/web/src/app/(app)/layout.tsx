import { AppPageContainer } from "@/components/common/app-page-shell";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppInset, AppSidebar } from "@/features/sidebar/components/app-sidebar";
import { requireSession } from "@/lib/auth-guards";
import { cookies } from "next/headers";
import Link from "next/link";
import type * as React from "react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  const session = await requireSession();

  const needsEmailVerification =
    "emailVerified" in session.user &&
    typeof session.user.emailVerified === "boolean" &&
    !session.user.emailVerified;

  const user: React.ComponentProps<typeof AppSidebar>["user"] = {
    name: session.user.name,
    email: session.user.email,
    avatar: session.user.image ?? undefined,
    role: session.user.role === "admin" ? "admin" : "learner",
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={user} />
      <AppInset>
        {needsEmailVerification ? (
          <div className="border-b border-amber-300/60 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <AppPageContainer className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 sm:px-6">
              <span>
                Your email is not verified yet. Check your inbox and click the verification link.
              </span>
              <Link
                href="/settings?tab=account"
                className="font-medium underline underline-offset-4 hover:opacity-90"
              >
                Account settings
              </Link>
            </AppPageContainer>
          </div>
        ) : null}
        {children}
      </AppInset>
    </SidebarProvider>
  );
}
