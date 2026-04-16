"use client";

// src/app/video-download/page.tsx
// Opened in a new tab when the user clicks "Export MP4".
// Reads videoJson from sessionStorage (key: "video-download-payload"),
// renders it with @remotion/web-renderer, and auto-starts the download.

import { useEffect, useRef, useState } from "react";
import {
  Download, CheckCircle2, AlertTriangle, AlertCircle,
  Film, Loader2, RotateCcw,
} from "lucide-react";
import type { VideoJson } from "@/remotion-src/types";

type Phase =
  | "loading"      // reading payload from sessionStorage
  | "rendering"    // renderMediaOnWeb in progress
  | "done"         // blob downloaded
  | "error";       // something went wrong

export default function VideoDownloadPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function run() {
      try {
        // ── 1. Read payload ──────────────────────────────────────────────
        const raw = sessionStorage.getItem("video-download-payload");
        if (!raw) throw new Error("No video payload found. Please go back and try again.");

        const { videoJson } = JSON.parse(raw) as { videoJson: VideoJson };
        if (!videoJson) throw new Error("Invalid video payload.");

        setPhase("rendering");

        // ── 2. Dynamically import the renderer (heavy, WebCodecs-based) ──
        const { renderMediaOnWeb, canRenderMediaOnWeb } = await import(
          "@remotion/web-renderer"
        );
        const { VideoComposition } = await import(
          "@/remotion-src/VideoComposition"
        );

        const width = (videoJson.width as number) ?? 1280;
        const height = (videoJson.height as number) ?? 720;
        const fps = (videoJson.fps as number) ?? 30;
        const durationInFrames = videoJson.duration as number;

        // ── 3. Check browser WebCodecs support ───────────────────────────
        const compat = await canRenderMediaOnWeb({ width, height, container: "mp4" });
        if (!compat.canRender) {
          throw new Error(
            "Your browser does not support client-side video rendering. " +
            "Please use Chrome 94+, Firefox 130+, or Safari 26+.",
          );
        }

        // ── 4. Render ────────────────────────────────────────────────────
        const { getBlob } = await renderMediaOnWeb({
          composition: {
            id: "VideoComposition",
            component: VideoComposition,
            durationInFrames,
            fps,
            width,
            height,
            defaultProps: { videoJson },
            calculateMetadata: null,
          },
          inputProps: { videoJson },
          onProgress: ({ progress: p }) => setProgress(p),
        });

        // ── 5. Download ──────────────────────────────────────────────────
        const blob = await getBlob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "generated-video.mp4";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);

        setPhase("done");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
        setPhase("error");
      }
    }

    void run();
  }, []);

  const pct = Math.round(progress * 100);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Film className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-sans font-semibold text-foreground">Video Export</p>
            <p className="text-[11px] font-mono text-muted-foreground/60">
              Client-side render · no server required
            </p>
          </div>
        </div>

        {/* ── Loading ── */}
        {phase === "loading" && (
          <div className="rounded-xl border border-border bg-muted/20 p-6 flex items-center gap-4">
            <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
            <p className="text-sm font-mono text-muted-foreground">Reading video data…</p>
          </div>
        )}

        {/* ── Rendering ── */}
        {phase === "rendering" && (
          <div className="rounded-xl border border-border bg-muted/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-sans font-semibold text-foreground">Rendering…</p>
              <span className="text-sm font-mono text-primary font-bold tabular-nums">{pct}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono text-amber-500/80 leading-relaxed">
                <strong className="text-amber-500">Do not close this tab</strong> until the export
                finishes. Closing it will cancel the render.
              </p>
            </div>
          </div>
        )}

        {/* ── Done ── */}
        {phase === "done" && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-sans font-semibold text-foreground">Export complete!</p>
                <p className="text-[11px] font-mono text-muted-foreground/60">
                  Your MP4 has been saved to your downloads folder.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.close()}
              className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-sans font-bold hover:bg-primary/90 transition-all"
            >
              Close tab
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {phase === "error" && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-sans font-semibold text-foreground">Export failed</p>
                <p className="text-[11px] font-mono text-red-500/80 leading-relaxed mt-1">
                  {errorMsg}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setPhase("loading"); setProgress(0); setErrorMsg(""); started.current = false; }}
              className="w-full h-9 rounded-xl border border-border bg-muted/20 text-xs font-mono text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Try again
            </button>
          </div>
        )}

        {/* ── Browser note ── */}
        <p className="text-[10px] font-mono text-muted-foreground/40 text-center leading-relaxed">
          Requires Chrome 94+, Firefox 130+, or Safari 26+ · Powered by WebCodecs
        </p>
      </div>
    </div>
  );
}