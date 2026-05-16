import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { env } from "@/lib/config/env";
import { sendEmailVerificationEmail, sendPasswordResetEmail } from "@/lib/email/sender";
import { deleteObjectByUrl } from "@/lib/integrations/storage/r2";
import { db } from "@/lib/server/db";
import { user as userTable } from "@/lib/server/db/schema";

const baseURL = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const ADMIN_EMAILS = new Set(["dasunx.pm@gmail.com"]);
const DISABLED_ACCOUNT_MESSAGE =
  "This account has been disabled. Contact an administrator for help.";

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

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  databaseHooks: {
    session: {
      create: {
        async before(session) {
          const account = await db.query.user.findFirst({
            columns: { banned: true },
            where: eq(userTable.id, session.userId),
          });

          if (account?.banned) {
            throw new APIError("FORBIDDEN", { message: DISABLED_ACCOUNT_MESSAGE });
          }
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-out") {
        return;
      }

      const currentSession = await getSessionFromCtx(ctx);
      if (!currentSession) {
        return;
      }

      const account = await db.query.user.findFirst({
        columns: { banned: true },
        where: eq(userTable.id, currentSession.user.id),
      });

      if (account?.banned) {
        throw new APIError("FORBIDDEN", { message: DISABLED_ACCOUNT_MESSAGE });
      }
    }),
  },
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
      const resetUrl = `${baseURL}/auth/reset-password?token=${token}`;

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
      const verificationUrl = `${baseURL}/auth/verify-email?token=${token}`;

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
      banned: {
        type: "boolean",
        input: false,
        defaultValue: false,
      },
      banReason: {
        type: "string",
        input: false,
        required: false,
      },
      banExpires: {
        type: "date",
        input: false,
        required: false,
      },
      generationLimit: {
        type: "number",
        input: false,
        required: false,
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
