import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";

import { db } from "@/server/db";
import { env } from "@/env";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
  sendWelcomeEmail,
} from "@/server/services/email.service";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetUrl: url,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        to: user.email,
        userName: user.name,
        verificationUrl: url,
      });
    },
  },
  socialProviders: {
    ...(env.GITHUB_CLIENT_ID &&
      env.GITHUB_CLIENT_SECRET && {
        github: {
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          scope: ["read:user", "user:email", "repo"],
        },
      }),
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      disableSignUp: false,
      async sendVerificationOTP({ email, otp }) {
        await sendOTPEmail({ to: email, otp });
      },
    }),
  ],
  databaseHooks: {
    user: {
      update: {
        after: async (user) => {
          // Send welcome email when email gets verified for the first time
          // emailVerified is set to a Date when verification succeeds
          if (user.emailVerified) {
            const verifiedAt = new Date(user.emailVerified as unknown as string)
            const now = new Date()
            const diffMs = now.getTime() - verifiedAt.getTime()
            // Only send if verification happened within the last 2 minutes
            // This prevents re-sending on subsequent profile updates
            if (diffMs < 2 * 60 * 1000) {
              try {
                await sendWelcomeEmail({
                  to: user.email,
                  userName: user.name ?? user.email.split("@")[0] ?? "there",
                });
              } catch {
                // Welcome email failed - non-critical, user is already verified
              }
            }
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
