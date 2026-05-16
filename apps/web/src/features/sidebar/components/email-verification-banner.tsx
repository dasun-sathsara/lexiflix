import Link from "next/link";
import { AppPageContainer } from "@/components/common/app-page-shell";

export function EmailVerificationBanner() {
  return (
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
  );
}
