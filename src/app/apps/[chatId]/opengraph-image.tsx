import { ImageResponse } from "next/og";
import { getChatDemoUrl } from "@/server/db/queries";

export const runtime = "nodejs";

export const alt = "Buildify App";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const chat = await getChatDemoUrl({ v0ChatId: chatId });
  const title = chat?.title ?? "Buildify App";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          position: "relative",
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* App badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: 100,
            border: "1px solid rgba(59,130,246,0.3)",
            background: "rgba(59,130,246,0.1)",
            color: "#60a5fa",
            fontSize: 16,
            marginBottom: 24,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          Built with Buildify
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: title.length > 40 ? 44 : 56,
            fontWeight: 700,
            color: "#f8fafc",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: 0,
            textAlign: "center",
            maxWidth: 900,
            padding: "0 40px",
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 20,
            color: "#64748b",
            margin: 0,
            marginTop: 16,
          }}
        >
          AI-generated application
        </p>

        {/* Bottom branding */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#475569",
            fontSize: 14,
          }}
        >
          <span>buildify.xyz</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
