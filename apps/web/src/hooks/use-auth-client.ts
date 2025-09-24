import { signIn, signOut, signUp, useSession, authClient } from "@/lib/auth-client";

type PasswordActions = typeof authClient extends { password: infer Password }
  ? Password
  : Record<string, never>;

type SendResetEmailFn = PasswordActions extends { sendResetEmail: infer Fn }
  ? Fn
  : (...args: unknown[]) => Promise<unknown>;

type ResetPasswordFn = PasswordActions extends { reset: infer Fn }
  ? Fn
  : (...args: unknown[]) => Promise<unknown>;

function getPasswordActions(): Partial<PasswordActions> {
  return (authClient as { password?: PasswordActions }).password ?? {};
}

export const useAuth = useSession;
export const useSignIn = () => signIn;
export const useSignOut = () => signOut;
export const useSignUp = () => signUp;
export const useRequestPasswordReset = () => {
  const { sendResetEmail } = getPasswordActions();

  const handler = ((...args: unknown[]) => {
    if (!sendResetEmail) {
      return Promise.reject(new Error("Password reset email is not configured."));
    }

    return (sendResetEmail as (...fnArgs: unknown[]) => Promise<unknown>)(...args);
  }) as unknown as SendResetEmailFn;

  return { requestPasswordReset: handler };
};

export const useResetPassword = () => {
  const { reset } = getPasswordActions();

  const handler = ((...args: unknown[]) => {
    if (!reset) {
      return Promise.reject(new Error("Password reset is not configured."));
    }

    return (reset as (...fnArgs: unknown[]) => Promise<unknown>)(...args);
  }) as unknown as ResetPasswordFn;

  return { resetPassword: handler };
};
