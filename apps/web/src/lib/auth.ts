import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { sendEmailVerificationEmail, sendPasswordResetEmail } from "./email";
import { env } from "./env";
import { db } from "./server/db";
import { deleteObjectByUrl } from "./storage/r2";

const baseURL = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ADMIN_EMAILS = new Set(["dasunx.pm@gmail.com"]);

const trustedOrigins = (() => {
  const origins = new Set<string>(["http://localhost:3000", baseURL]);

  try {
    const url = new URL(baseURL);

    if (!url.hostname.startsWith("www.")) {
      origins.add(`${url.protocol}//www.${url.host}`);
    }
  } catch {
    // Ignore malformed URLs here; env validation already handles the public URL shape.
  }

  return [...origins];
})();

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export function getRoleForEmail(email: string | null | undefined) {
  return isAdminEmail(email) ? "admin" : "learner";
}

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  plugins: [nextCookies()],
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, token }) {
      const resetUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`;

      await sendPasswordResetEmail({
        email: user.email,
        userName: user.name,
        resetUrl,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationOnSignUp: true,
    async sendVerificationEmail({ user, token }) {
      const verificationUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`;

      await sendEmailVerificationEmail({
        email: user.email,
        userName: user.name,
        verificationUrl,
      });
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        input: false,
      },
    },
    deleteUser: {
      enabled: true,
      async afterDelete(user) {
        await deleteObjectByUrl(user.image ?? undefined);
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
