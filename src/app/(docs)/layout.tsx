import type { Metadata } from "next";
import DocsLayoutClient from "./docs-layout-client";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Learn how to build apps with Buildify. Guides, tutorials, and API references.",
  openGraph: {
    title: "Documentation | Buildify",
    description:
      "Learn how to build apps with Buildify. Guides, tutorials, and API references.",
  },
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocsLayoutClient>{children}</DocsLayoutClient>;
}
