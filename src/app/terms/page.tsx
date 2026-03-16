import type { Metadata } from "next";
import TermsPage from "./terms-page-client";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Read the terms and conditions for using Buildify, including our privacy policy and acceptable use guidelines.",
  openGraph: {
    title: "Terms & Conditions | Buildify",
    description:
      "Read the terms and conditions for using Buildify, including our privacy policy and acceptable use guidelines.",
  },
};

export default function Page() {
  return <TermsPage />;
}
