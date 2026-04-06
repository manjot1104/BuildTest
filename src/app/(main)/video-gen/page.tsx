"use client";

// src/app/video-gen/page.tsx
//
// Test page for the video generation pipeline.
// Follows the same patterns as testing.page.tsx — font-mono labels,
// font-sans headings, CSS variable colours, TanStack Query mutations.

import { useState, useRef } from "react";
import { Player } from "@remotion/player";
import { toast } from "sonner";
import {
  Clapperboard,
  Loader2,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Film,
} from "lucide-react";
import { useGenerateVideo, type VideoMeta } from "@/client-api/query-hooks/use-video-hooks";
import { VideoComposition } from "@/remotion-src/VideoComposition";
import type { VideoJson } from "@/remotion-src/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [
  { label: "10s", value: 10 },
  { label: "15s", value: 15 },
  { label: "20s", value: 20 },
  { label: "30s", value: 30 },
] as const;

const EXAMPLE_PROMPTS = [
  "Explain photosynthesis in 3 scenes with a clean educational style",
  "A bold product launch for a new AI startup",
  "The water cycle with dark gradients and smooth animations",
  "A motivational quote video with gold accents on black",
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VideoGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(15);
  const [videoJson, setVideoJson] = useState<VideoJson | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: generate, isPending: isGenerating } = useGenerateVideo();

  const hasResult = videoJson !== null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    generate(
      { prompt: prompt.trim(), duration },
      {
        onSuccess: (data) => {
          setVideoJson(data.videoJson);
          setMeta(data.meta);
          toast.success(`Generated ${data.meta.scenes} scenes`);
        },
        onError: (err) => {
          toast.error(err.message ?? "Failed to generate video");
        },
      },
    );
  }

  function handleExample(example: string) {
    setPrompt(example);
    textareaRef.current?.focus();
  }

  function handleReset() {
    setVideoJson(null);
    setMeta(null);
    setPrompt("");
    setJsonOpen(false);
  }

  return (
    <div className="relative -m-4 w-[calc(100%+2rem)] min-h-screen bg-sidebar">
      <main className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Clapperboard className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-sans font-semibold text-foreground">
              Video Generator
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60 border border-border rounded-full px-1.5 py-0.5 shrink-0">
              BETA
            </span>
          </div>
          {hasResult && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New video
            </button>
          )}
        </div>

        {/* ══ INPUT ═════════════════════════════════════════════════════════════ */}
        {!hasResult && (
          <div className="space-y-3">

            {/* Hero */}
            <div className="text-center space-y-2.5 py-4">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                <Sparkles className="h-3 w-3" />
                prompt to video · remotion powered
              </div>
              <h1 className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-foreground">
                Describe your video.{" "}
                <span className="text-muted-foreground/35">We'll build it.</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Type a prompt · AI generates the composition · Preview it instantly
              </p>
            </div>

            {/* Input card */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">

                {/* Textarea */}
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Explain photosynthesis in 3 scenes with a clean educational style"
                    rows={4}
                    disabled={isGenerating}
                    aria-label="Video prompt"
                    className="w-full px-4 pt-4 pb-8 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none resize-none disabled:opacity-40"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                        handleSubmit(e);
                    }}
                  />
                  <span className="absolute bottom-3 right-4 text-[10px] font-mono text-muted-foreground/25 tabular-nums">
                    {prompt.length}/2000
                  </span>
                </div>

                {/* Duration selector + submit */}
                <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest shrink-0">
                      Duration
                    </span>
                    <div className="flex gap-1" role="group">
                      {DURATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDuration(opt.value)}
                          aria-pressed={duration === opt.value}
                          className={`px-2.5 py-1 text-[10px] font-mono rounded-md border transition-all touch-manipulation ${
                            duration === opt.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!prompt.trim() || isGenerating}
                    className="inline-flex items-center justify-center gap-2 px-4 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-sans font-bold hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="hidden sm:inline">Generating…</span>
                      </>
                    ) : (
                      <>
                        <Film className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Generating state */}
            {isGenerating && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                <p className="text-xs font-mono text-muted-foreground">
                  AI is composing your video…
                </p>
              </div>
            )}

            {/* Example prompts */}
            {!isGenerating && (
              <div>
                <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-2">
                  Try an example
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => handleExample(ex)}
                      className="text-[10px] font-mono text-muted-foreground border border-border rounded-lg px-2.5 py-1.5 hover:border-border/60 hover:text-foreground hover:bg-muted/50 transition-all text-left"
                    >
                      {ex.length > 50 ? ex.slice(0, 50) + "…" : ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ RESULT ════════════════════════════════════════════════════════════ */}
        {hasResult && videoJson && (
          <div className="space-y-4">

            {/* Meta row */}
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-4 flex-wrap">
                {[
                  { icon: Layers, label: "scenes", value: meta?.scenes },
                  {
                    icon: Clock,
                    label: "seconds",
                    value: meta?.durationSeconds.toFixed(1),
                  },
                  { icon: Film, label: "frames", value: meta?.totalFrames },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>
                    <div>
                      <p className="text-sm font-mono font-bold text-foreground tabular-nums leading-none">
                        {value}
                      </p>
                      <p className="text-[9px] font-mono text-muted-foreground/50 mt-0.5">
                        {label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Remotion Player */}
            <div className="rounded-xl border border-border overflow-hidden bg-card shadow-sm">
              <Player
                component={VideoComposition}
                inputProps={{ videoJson }}
                durationInFrames={videoJson.duration}
                fps={videoJson.fps ?? 30}
                compositionWidth={videoJson.width ?? 1280}
                compositionHeight={videoJson.height ?? 720}
                style={{ width: "100%", aspectRatio: "16/9" }}
                controls
                autoPlay
                loop
              />
            </div>

            {/* Prompt used */}
            <div className="px-4 py-3 bg-muted/30 rounded-xl border border-border">
              <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-1">
                Prompt
              </p>
              <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                {prompt}
              </p>
            </div>

            {/* JSON debug panel */}
            <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setJsonOpen((v) => !v)}
                aria-expanded={jsonOpen}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors touch-manipulation"
              >
                <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                  Generated JSON
                </span>
                {jsonOpen ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
                )}
              </button>
              {jsonOpen && (
                <pre className="border-t border-border px-4 py-4 text-[10px] font-mono text-muted-foreground/50 overflow-auto max-h-72 leading-relaxed custom-scrollbar bg-background/50">
                  {JSON.stringify(videoJson, null, 2)}
                </pre>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 flex-wrap pb-6 pt-1">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-muted-foreground/40 text-xs font-mono hover:text-muted-foreground transition-all ml-auto touch-manipulation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                new video
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}