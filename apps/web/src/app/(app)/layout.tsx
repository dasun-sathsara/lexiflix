import { SidebarProvider } from "@/components/ui/sidebar";
import { AppInset, AppSidebar } from "@/features/sidebar/components/app-sidebar";
import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import Link from "next/link";
import { unauthorized } from "next/navigation";
import type * as React from "react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return unauthorized();
  }

  const needsEmailVerification =
    "emailVerified" in session.user &&
    typeof session.user.emailVerified === "boolean" &&
    !session.user.emailVerified;

  const user = {
    name: session.user.name,
    email: session.user.email,
    avatar: session.user.image ?? undefined,
  };

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={user} />
      <AppInset>
        {needsEmailVerification ? (
          <div className="border-b border-amber-300/60 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
            <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
              <span>
                Your email is not verified yet. Check your inbox and click the verification link.
              </span>
              <Link
                href="/settings?tab=account"
                className="font-medium underline underline-offset-4 hover:opacity-90"
              >
                Account settings
              </Link>
            </div>
          </div>
        ) : null}
        {children}
      </AppInset>
    </SidebarProvider>
  );
}
