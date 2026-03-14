import type { Metadata } from "next";
import AboutPage from "./about-page-client";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Buildify — the AI-powered app builder making software creation accessible to everyone.",
  openGraph: {
    title: "About Buildify",
    description:
      "Learn about Buildify — the AI-powered app builder making software creation accessible to everyone.",
  },
};

export default function Page() {
  return <AboutPage />;
}
