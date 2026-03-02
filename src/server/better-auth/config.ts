import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";

import { db } from "@/server/db";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
  sendWelcomeEmail,
} from "@/server/services/email.service";

export const auth = betterAuth({
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
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      scope: ['read:user', 'user:email', 'repo'],
    },
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
              } catch (error) {
                console.error("Failed to send welcome email:", error);
              }
            }
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
