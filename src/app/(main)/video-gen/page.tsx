"use client";

// src/app/video-gen/page.tsx
//
// Test page for the video generation pipeline..

import { useState, useRef } from "react";
import { Player } from "@remotion/player";
import { toast } from "sonner";
import {
  Clapperboard, Loader2, RotateCcw, Sparkles,
  ChevronDown, ChevronUp, Clock, Layers, Film,
  Mic, Music, Volume2,
} from "lucide-react";
import { useGenerateVideo, type VideoMeta, type GenerateVideoOptions } from "@/client-api/query-hooks/use-video-hooks";
import { VideoComposition } from "@/remotion-src/VideoComposition";
import type { VideoJson } from "@/remotion-src/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_RANGES = [
  { label: "0–10s", value: 10, seconds: 7 },
  { label: "10–20s", value: 20, seconds: 16 },
  { label: "20–30s", value: 30, seconds: 25 },
] as const;

type DurationRange = typeof DURATION_RANGES[number];

const MUSIC_GENRES = [
  { label: "Corporate", value: "corporate" },
  { label: "Cinematic", value: "cinematic" },
  { label: "Upbeat", value: "upbeat" },
  { label: "Lo-fi", value: "lofi" },
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
  const [selectedRange, setSelectedRange] = useState<DurationRange>(DURATION_RANGES[1]);
  const [videoJson, setVideoJson] = useState<VideoJson | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Options state
  const [useTTS, setUseTTS] = useState(true);
  const [useMusic, setUseMusic] = useState(true);
  const [musicGenre, setMusicGenre] = useState("corporate");
  const [voiceId, setVoiceId] = useState("aravind");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { mutate: generate, isPending: isGenerating } = useGenerateVideo();

  const hasResult = videoJson !== null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const options: GenerateVideoOptions = {
      useTTS,
      useMusic,
      ...(useTTS && { voiceId }),
      ...(useMusic && { musicGenre }),
    };

    generate(
      { prompt: prompt.trim(), duration: selectedRange.seconds, options },
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

  function handleReset() {
    setVideoJson(null);
    setMeta(null);
    setPrompt("");
    setSelectedRange(DURATION_RANGES[1]);
    setJsonOpen(false);
    setOptionsOpen(false);
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

        {/* ══ INPUT ═══════════════════════════════════════════════════════════ */}
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
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e);
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
                      {DURATION_RANGES.map((range) => (
                        <button
                          key={range.value}
                          type="button"
                          onClick={() => setSelectedRange(range)}
                          aria-pressed={selectedRange.value === range.value}
                          className={`px-2.5 py-1 text-[10px] font-mono rounded-md border transition-all touch-manipulation ${
                            selectedRange.value === range.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                          }`}
                        >
                          {range.label}
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

                {/* Collapsible options */}
                <div className="border-t border-border">
                  <button
                    type="button"
                    onClick={() => setOptionsOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-3 w-3 text-muted-foreground/50" />
                      <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                        Audio options
                      </span>
                      {/* Active indicators */}
                      <div className="flex gap-1">
                        {useTTS && (
                          <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">
                            TTS
                          </span>
                        )}
                        {useMusic && (
                          <span className="text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-1.5 py-0.5">
                            Music
                          </span>
                        )}
                      </div>
                    </div>
                    {optionsOpen
                      ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
                      : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
                    }
                  </button>

                  {optionsOpen && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border bg-muted/10">

                      {/* TTS toggle + voice */}
                      <div className="space-y-2 pt-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mic className="h-3.5 w-3.5 text-muted-foreground/50" />
                            <span className="text-[11px] font-mono text-muted-foreground">
                              Narration (TTS)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUseTTS((v) => !v)}
                            className={`relative h-5 w-9 rounded-full border transition-all ${
                              useTTS
                                ? "bg-primary border-primary"
                                : "bg-muted border-border"
                            }`}
                          >
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                              useTTS ? "left-4" : "left-0.5"
                            }`} />
                          </button>
                        </div>

                        {useTTS && (
                          <div className="flex items-center gap-2 pl-5">
                            <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">
                              Voice
                            </span>
                            <input
                              type="text"
                              value={voiceId}
                              onChange={(e) => setVoiceId(e.target.value)}
                              placeholder="aravind"
                              className="flex-1 h-7 px-2 rounded-md border border-border bg-background text-[11px] font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50"
                            />
                          </div>
                        )}
                      </div>

                      {/* Music toggle + genre */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Music className="h-3.5 w-3.5 text-muted-foreground/50" />
                            <span className="text-[11px] font-mono text-muted-foreground">
                              Background music
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUseMusic((v) => !v)}
                            className={`relative h-5 w-9 rounded-full border transition-all ${
                              useMusic
                                ? "bg-primary border-primary"
                                : "bg-muted border-border"
                            }`}
                          >
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                              useMusic ? "left-4" : "left-0.5"
                            }`} />
                          </button>
                        </div>

                        {useMusic && (
                          <div className="flex items-center gap-2 pl-5">
                            <span className="text-[10px] font-mono text-muted-foreground/50 w-10 shrink-0">
                              Genre
                            </span>
                            <div className="flex gap-1 flex-wrap">
                              {MUSIC_GENRES.map((g) => (
                                <button
                                  key={g.value}
                                  type="button"
                                  onClick={() => setMusicGenre(g.value)}
                                  className={`px-2 py-1 text-[10px] font-mono rounded-md border transition-all ${
                                    musicGenre === g.value
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {g.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              </div>
            </form>

            {/* Generating state */}
            {isGenerating && (
              <div className="rounded-xl border border-border bg-muted/20 p-6 flex flex-col items-center gap-4">

                {/* Spinner */}
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 rounded-full border-2 border-border" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="h-5 w-5 text-primary" />
                  </div>
                </div>

                {/* Text */}
                <div className="text-center space-y-1">
                  <p className="text-sm font-sans font-semibold text-foreground">
                    Generating your video…
                  </p>
                  <p className="text-[11px] font-mono text-muted-foreground/60">
                    AI is composing {selectedRange.label} of scenes
                  </p>
                </div>

                {/* Animated steps */}
                <div className="flex flex-col gap-1.5 w-full max-w-xs">
                  {[
                    "Analyzing your prompt",
                    "Composing scenes",
                    ...(useTTS ? ["Generating narration audio"] : []),
                    ...(useMusic ? ["Adding background music"] : []),
                  ].map((step, i) => (
                    <div key={step} className="flex items-center gap-2">
                      <Loader2
                        className="h-3 w-3 text-primary animate-spin shrink-0"
                        style={{ animationDelay: `${i * 300}ms` }}
                      />
                      <span className="text-[10px] font-mono text-muted-foreground/50">
                        {step}
                      </span>
                    </div>
                  ))}
                </div>

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
                      onClick={() => { setPrompt(ex); textareaRef.current?.focus(); }}
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

        {/* ══ RESULT ══════════════════════════════════════════════════════════ */}
        {hasResult && videoJson && (
          <div className="space-y-4">

            {/* Meta row */}
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-4 flex-wrap">
                {[
                  { icon: Layers, label: "scenes", value: meta?.scenes },
                  { icon: Clock, label: "seconds", value: meta?.durationSeconds.toFixed(1) },
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
                {/* Audio badges */}
                <div className="flex gap-1.5 ml-auto">
                  {videoJson.scenes.some(s => s.ttsUrl) && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                      <Mic className="h-2.5 w-2.5" /> TTS
                    </span>
                  )}
                  {videoJson.bgmUrl && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                      <Music className="h-2.5 w-2.5" /> Music
                    </span>
                  )}
                </div>
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
                {jsonOpen
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
                }
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