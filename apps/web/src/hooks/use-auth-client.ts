"use client";

import { useMemo } from "react";

type EmailSignInPayload = {
  email: string;
  password: string;
  remember?: boolean;
};

type SocialSignInPayload = {
  provider: string;
};

type EmailSignUpPayload = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  image?: File | null;
};

type AuthClient = {
  signIn: {
    email: (payload: EmailSignInPayload) => Promise<void>;
    social: (payload: SocialSignInPayload) => Promise<void>;
  };
  signUp: {
    email: (payload: EmailSignUpPayload) => Promise<void>;
  };
  password: {
    sendResetEmail: (payload: { email: string }) => Promise<void>;
  };
};

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function useAuthClient(): AuthClient {
  return useMemo(() => {
    const client: AuthClient = {
      signIn: {
        async email(payload) {
          console.info("[auth] signIn.email called", payload);
          await delay(800);
        },
        async social(payload) {
          console.info("[auth] signIn.social called", payload);
          await delay(600);
        },
      },
      signUp: {
        async email(payload) {
          console.info("[auth] signUp.email called", payload);
          await delay(1000);
        },
      },
      password: {
        async sendResetEmail(payload) {
          console.info("[auth] password.sendResetEmail called", payload);
          await delay(700);
        },
      },
    };

    return client;
  }, []);
}

export type { EmailSignInPayload, EmailSignUpPayload };
