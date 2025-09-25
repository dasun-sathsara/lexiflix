import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { SoftGradientBackground } from "@/components/ui/soft-gradient-background";

export default function ForgotPasswordPage() {
  return (
    <SoftGradientBackground>
      <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6">
        <ForgotPasswordForm />
      </main>
    </SoftGradientBackground>
  );
}
