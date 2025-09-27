import { authClient, signIn, signOut, signUp, useSession } from "@/lib/auth-client";

type ClientActionResult<Action extends (...args: unknown[]) => Promise<unknown>> = Awaited<
  ReturnType<Action>
>;
type ClientActionData<Action extends (...args: unknown[]) => Promise<unknown>> =
  ClientActionResult<Action> extends {
    data: infer Data;
  }
    ? Data
    : ClientActionResult<Action>;

function wrapClientAction<Action extends (...args: unknown[]) => Promise<unknown>>(
  action: Action | undefined,
  errorMessage: string,
) {
  if (!action) {
    return (async (..._args: Parameters<Action>) => {
      throw new Error(errorMessage);
    }) as (...args: Parameters<Action>) => Promise<ClientActionData<Action>>;
  }

  return (async (...args: Parameters<Action>) => {
    const result = (await action(...args)) as ClientActionResult<Action>;

    if (result && typeof result === "object" && "error" in result && result.error) {
      throw result.error;
    }

    if (result && typeof result === "object" && "data" in result) {
      return result.data as ClientActionData<Action>;
    }

    return result as ClientActionData<Action>;
  }) as (...args: Parameters<Action>) => Promise<ClientActionData<Action>>;
}

export const useAuth = useSession;
export const useSignIn = () => signIn;
export const useSignOut = () => signOut;
export const useSignUp = () => signUp;

export const useRequestPasswordReset = () => {
  const requestPasswordReset = wrapClientAction(
    authClient.requestPasswordReset?.bind(authClient),
    "Password reset email is not configured.",
  );

  return { requestPasswordReset };
};

export const useResetPassword = () => {
  const resetPassword = wrapClientAction(
    authClient.resetPassword?.bind(authClient),
    "Password reset is not configured.",
  );

  return { resetPassword };
};

export const useSendVerificationEmail = () => {
  const sendVerificationEmail = wrapClientAction(
    authClient.sendVerificationEmail?.bind(authClient),
    "Email verification is not configured.",
  );

  return { sendVerificationEmail };
};
