import { AuthSplitLayout } from "@/features/auth/components/auth-split-layout";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthSplitLayout
      badgeText="Reset Your Password"
      title="Create a fresh password for your account"
      description="Enter a new password and confirm it to regain secure access to your LexiFlix account."
      color="purple"
      useSuspense
    >
      <ResetPasswordForm />
    </AuthSplitLayout>
  );
}
