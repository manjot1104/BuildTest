import { RootProvider } from "@/providers/root-provider";
import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://buildify.xyz",
  ),
  title: {
    default: "Buildify - AI Powered App Builder",
    template: "%s | Buildify",
  },
  description:
    "Build apps with AI. Describe what you want and get production-ready code in seconds. Chat-based interface, live preview, and one-click deploy.",
  icons: [
    { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
    { rel: "icon", url: "/favicon.ico" },
  ],
  openGraph: {
    type: "website",
    siteName: "Buildify",
    title: "Buildify - AI Powered App Builder",
    description:
      "Build apps with AI. Describe what you want and get production-ready code in seconds. Chat-based interface, live preview, and one-click deploy.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buildify - AI Powered App Builder",
    description:
      "Build apps with AI. Describe what you want and get production-ready code in seconds.",
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8347098851451693"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body>
  <RootProvider>
    {children}
   
  </RootProvider>
</body>
    </html>
  );
}
