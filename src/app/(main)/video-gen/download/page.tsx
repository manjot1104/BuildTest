"use client";

// src/app/video-gen/download/page.tsx
// Opened in a new tab when the user clicks "Export MP4".
// Reads videoJson + exportMode from localStorage (key: "video-download-payload").
//
// exportMode = "client" → renderMediaOnWeb (WebCodecs, browser-side, free, adaptive CPU)
// exportMode = "server" → POST /api/remotion-video/render → poll GET until done → download

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Download, CheckCircle2, AlertTriangle, AlertCircle,
  Film, Loader2, RotateCcw, Monitor, Server, Info,
  Cpu, Wifi, Clock, RefreshCw,
} from "lucide-react";
import type { VideoJson } from "@/remotion-src/types";
import { deproxyS3Urls } from '@/client-api/query-hooks/use-video-hooks'

type Phase =
  | "choose"      // user picks client vs server render
  | "loading"     // reading payload from localStorage
  | "rendering"   // renderMediaOnWeb in progress (client) or polling (server)
  | "done"        // blob downloaded / server URL ready
  | "error";      // something went wrong

type ExportMode = "client" | "server";

interface ServerRenderUsage {
  usedToday: number;
  dailyLimit: number;
  remaining: number;
  planId: string;
  resetsAt: string;
}

// ─── DeviceCapabilityHint ─────────────────────────────────────────────────────
// Heuristic to suggest the best export mode to the user.
// NOT used to restrict — just to pre-select and show a tip.

function estimateDeviceCapability(): "high" | "mid" | "low" {
  const nav = navigator as any;

  // Logical CPU count (not available in all browsers)
  const cores = nav.hardwareConcurrency ?? 4;

  // Device memory in GiB (Chrome-only, degrades gracefully)
  const memGiB = nav.deviceMemory ?? 4;

  // Connection type (Network Information API, Chrome-only)
  const connType: string = nav.connection?.effectiveType ?? "4g";
  const slowNet = connType === "slow-2g" || connType === "2g" || connType === "3g";

  if (cores >= 8 && memGiB >= 8 && !slowNet) return "high";
  if (cores >= 4 && memGiB >= 4) return "mid";
  return "low";
}

// ─── AdaptiveClientRenderer ───────────────────────────────────────────────────
// Wraps renderMediaOnWeb with a concurrency hint so low-end devices don't
// saturate all CPU cores and cause the tab to freeze or stall at a percent.
// Remotion's web renderer respects the `numberOfGifLoops` / internal worker
// pool. We pass a `logLevel` to reduce overhead on weaker hardware.

async function runAdaptiveClientRender(
  videoJson: VideoJson,
  onProgress: (p: number) => void,
): Promise<Blob> {
  const { renderMediaOnWeb, canRenderMediaOnWeb } = await import(
    "@remotion/web-renderer"
  );
  const { VideoComposition } = await import("@/remotion-src/VideoComposition");

  const width = (videoJson.width as number) ?? 1280;
  const height = (videoJson.height as number) ?? 720;
  const fps = (videoJson.fps as number) ?? 30;
  const durationInFrames = videoJson.duration as number;

  const compat = await canRenderMediaOnWeb({ width, height, container: "mp4" });
  if (!compat.canRender) {
    throw new Error(
      "Your browser does not support client-side video rendering. " +
      "Please use Chrome 94+, Firefox 130+, or Safari 26+, or use Server render instead.",
    );
  }

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
    onProgress: ({ progress: p }) => onProgress(p),
    logLevel: "error",
  });

  return getBlob();
}

// ─── ServerRenderer ───────────────────────────────────────────────────────────

interface ServerRenderPayload {
  chatId: string;
  videoJson: VideoJson;
}

async function startServerRender(payload: ServerRenderPayload): Promise<string> {
  const res = await fetch("/api/remotion-video/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || "error" in data) {
    throw new Error(data?.error ?? "Failed to start server render");
  }
  return data.jobId as string;
}

type RenderStatus = "pending" | "rendering" | "done" | "failed";

interface PollResult {
  jobId: string;
  renderStatus: RenderStatus;
  progress: number;
  outputUrl?: string;
  renderError?: string;
}

async function pollRenderStatus(jobId: string): Promise<PollResult> {
  const res = await fetch(`/api/remotion-video/render?jobId=${encodeURIComponent(jobId)}`);
  const data = await res.json();
  if (!res.ok || "error" in data) {
    throw new Error(data?.error ?? "Failed to poll render status");
  }
  return data as PollResult;
}

async function fetchServerRenderUsage(): Promise<ServerRenderUsage | null> {
  try {
    const res = await fetch("/api/remotion-video/render-usage");
    if (!res.ok) return null;
    const data = await res.json();
    if ("error" in data) return null;
    return data as ServerRenderUsage;
  } catch {
    return null;
  }
}

// ─── UsagePips ────────────────────────────────────────────────────────────────
// Visual pip indicators showing used vs. remaining server renders.

function UsagePips({ used, total }: { used: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 w-4 rounded-full transition-colors ${
            i < used
              ? "bg-amber-500/60"
              : "bg-emerald-500/60"
          }`}
        />
      ))}
    </div>
  );
}

// ─── ModeCard ─────────────────────────────────────────────────────────────────

function ModeCard({
  mode,
  selected,
  recommended,
  disabled,
  onSelect,
  icon: Icon,
  title,
  description,
  badges,
  warning,
  footer,
}: {
  mode: ExportMode;
  selected: boolean;
  recommended?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
  badges: { label: string; color: "green" | "blue" | "amber" | "red" }[];
  warning?: string;
  footer?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onSelect}
      disabled={disabled}
      className={`w-full text-left rounded-xl border p-4 transition-all space-y-3 ${
        disabled
          ? "border-border bg-muted/10 opacity-50 cursor-not-allowed"
          : selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
            disabled
              ? "bg-muted border border-border"
              : selected
              ? "bg-primary/10 border border-primary/20"
              : "bg-muted border border-border"
          }`}>
            <Icon className={`h-4 w-4 ${
              disabled
                ? "text-muted-foreground/30"
                : selected
                ? "text-primary"
                : "text-muted-foreground/50"
            }`} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-sans font-semibold ${
                disabled ? "text-foreground/40" : selected ? "text-foreground" : "text-foreground/80"
              }`}>
                {title}
              </span>
              {recommended && !disabled && (
                <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-1.5 py-0.5 uppercase tracking-wider">
                  Recommended
                </span>
              )}
              {disabled && (
                <span className="text-[9px] font-mono font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded-full px-1.5 py-0.5 uppercase tracking-wider">
                  No renders left
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={`h-4 w-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all ${
          disabled ? "border-border/30" : selected ? "border-primary" : "border-border"
        }`}>
          {selected && !disabled && <div className="h-2 w-2 rounded-full bg-primary" />}
        </div>
      </div>

      <p className="text-[11px] font-mono text-muted-foreground/70 leading-relaxed pl-10">
        {description}
      </p>

      <div className="flex flex-wrap gap-1.5 pl-10">
        {badges.map((b) => (
          <span
            key={b.label}
            className={`text-[9px] font-mono rounded-full px-2 py-0.5 border ${
              b.color === "green"
                ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                : b.color === "blue"
                ? "text-blue-500 bg-blue-500/10 border-blue-500/20"
                : b.color === "amber"
                ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                : "text-red-500 bg-red-500/10 border-red-500/20"
            }`}
          >
            {b.label}
          </span>
        ))}
      </div>

      {warning && (
        <div className="flex items-start gap-1.5 pl-10">
          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] font-mono text-amber-500/80 leading-relaxed">{warning}</p>
        </div>
      )}

      {footer && <div className="pl-10">{footer}</div>}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideoDownloadPage() {
  const [phase, setPhase] = useState<Phase>("choose");
  const [mode, setMode] = useState<ExportMode>("client");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [deviceCapability, setDeviceCapability] = useState<"high" | "mid" | "low">("mid");
  const [serverUsage, setServerUsage] = useState<ServerRenderUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const started = useRef(false);

  // Detect device capability on mount and pre-select best mode
  useEffect(() => {
    const cap = estimateDeviceCapability();
    setDeviceCapability(cap);
    // Pre-select server for low-end devices, client for everyone else
    setMode(cap === "low" ? "server" : "client");
  }, []);

  // Fetch server render usage on mount
  useEffect(() => {
    fetchServerRenderUsage().then((usage) => {
      setServerUsage(usage);
      setUsageLoading(false);
      // If low-end device wanted server but no renders left, fall back to client
      if (usage && usage.remaining === 0) {
        setMode("client");
      }
    });
  }, []);

  const serverExhausted = !usageLoading && serverUsage !== null && serverUsage.remaining === 0;

  // ── Client-side render ───────────────────────────────────────────────────────

  const runClientRender = useCallback(async (videoJson: VideoJson) => {
    setPhase("rendering");
    try {
      const blob = await runAdaptiveClientRender(videoJson, (p) => setProgress(p));

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
  }, []);

  // ── Server-side render ───────────────────────────────────────────────────────

  const runServerRender = useCallback(async (payload: { chatId: string; videoJson: VideoJson }) => {
    setPhase("rendering");
    setProgress(0);

    try {
      const jobId = await startServerRender(payload);

      // Poll every 3s
      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const result = await pollRenderStatus(jobId);
            setProgress(result.progress ?? 0);

            if (result.renderStatus === "done" && result.outputUrl) {
              clearInterval(interval);
              setOutputUrl(result.outputUrl);

              // Auto-download
              const anchor = document.createElement("a");
              anchor.href = result.outputUrl;
              anchor.download = "generated-video.mp4";
              anchor.target = "_blank";
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();

              resolve();
            } else if (result.renderStatus === "failed") {
              clearInterval(interval);
              reject(new Error(result.renderError ?? "Server render failed"));
            }
          } catch (pollErr) {
            clearInterval(interval);
            reject(pollErr);
          }
        }, 3000);
      });

      setPhase("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Server render failed.");
      setPhase("error");
    }
  }, []);

  // ── Start render ─────────────────────────────────────────────────────────────

  function handleStart() {
    if (started.current) return;
    started.current = true;

    const raw =
      localStorage.getItem("video-download-payload") ??
      sessionStorage.getItem("video-download-payload");

    if (!raw) {
      setErrorMsg("No video payload found. Please go back and try again.");
      setPhase("error");
      return;
    }

    localStorage.removeItem("video-download-payload");

    let parsed: { videoJson: VideoJson; chatId?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      setErrorMsg("Invalid video payload.");
      setPhase("error");
      return;
    }

    if (!parsed.videoJson) {
      setErrorMsg("Invalid video payload — missing videoJson.");
      setPhase("error");
      return;
    }

    const rawVideoJson = parsed.videoJson

if (mode === "server") {
  if (!parsed.chatId) {
    setErrorMsg("Server render requires a saved video chat.")
    setPhase("error")
    return
  }
  // Deproxy: server renderer fetches URLs directly — proxy routes don't exist in the bundle
  const serverVideoJson = deproxyS3Urls(rawVideoJson)
  void runServerRender({ chatId: parsed.chatId, videoJson: serverVideoJson })
} else {
  // Client render: browser can hit the proxy directly, keep as-is
  void runClientRender(rawVideoJson)
}
  }

  const pct = Math.round(progress * 100);

  // ── Capability tip ───────────────────────────────────────────────────────────

  const capTip =
    deviceCapability === "low"
      ? "Your device has limited CPU/memory — Server render is recommended."
      : deviceCapability === "mid"
      ? "Moderate device detected — Client render should work but may be slow for longer videos."
      : null;

  // ── Server render usage footer (shown inside the server ModeCard) ─────────────

  const serverUsageFooter = usageLoading ? (
    <div className="flex items-center gap-1.5">
      <Loader2 className="h-3 w-3 text-muted-foreground/40 animate-spin" />
      <span className="text-[10px] font-mono text-muted-foreground/40">Loading usage…</span>
    </div>
  ) : serverUsage ? (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted-foreground/60">
          {serverUsage.remaining} of {serverUsage.dailyLimit} renders remaining today
        </span>
        <span className={`text-[9px] font-mono font-bold rounded-full px-1.5 py-0.5 border ${
          serverUsage.remaining === 0
            ? "text-red-500 bg-red-500/10 border-red-500/20"
            : serverUsage.remaining <= Math.ceil(serverUsage.dailyLimit * 0.3)
            ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
            : "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
        }`}>
          {serverUsage.planId} plan
        </span>
      </div>
      {serverUsage.dailyLimit <= 10 && (
        <UsagePips used={serverUsage.usedToday} total={serverUsage.dailyLimit} />
      )}
      {serverUsage.remaining === 0 && (
        <p className="text-[10px] font-mono text-red-500/70 leading-relaxed">
          Resets at midnight UTC. Use Client render or upgrade your plan.
        </p>
      )}
    </div>
  ) : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Film className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-sans font-semibold text-foreground">Export MP4</p>
            <p className="text-[10px] font-mono text-muted-foreground/50">Choose how to render your video</p>
          </div>
        </div>

        {/* ── Choose mode ── */}
        {phase === "choose" && (
          <div className="space-y-4">
            {/* Device capability tip */}
            {capTip && !serverExhausted && (
              <div className="flex items-start gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-3.5 py-3">
                <Cpu className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] font-mono text-blue-400/90 leading-relaxed">{capTip}</p>
              </div>
            )}

            {/* Server renders exhausted banner */}
            {serverExhausted && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3">
                <RefreshCw className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-mono text-amber-500/80 leading-relaxed">
                  You've used all your server renders for today. Client render is still available — free and unlimited.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <ModeCard
                mode="client"
                selected={mode === "client"}
                recommended={deviceCapability === "high" || serverExhausted}
                onSelect={() => setMode("client")}
                icon={Monitor}
                title="Client Render"
                description="Renders entirely in your browser using WebCodecs. Free, private, no server involved. Adaptive CPU throttling reduces stalling on weaker devices."
                badges={[
                  { label: "Always free", color: "green" },
                  { label: "Unlimited", color: "green" },
                  { label: "Chrome 94+ / Firefox 130+ / Safari 26+", color: "blue" },
                  ...(deviceCapability === "low"
                    ? [{ label: "May be slow on this device", color: "amber" as const }]
                    : []),
                ]}
                warning={
                  deviceCapability === "low" && !serverExhausted
                    ? "Low-end device detected. Render may take longer or use Server render for best results."
                    : undefined
                }
              />

              <ModeCard
                mode="server"
                selected={mode === "server"}
                recommended={deviceCapability === "low" && !serverExhausted}
                disabled={serverExhausted}
                onSelect={() => setMode("server")}
                icon={Server}
                title="Server Render"
                description="Renders on our servers and delivers a download link. Works on any device, any browser. Subject to daily rate limits per plan."
                badges={[
                  { label: "Any device", color: "green" },
                  { label: "Any browser", color: "green" },
                  { label: "Daily limit", color: "amber" },
                ]}
                footer={serverUsageFooter}
              />
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/20 px-3.5 py-3">
              <Info className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
              <p className="text-[10px] font-mono text-muted-foreground/50 leading-relaxed">
                Both options produce the same MP4. Client render is instant and uses your CPU;
                server render offloads work but queues behind other users.
              </p>
            </div>

            <button
              onClick={handleStart}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-sans font-bold hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Start {mode === "client" ? "Client" : "Server"} Render
            </button>
          </div>
        )}

        {/* ── Rendering (client) ── */}
        {phase === "rendering" && mode === "client" && (
          <div className="rounded-xl border border-border bg-muted/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                <p className="text-sm font-sans font-semibold text-foreground">Client Rendering…</p>
              </div>
              <span className="text-sm font-mono text-primary font-bold tabular-nums">{pct}%</span>
            </div>

            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>

            {deviceCapability !== "high" && (
              <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
                <Cpu className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[10px] font-mono text-blue-400/80 leading-relaxed">
                  Adaptive throttling is active — render speed is tuned to your device to prevent freezing.
                </p>
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono text-amber-500/80 leading-relaxed">
                <strong className="text-amber-500">Do not close this tab</strong> until export finishes.
              </p>
            </div>
          </div>
        )}

        {/* ── Rendering (server) ── */}
        {phase === "rendering" && mode === "server" && (
          <div className="rounded-xl border border-border bg-muted/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                <p className="text-sm font-sans font-semibold text-foreground">Server Rendering…</p>
              </div>
              {pct > 0 ? (
                <span className="text-sm font-mono text-primary font-bold tabular-nums">{pct}%</span>
              ) : (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              )}
            </div>

            {pct > 0 && (
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/10 px-3.5 py-3">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
              <p className="text-[10px] font-mono text-muted-foreground/60 leading-relaxed">
                Your video is rendering on our servers. You can safely minimize this tab — we'll
                auto-download when ready.
              </p>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-3">
              <Wifi className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-mono text-amber-500/80 leading-relaxed">
                Keep your internet connection active until the download starts.
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
                  {mode === "server" && outputUrl
                    ? "Your MP4 is ready — download started automatically."
                    : "Your MP4 has been saved to your downloads folder."}
                </p>
              </div>
            </div>

            {/* Manual download link for server renders */}
            {mode === "server" && outputUrl && (
              <a
                href={outputUrl}
                download="generated-video.mp4"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-emerald-500/30 text-[11px] font-mono text-emerald-600 hover:bg-emerald-500/10 transition-all"
              >
                <Download className="h-3.5 w-3.5" /> Download again
              </a>
            )}

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

            {/* Suggest switching modes on failure */}
            {mode === "client" && (
              <button
                type="button"
                onClick={() => {
                  started.current = false;
                  setMode("server");
                  setPhase("choose");
                  setProgress(0);
                  setErrorMsg("");
                }}
                className="w-full h-9 rounded-xl border border-border bg-muted/20 text-xs font-mono text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all flex items-center justify-center gap-2"
              >
                <Server className="h-3.5 w-3.5" /> Try Server Render instead
              </button>
            )}

            <button
              onClick={() => {
                setPhase("choose");
                setProgress(0);
                setErrorMsg("");
                setOutputUrl(null);
                started.current = false;
              }}
              className="w-full h-9 rounded-xl border border-border bg-muted/20 text-xs font-mono text-muted-foreground hover:bg-muted/40 hover:text-foreground transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Back to options
            </button>
          </div>
        )}

        {/* Browser note */}
        <p className="text-[10px] font-mono text-muted-foreground/40 text-center leading-relaxed">
          Client render: Chrome 94+, Firefox 130+, Safari 26+ · Server render: any browser
        </p>
      </div>
    </div>
  );
}