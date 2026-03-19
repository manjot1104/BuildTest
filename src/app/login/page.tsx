import type { Metadata } from "next";
import LoginFormClient from "./login-form-client";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Buildify to start building apps with AI.",
  openGraph: {
    title: "Sign In | Buildify",
    description: "Sign in to Buildify to start building apps with AI.",
  },
};

export default async function LoginPage() {
    return <LoginFormClient />;
}
