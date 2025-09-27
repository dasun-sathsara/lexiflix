import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { SoftGradientBackground } from "@/components/ui/soft-gradient-background";

export default function ResetPasswordPage() {
  return (
    <SoftGradientBackground>
      <main className="flex min-h-screen items-center px-6">
        <ResetPasswordForm className="mx-auto" />
      </main>
    </SoftGradientBackground>
  );
}
