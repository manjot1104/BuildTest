"use client";
import { useState, useRef, useEffect } from "react";

export default function TestPage() {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Pass scroll position into iframe via postMessage
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const progress = container.scrollTop / (container.scrollHeight - container.clientHeight);
      iframeRef.current?.contentWindow?.postMessage(
        { type: "SCROLL", progress },
        "*"
      );
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [html]);

  const generate = async () => {
    setLoading(true);
    setError("");
    setHtml("");

    const userPrompt = `
Create a cinematic, premium Three.js r128 3D website. Output ONLY a complete HTML file — no markdown, no explanation.

=== DESIGN STANDARDS (draftly.space level) ===
- BACKGROUND: Deep, sophisticated charcoal (#0a0a0b) or pure gallery white (#fcfcfc).
- DEPTH: Use FogExp2 for atmospheric perspective. Layer elements with clear z-index hierarchy.
- MATERIALS: MeshPhysicalMaterial for premium glass-morphism (transmission: 1, thickness: 0.5, roughness: 0.05). High metalness (0.9) and low roughness (0.1) for metallic accents.
- SHADOWS: Enable renderer.shadowMap.enabled = true. Use soft shadows for realism.
- TYPOGRAPHY: Elegant, high-contrast serif for headings (e.g., 'Playfair Display') and clean sans-serif for body (e.g., 'Inter').

=== THREE.JS SCENE ===
- CENTERPIECE: An abstract, morphing organic shape (LatheGeometry or custom BufferGeometry) with a glass-like material. It should pulse and rotate subtly.
- LIGHTING: 3-point lighting setup. Key light (warm #fdfcf0), Fill light (cool #e0f2ff), and Rim light (high intensity #ffffff).
- PARTICLES: 2000+ tiny, floating dust motes with varying opacity, drifting slowly.
- INTERACTION: Smooth lerp (0.05) for mouse-follow rotation. Scroll-based camera dolly and element scaling.
- ANIMATION: Use requestAnimationFrame with clock.elapsed for all motion. No harsh transforms.

=== HTML OVERLAY ===
- Layout: Minimalist, spacious, and sophisticated.
- Fixed navigation with glass-morphism header.
- Hero section with staggered fade-in animations.
- Subtle 3D styling for buttons and cards (border-radius: 12px, soft box-shadow, slight hover lift).

=== CODE QUALITY ===
- CDN: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
- Fully responsive resize handler.
- Production-ready, clean JavaScript.
`;

    try {
      const res = await fetch("/api/blackbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      const data = await res.json();

      if (data.error) {
        setError(JSON.stringify(data.error));
        setLoading(false);
        return;
      }

      let output = data?.choices?.[0]?.message?.content || "";
      const finishReason = data?.choices?.[0]?.finish_reason;

      if (finishReason === "length") {
        setError("⚠️ Output was cut off (hit token limit). Try again — Claude may complete it differently.");
      }

      // Strip any accidental markdown fences
      output = output.replace(/^```html\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

      setHtml(output);
    } catch (e) {
      setError("Network error: " + String(e));
    }

    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "sans-serif", background: "#0a0a0a", minHeight: "100vh" }}>
      {/* Control bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)",
        padding: "10px 20px", display: "flex", alignItems: "center", gap: 16,
        borderBottom: "1px solid rgba(255,255,255,0.07)"
      }}>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            background: loading ? "#333" : "linear-gradient(135deg, #00dcff, #7b2fff)",
            color: "#fff", border: "none", borderRadius: 999,
            padding: "10px 28px", fontWeight: 700, fontSize: 14,
            cursor: loading ? "not-allowed" : "pointer", letterSpacing: 1
          }}
        >
          {loading ? "⏳ Generating..." : "✦ Generate 3D Scene"}
        </button>

        {error && (
          <span style={{ color: "#ff6b6b", fontSize: 13, maxWidth: 500 }}>{error}</span>
        )}
        {html && !loading && (
          <span style={{ color: "#00dcff", fontSize: 13 }}>✓ Scene ready — scroll inside to see effect</span>
        )}
      </div>

      {/* Scrollable container that drives the 3D scroll effect */}
      <div
        ref={scrollRef}
        style={{
          marginTop: 52,
          height: "calc(100vh - 52px)",
          overflowY: html ? "scroll" : "hidden",
          position: "relative",
        }}
      >
        {/* Tall scroll space so user can actually scroll */}
        <div style={{ height: "300vh", pointerEvents: "none" }} />

        {/* iframe sits fixed inside this scroll container */}
        {html ? (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            style={{
              position: "fixed",
              top: 52,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "calc(100vh - 52px)",
              border: "none",
              zIndex: 1,
            }}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div style={{
            position: "fixed", top: 52, left: 0, right: 0, bottom: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.2)", fontSize: 16, letterSpacing: 2
          }}>
            {loading ? "GENERATING SCENE..." : "CLICK GENERATE TO START"}
          </div>
        )}
      </div>
    </div>
  );
}