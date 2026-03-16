import { ImageResponse } from "next/og";
import { env } from "@/env";

export const runtime = "nodejs";

export const alt = "Buildify Studio Design";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

interface DesignData {
  slug: string;
  title: string;
}

async function getDesign(slug: string): Promise<DesignData | null> {
  try {
    const baseUrl = env.NEXT_PUBLIC_APP_URL;
    const res = await fetch(`${baseUrl}/api/design/public/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as DesignData;
  } catch {
    return null;
  }
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const design = await getDesign(username);
  const title = design?.title ?? "Buildify Design";

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
              "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 20px",
            borderRadius: 100,
            border: "1px solid rgba(139,92,246,0.3)",
            background: "rgba(139,92,246,0.1)",
            color: "#a78bfa",
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
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          Buildify Studio
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
          Designed with Buildify Studio
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
