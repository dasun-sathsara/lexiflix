import { render } from "@react-email/render";
import { Resend } from "resend";
import { ResetPassword } from "./email/templates/reset-password";
import { VerifyEmail } from "./email/templates/verify-email";
import { env } from "./env";

const resend = new Resend(env.RESEND_API_KEY);

interface SendEmailVerificationParams {
  email: string;
  userName: string;
  verificationUrl: string;
}

export async function sendEmailVerificationEmail({
  email,
  userName,
  verificationUrl,
}: SendEmailVerificationParams) {
  try {
    // In development, always send to test email
    const recipientEmail = env.NEXT_PUBLIC_ENV === "development" ? "dasunx.pm@gmail.com" : email;

    if (env.NEXT_PUBLIC_ENV === "development" && email !== recipientEmail) {
      console.log(`[DEV MODE] Redirecting verification email from ${email} to ${recipientEmail}`);
    }

    const emailHtml = await render(
      VerifyEmail({
        userName,
        verificationUrl,
      }),
    );

    const { data, error } = await resend.emails.send({
      from: "Lexiflix <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: "Verify your email address",
      html: emailHtml,
    });

    if (error) {
      console.error("Failed to send verification email:", error);
      throw new Error("Failed to send verification email");
    }

    console.log("Verification email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}

interface SendPasswordResetParams {
  email: string;
  userName: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  email,
  userName,
  resetUrl,
}: SendPasswordResetParams) {
  try {
    // In development, always send to test email
    const recipientEmail = env.NEXT_PUBLIC_ENV === "development" ? "dasunx.pm@gmail.com" : email;

    if (env.NEXT_PUBLIC_ENV === "development" && email !== recipientEmail) {
      console.log(`[DEV MODE] Redirecting password reset email from ${email} to ${recipientEmail}`);
    }

    const emailHtml = await render(
      ResetPassword({
        userName,
        resetUrl,
      }),
    );

    const { data, error } = await resend.emails.send({
      from: "Lexiflix <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: "Reset your password",
      html: emailHtml,
    });

    if (error) {
      console.error("Failed to send password reset email:", error);
      throw new Error("Failed to send password reset email");
    }

    console.log("Password reset email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw error;
  }
}
