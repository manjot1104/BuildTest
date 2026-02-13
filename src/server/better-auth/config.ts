import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";

import { db } from "@/server/db";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOTPEmail,
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
});

export type Session = typeof auth.$Infer.Session;
