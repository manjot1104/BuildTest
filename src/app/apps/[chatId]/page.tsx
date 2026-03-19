import type { Metadata } from "next";
import { getChatDemoUrl } from "@/server/db/queries";
import AppPageClient from "./app-page-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chatId: string }>;
}): Promise<Metadata> {
  const { chatId } = await params;

  const chat = await getChatDemoUrl({ v0ChatId: chatId });
  const title = chat?.title ?? "Buildify App";

  return {
    title,
    description: `Check out "${title}" — built with Buildify, the AI-powered app builder.`,
    openGraph: {
      title: `${title} | Buildify`,
      description: `Check out "${title}" — built with Buildify, the AI-powered app builder.`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Buildify`,
      description: `Check out "${title}" — built with Buildify, the AI-powered app builder.`,
    },
  };
}

export default function AppPage() {
  return <AppPageClient />;
}
