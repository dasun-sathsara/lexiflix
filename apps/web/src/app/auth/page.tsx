import { AuthSplitLayout, LOGIN_BENEFITS } from "@/features/auth/components/auth-split-layout";
import { AuthTabs } from "@/features/auth/components/auth-tabs";

export default function AuthPage() {
  return (
    <AuthSplitLayout
      badgeText="LexiFlix Learner Login"
      title="Sign in to unlock smarter subtitle study sessions"
      description="Continue pre-learning vocabulary tailored to the stories you plan to watch. Your dashboard awaits with personalized packs, spaced review goals, and more."
      benefits={LOGIN_BENEFITS}
      color="indigo"
      useSuspense
    >
      <AuthTabs className="w-full max-w-md lg:ml-auto" />
    </AuthSplitLayout>
  );
}
