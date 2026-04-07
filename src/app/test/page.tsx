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
Create a cinematic Three.js r128 hero section. Output ONLY a complete HTML file — no markdown, no explanation.

=== THREE.JS SCENE (mandatory) ===
- Black/near-black background (#05050f)
- CENTERPIECE: A smooth icosahedron (radius 4, detail 4) with MeshStandardMaterial, metalness 0.9, roughness 0.1, color #1a1a3e, with a slow Y-axis rotation
- WIREFRAME SHELL: Same icosahedron shape but larger (radius 4.5) with wireframe MeshBasicMaterial, color #00dcff, opacity 0.15, transparent
- ORBITING RINGS: 3 torus rings at different angles (rx: 0, 1.2, 0.6), radius 7–9, tube 0.03, color #00dcff/#7b2fff/#ff2d95, each rotating at different speeds
- PARTICLES: 5000 points in a sphere distribution (radius 40), vertex colors cycling cyan/purple/pink, PointsMaterial size 0.12, additive blending
- FLOATING SHARDS: 12 small tetrahedrons scattered around center, each drifting in a slow sin() orbit path
- LIGHTS: AmbientLight #111133. PointLight cyan #00dcff intensity 4 at (15,15,15). PointLight purple #7b2fff intensity 4 at (-15,-10,15). Both lights pulse using sin(clock.elapsed)
- MOUSE: On mousemove, lerp scene.rotation.x toward (mouseY * 0.0008) and scene.rotation.y toward (mouseX * 0.0008)
- SCROLL: Listen for postMessage {type:"SCROLL", progress:0–1}. On scroll, move camera.position.z from 28 down to 18, and tilt scene.rotation.x up by progress * 0.4. Also scale the centerpiece from 1.0 down to 0.7 as progress goes 0→1.
- Fog: FogExp2 #05050f density 0.018
- Resize handler updating camera aspect + renderer size

=== HTML OVERLAY ===
- position fixed, z-index 10, pointer-events none (buttons get pointer-events: all)
- Font: use Google Fonts — 'Space Grotesk' for headings, 'Inter' for body
- Top navbar: logo left ("NX"), nav links right (About, Work, Contact) — small caps, letter-spacing
- Center hero:
  - Eyebrow: "NEXT GENERATION PLATFORM" in cyan, letter-spacing 6px, 11px
  - H1: "Build Beyond" white, then "Imagination" with CSS gradient (linear-gradient 135deg, #00dcff, #7b2fff, #ff2d95), font-size clamp(3rem, 8vw, 7rem), font-weight 900
  - Subtext: one line, max-width 480px, rgba white 0.6
  - Two buttons: primary (gradient background, border-radius 999px, padding 14px 40px) and secondary (transparent, border 1px solid rgba(0,220,255,0.4), same shape)
  - All elements fade in with staggered animation-delay using @keyframes fadeUp

=== SCROLL CONTAINER ===
- The OUTER page div must have height: 300vh and overflow-y: scroll
- The canvas and overlay are position: fixed (they stay in view)
- This lets the user scroll to trigger the scroll effect

=== CODE QUALITY ===
- Three.js CDN: https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
- requestAnimationFrame loop, clock.getElapsedTime() for all animations
- Complete closing tags, complete </script>, complete </html>
- NO external images, everything inline
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