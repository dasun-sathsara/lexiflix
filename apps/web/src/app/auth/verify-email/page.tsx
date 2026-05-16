import { AuthSplitLayout } from "@/features/auth/components/auth-split-layout";
import { VerifyEmailForm } from "@/features/auth/components/verify-email-form";

const VERIFY_EMAIL_BENEFITS = [
  {
    title: "Secure access",
    description: "Email verification helps protect your account and personal learning data.",
  },
  {
    title: "Quick setup",
    description: "Once verified, you'll have instant access to all LexiFlix features.",
  },
];

export default function VerifyEmailPage() {
  return (
    <AuthSplitLayout
      badgeText="Email Verification"
      title="Verify your email to get started"
      description="We're confirming your email address to ensure the security of your account. This will only take a moment."
      benefits={VERIFY_EMAIL_BENEFITS}
      color="emerald"
      useSuspense
    >
      <VerifyEmailForm />
    </AuthSplitLayout>
  );
}
