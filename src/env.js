import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Core
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL"),
    BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
    BETTER_AUTH_URL: z.string().url().optional(),

    // V0 SDK
    V0_API_KEY: z.string().min(1, "V0_API_KEY is required"),
    V0_API_URL: z.string().url().optional(),

    // OpenRouter (AI features)
    OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),

    // SMTP (Nodemailer)
    SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
    SMTP_PORT: z.coerce.number().default(587),
    SMTP_USER: z.string().min(1, "SMTP_USER is required"),
    SMTP_PASS: z.string().min(1, "SMTP_PASS is required"),
    FROM_EMAIL: z.string().min(1).optional(),

    // Razorpay
    RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
    RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
    RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),

    // GitHub OAuth
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

    // Daytona Sandbox (optional feature)
    DAYTONA_API_KEY: z.string().min(1).optional(),
    DAYTONA_API_URL: z.string().url().optional(),
    DAYTONA_TARGET: z.string().optional(),

    // ElevenLabs (optional feature)
    ELEVENLABS_API_KEY: z.string().min(1).optional(),

    // AWS S3 (optional — screenshots are non-critical)
    AWS_S3_BUCKET: z.string().min(1).optional(),
    AWS_S3_REGION: z.string().min(1).optional(),
    AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),

    // TINYFISH
    TINYFISH_API_KEY: z.string().min(1).optional(),
  },

  client: {
    NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
    NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1, "NEXT_PUBLIC_RAZORPAY_KEY_ID is required"),
  },

  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    V0_API_KEY: process.env.V0_API_KEY,
    V0_API_URL: process.env.V0_API_URL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    FROM_EMAIL: process.env.FROM_EMAIL,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    DAYTONA_API_KEY: process.env.DAYTONA_API_KEY,
    DAYTONA_API_URL: process.env.DAYTONA_API_URL,
    DAYTONA_TARGET: process.env.DAYTONA_TARGET,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
    AWS_S3_REGION: process.env.AWS_S3_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    TINYFISH_API_KEY: process.env.TINYFISH_API_KEY,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
