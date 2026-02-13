import nodemailer from "nodemailer";
import { env } from "@/env";
import {
  EMAIL_CONFIG,
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getOTPEmailTemplate,
} from "@/config/email.config";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

const fromEmail = env.FROM_EMAIL ?? EMAIL_CONFIG.fromEmail;

export async function sendVerificationEmail({
  to,
  userName,
  verificationUrl,
}: {
  to: string;
  userName: string;
  verificationUrl: string;
}) {
  const { subject, html } = getVerificationEmailTemplate({
    userName,
    verificationUrl,
  });

  await transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    html,
  });
}

export async function sendPasswordResetEmail({
  to,
  userName,
  resetUrl,
}: {
  to: string;
  userName: string;
  resetUrl: string;
}) {
  const { subject, html } = getPasswordResetEmailTemplate({
    userName,
    resetUrl,
  });

  await transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    html,
  });
}

export async function sendOTPEmail({
  to,
  otp,
}: {
  to: string;
  otp: string;
}) {
  const { subject, html } = getOTPEmailTemplate({ email: to, otp });

  await transporter.sendMail({
    from: fromEmail,
    to,
    subject,
    html,
  });
}
