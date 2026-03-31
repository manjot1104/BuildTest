"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Globe, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, ExternalLink, Shield, Zap,
  Eye, Navigation, FileText, Lock, Bug, Sparkles,
  Clock, BarChart3, FlaskConical, Terminal, Wifi,
  History, ChevronRight, X, StopCircle, ImageOff,
  Minus, Plus, Pencil, Trash2, Check, Copy, ArrowRight,
  Search, FileSearch,
} from "lucide-react";
import { toast } from "sonner";
import {
  useUpdateTestCase, useDeleteTestCase, useCreateTestCase,
  useConfirmAndExecute, useCancelTestRun, useReviewTestCases,
  useTestHistory,
  type Bug as BugType, type TestCase, type PerformanceGauge,
  type TrendDataPoint, type TestHistoryItem,
  type LiveTestCase, type ReviewTestCase,
  type CrawlFoundUrl, type CrawlExtractedPage, type CrawlFailedPage,
} from "@/client-api/query-hooks/use-testing-hooks";

// ─── Design tokens ─────────────────────────────────────────────────────────────
// All accent colors now use CSS variables from global.css (Buildify blue theme).
// --primary      = oklch(0.6907 0.1300 248.5133)  — Buildify brand blue
// --secondary    = oklch(0.5360 0.0398 196.0280)  — teal complement
// Font: AR One Sans (--font-sans) · Azeret Mono (--font-mono)

export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  navigation: Navigation, forms: FileText, visual: Eye,
  performance: Zap, a11y: Shield, security: Lock,
  auth: Lock, responsive: Eye, accessibility: Shield, error_handling: AlertTriangle,
};

export const SEVERITY_CONFIG = {
  critical: { color: "bg-red-500/10 text-red-500 border-red-500/25",         dot: "bg-red-500",    label: "Critical" },
  high:     { color: "bg-orange-500/10 text-orange-500 border-orange-500/25", dot: "bg-orange-500", label: "High"     },
  medium:   { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/25", dot: "bg-yellow-500", label: "Medium"   },
  low:      { color: "bg-blue-500/10 text-blue-500 border-blue-500/25",       dot: "bg-blue-400",   label: "Low"      },
};

export const PRIORITY_CONFIG = {
  P0: { color: "text-red-500 bg-red-500/10 border-red-500/20"          },
  P1: { color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
  P2: { color: "text-muted-foreground bg-muted/50 border-border"       },
};

// ── "passed" now uses Buildify primary blue instead of neon green ──
export const STATUS_CONFIG = {
  pending:  { icon: Clock,         color: "text-muted-foreground",  bg: "bg-muted/50 border-border",               label: "Pending"  },
  running:  { icon: Loader2,       color: "text-primary",           bg: "bg-primary/10 border-primary/20",          label: "Running"  },
  passed:   { icon: CheckCircle2,  color: "text-primary",           bg: "bg-primary/10 border-primary/25",          label: "Passed"   },
  failed:   { icon: XCircle,       color: "text-red-500",           bg: "bg-red-500/10 border-red-500/20",          label: "Failed"   },
  flaky:    { icon: AlertTriangle, color: "text-yellow-500",        bg: "bg-yellow-500/10 border-yellow-500/20",    label: "Flaky"    },
  skipped:  { icon: Clock,         color: "text-muted-foreground",  bg: "bg-muted/50 border-border",               label: "Skipped"  },
};

export const CATEGORIES = ["navigation", "forms", "visual", "performance", "a11y", "security"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function statusBg(s: string) {
  if (s === "good")              return "bg-primary";
  if (s === "needs-improvement") return "bg-yellow-500";
  if (s === "poor")              return "bg-red-500";
  return "bg-muted";
}

export function statusColor(s: string) {
  if (s === "good")              return "text-primary";
  if (s === "needs-improvement") return "text-yellow-500";
  if (s === "poor")              return "text-red-500";
  return "text-muted-foreground";
}

export function fmtMs(ms: number): string {
  if (ms < 60_000) return `${ms / 1000}s`;
  const m = ms / 60_000;
  return Number.isInteger(m) ? `${m}m` : `${m.toFixed(1)}m`;
}

export function urlPath(url: string): string {
  try { return new URL(url).pathname || "/"; } catch { return url; }
}

// ─── BfyTag ────────────────────────────────────────────────────────────────────

export function BfyTag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${className}`}>
      {children}
    </span>
  );
}

// ─── Shared input class ────────────────────────────────────────────────────────

const bfyInput =
  "w-full rounded-md border border-input bg-background px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors";

// ─── Budget Stepper ────────────────────────────────────────────────────────────

export function BudgetStepper({ label, hint, value, min, max, onChange }: {
  label: string; hint: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono text-muted-foreground truncate">{label}</span>
        <span className="text-[10px] font-mono text-muted-foreground/50 bg-muted border border-border px-1.5 py-0.5 rounded shrink-0">{hint}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="h-9 w-9 shrink-0 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all touch-manipulation"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 h-9 rounded-lg border border-border bg-background flex items-center justify-center min-w-0">
          <span className="text-sm font-mono font-bold text-foreground tabular-nums">{value}</span>
        </div>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="h-9 w-9 shrink-0 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all touch-manipulation"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Timeout Stepper ───────────────────────────────────────────────────────────

export const TIMEOUT_MIN_MS  = 30_000;
export const TIMEOUT_MAX_MS  = 600_000;
export const TIMEOUT_STEP_MS = 30_000;

export function TimeoutStepper({ label, hint, value, onChange }: {
  label: string; hint: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-mono text-muted-foreground truncate">{label}</span>
        <span className="text-[10px] font-mono text-muted-foreground/40 shrink-0 hidden sm:block">{hint}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(Math.max(TIMEOUT_MIN_MS, value - TIMEOUT_STEP_MS))}
          disabled={value <= TIMEOUT_MIN_MS}
          className="h-8 w-8 shrink-0 rounded-md border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 active:scale-95 disabled:opacity-25 transition-all touch-manipulation"
        >
          <Minus className="h-3 w-3" />
        </button>
        <div className="flex-1 h-8 rounded-md border border-border bg-background flex items-center justify-center min-w-0">
          <span className="text-xs font-mono font-bold text-foreground tabular-nums">{fmtMs(value)}</span>
        </div>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(Math.min(TIMEOUT_MAX_MS, value + TIMEOUT_STEP_MS))}
          disabled={value >= TIMEOUT_MAX_MS}
          className="h-8 w-8 shrink-0 rounded-md border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 active:scale-95 disabled:opacity-25 transition-all touch-manipulation"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Pipeline Steps Row ────────────────────────────────────────────────────────

export const PIPELINE_STEPS = [
  { key: "crawling",        label: "Crawl",    icon: Globe     },
  { key: "generating",      label: "Generate", icon: Sparkles  },
  { key: "awaiting_review", label: "Review",   icon: FileText  },
  { key: "executing",       label: "Execute",  icon: Zap       },
  { key: "reporting",       label: "Report",   icon: BarChart3 },
];

export const PIPELINE_ORDER: Record<string, number> = {
  crawling: 0, generating: 1, awaiting_review: 2, executing: 3, reporting: 4, complete: 5,
};

export function PipelineStepsRow({ pipelineStatus, percent }: { pipelineStatus: string; percent: number }) {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.key === pipelineStatus);

  return (
    <div className="w-full" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex items-center justify-between relative px-1">
        <div className="absolute top-3.5 left-1 right-1 h-px bg-border" aria-hidden="true">
          <div
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${Math.max(0, (currentIndex / (PIPELINE_STEPS.length - 1)) * 100)}%` }}
          />
        </div>

        {PIPELINE_STEPS.map((step, i) => {
          const isDone   = i < currentIndex || pipelineStatus === "complete";
          const isActive = step.key === pipelineStatus;
          const Icon     = step.icon;
          return (
            <div key={step.key} className="flex flex-col items-center gap-1 z-10">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center border transition-all duration-300 ${
                isDone   ? "bg-primary border-primary text-primary-foreground"
                : isActive ? "bg-primary/10 border-primary text-primary"
                : "bg-muted/20 border-border text-muted-foreground"
              }`}>
                {isDone
                  ? <Check className="h-3 w-3" />
                  : isActive
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Icon className="h-3 w-3" />
                }
              </div>
              <span className={`text-[9px] font-mono leading-none hidden sm:block ${
                isActive ? "text-primary" : isDone ? "text-muted-foreground" : "text-muted-foreground/30"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="sm:hidden mt-1 text-center">
        <span className="text-[10px] font-mono text-primary">
          {PIPELINE_STEPS[currentIndex]?.label ?? "starting…"}
        </span>
      </div>

      <div className="mt-3 h-1 w-full bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-[10px] font-mono text-muted-foreground/40">
        <span>{percent}%</span>
        <span className="text-primary">
          {pipelineStatus === "complete" ? "complete" : `${pipelineStatus}…`}
        </span>
      </div>
    </div>
  );
}

// ─── Execution Counters ────────────────────────────────────────────────────────

export function ExecutionCounters({ passed, failed, running, skipped, total }: {
  passed: number; failed: number; running: number; skipped: number; total: number;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap" role="status">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/25">
        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-mono font-bold text-primary tabular-nums">{passed}</span>
        <span className="text-[10px] font-mono text-primary/50">passed</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
        <XCircle className="h-3.5 w-3.5 text-red-500" />
        <span className="text-sm font-mono font-bold text-red-500 tabular-nums">{failed}</span>
        <span className="text-[10px] font-mono text-red-500/50">failed</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 border border-secondary/20">
        <Loader2 className="h-3.5 w-3.5 text-secondary animate-spin" />
        <span className="text-sm font-mono font-bold text-secondary tabular-nums">{running}</span>
        <span className="text-[10px] font-mono text-secondary/50">running</span>
      </div>
      {total > 0 && (
        <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto">
          {passed + failed + skipped}/{total}
        </span>
      )}
    </div>
  );
}

// ─── Stop Button ───────────────────────────────────────────────────────────────

export function StopButton({ onCancel, isCancelling }: { onCancel: () => void; isCancelling: boolean }) {
  return (
    <button
      onClick={onCancel}
      disabled={isCancelling}
      aria-label="Stop test run"
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-xs font-mono hover:bg-red-500/20 hover:border-red-500/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation shrink-0"
    >
      {isCancelling
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <StopCircle className="h-3.5 w-3.5" />
      }
      {isCancelling ? "stopping…" : "stop"}
    </button>
  );
}

// ─── CrawlProgressPanel ────────────────────────────────────────────────────────

export function CrawlProgressPanel({ stage, stageDescription, foundUrls, extractedPages, failedPages }: {
  stage: string | null; stageDescription: string | null;
  foundUrls: CrawlFoundUrl[]; extractedPages: CrawlExtractedPage[]; failedPages: CrawlFailedPage[];
}) {
  const [expanded, setExpanded]   = useState(false);
  const [activeTab, setActiveTab] = useState<"urls" | "pages">("urls");

  useEffect(() => { if (extractedPages.length > 0) setActiveTab("pages"); }, [extractedPages.length]);

  const hasData = foundUrls.length > 0 || extractedPages.length > 0 || failedPages.length > 0;
  if (!stage && !hasData) return null;

  return (
    <div className="w-full rounded-xl border border-border overflow-hidden bg-muted/20">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-muted/50 transition-colors text-left touch-manipulation"
      >
        <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-foreground truncate">{stage ?? "starting crawl…"}</p>
          {stageDescription && !expanded && (
            <p className="text-[10px] font-mono text-muted-foreground truncate">{stageDescription}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
          <span className="text-primary font-bold">{extractedPages.length}</span>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground font-medium">{foundUrls.length}</span>
          <span className="text-muted-foreground/40 hidden sm:inline">pages</span>
        </div>
        {hasData && (
          expanded
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && hasData && (
        <>
          <div className="flex border-t border-b border-border text-[10px] font-mono" role="tablist">
            {(["urls", "pages"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors touch-manipulation ${
                  activeTab === tab
                    ? "text-primary border-b border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "urls" ? <Search className="h-3 w-3" /> : <FileSearch className="h-3 w-3" />}
                {tab}
                <span className="text-muted-foreground/40">
                  ({tab === "urls" ? foundUrls.length : extractedPages.length})
                </span>
              </button>
            ))}
          </div>

          <div className="max-h-48 overflow-y-auto" role="tabpanel">
            {activeTab === "urls" && (
              <div className="p-2 space-y-0.5">
                {foundUrls.length === 0
                  ? <p className="text-[10px] font-mono text-muted-foreground/40 text-center py-4">discovering urls…</p>
                  : foundUrls.map((u, i) => (
                    <div key={`${u.url}-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        u.source === "discovery" ? "bg-primary"
                        : u.source === "sitemap"   ? "bg-secondary"
                        : "bg-muted-foreground"
                      }`} />
                      <span className="text-[10px] font-mono text-muted-foreground flex-1 truncate">{urlPath(u.url)}</span>
                      <BfyTag className={
                        u.source === "discovery" ? "text-primary border-primary/20 bg-primary/5"
                        : u.source === "sitemap"   ? "text-secondary border-secondary/20 bg-secondary/5"
                        : "text-muted-foreground border-border bg-muted/50"
                      }>
                        {u.source}
                      </BfyTag>
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === "pages" && (
              <div className="p-2 space-y-0.5">
                {extractedPages.length === 0 && failedPages.length === 0
                  ? <p className="text-[10px] font-mono text-muted-foreground/40 text-center py-4">extracting…</p>
                  : <>
                    {extractedPages.map((p, i) => (
                      <div key={`${p.url}-${i}`} className="flex items-start gap-2 px-2 py-2 rounded-md hover:bg-muted/50">
                        <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-mono text-foreground truncate">{p.title || urlPath(p.url)}</p>
                          <p className="text-[9px] font-mono text-muted-foreground/40">
                            {p.elementsCount} el · {p.formsCount} forms · {p.linksCount} links
                          </p>
                        </div>
                        <span className="text-[9px] font-mono text-muted-foreground/30 shrink-0">{p.index}/{p.total}</span>
                      </div>
                    ))}
                    {failedPages.map((p, i) => (
                      <div key={`${p.url}-fail-${i}`} className="flex items-start gap-2 px-2 py-1.5">
                        <XCircle className="h-3 w-3 text-red-500/50 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-mono text-muted-foreground truncate">{urlPath(p.url)}</p>
                          <p className="text-[9px] font-mono text-red-500/40 truncate">{p.reason}</p>
                        </div>
                      </div>
                    ))}
                  </>
                }
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Bug Screenshot ─────────────────────────────────────────────────────────────

export function BugScreenshot({ url, alt = "Bug screenshot" }: { url: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (failed) return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border text-muted-foreground text-xs font-mono">
      <ImageOff className="h-3.5 w-3.5 shrink-0" />
      <span>screenshot unavailable</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto hover:text-foreground underline">open ↗</a>
    </div>
  );

  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      <img
        src={url} alt={alt} loading="lazy" decoding="async" crossOrigin="anonymous" referrerPolicy="no-referrer"
        className={`w-full object-cover object-top transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ maxHeight: "360px" }}
        onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
      />
      {loaded && (
        <a
          href={url} target="_blank" rel="noopener noreferrer" aria-label="View full screenshot"
          className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono bg-black/60 text-muted-foreground hover:text-white px-2 py-1 rounded-md border border-border backdrop-blur-sm"
        >
          <ExternalLink className="h-3 w-3" /> full size
        </a>
      )}
    </div>
  );
}

// ─── Score Gauge ───────────────────────────────────────────────────────────────

export function ScoreGauge({ score, size = 80 }: { score: number; size?: number }) {
  const r      = size * 0.38;
  const cx     = size / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  // Use Buildify blue palette: primary blue for good, yellow for medium, red for poor
  const color  = score >= 90 ? "hsl(215 100% 58%)" : score >= 70 ? "#eab308" : "#ef4444";
  const label  = score >= 90 ? "excellent" : score >= 70 ? "good" : "needs work";

  return (
    <div
      className="relative inline-flex flex-col items-center gap-1 shrink-0"
      role="img"
      aria-label={`Score: ${score}/100 — ${label}`}
    >
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle cx={cx} cy={cx} r={r} stroke="currentColor" strokeOpacity="0.1" strokeWidth={size * 0.08} fill="none" />
          <circle
            cx={cx} cy={cx} r={r} stroke={color} strokeWidth={size * 0.08} fill="none"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center leading-none">
          <span className="font-mono font-bold tabular-nums" style={{ color, fontSize: size * 0.27 }}>{score}</span>
          <span className="font-mono text-muted-foreground/40" style={{ fontSize: size * 0.12 }}>/100</span>
        </div>
      </div>
      <span className="text-[10px] font-mono" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Category Donut ────────────────────────────────────────────────────────────

export function CategoryDonut({ passed, total, category, onClick, active }: {
  passed: number; total: number; category: string; onClick: () => void; active: boolean;
}) {
  const pct  = total > 0 ? passed / total : 0;
  const r    = 17;
  const circ = 2 * Math.PI * r;
  // Blue-palette scoring colors
  const col  = pct >= 0.8 ? "oklch(0.6907 0.1300 248.5133)" : pct >= 0.5 ? "#eab308" : "#ef4444";
  const Icon = CATEGORY_ICONS[category] ?? Bug;

  return (
    <button
      onClick={onClick}
      aria-label={`${category}: ${Math.round(pct * 100)}%`}
      aria-pressed={active}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all touch-manipulation ${
        active ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"
      }`}
    >
      <div className="relative inline-flex items-center justify-center">
        <svg width="44" height="44" className="-rotate-90" aria-hidden="true">
          <circle cx="22" cy="22" r={r} stroke="currentColor" strokeOpacity="0.1" strokeWidth="5" fill="none" />
          <circle
            cx="22" cy="22" r={r} stroke={col} strokeWidth="5" fill="none"
            strokeDasharray={circ} strokeDashoffset={circ - pct * circ} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute"><Icon className="h-3 w-3 text-muted-foreground" /></div>
      </div>
      <p className="text-[10px] font-mono font-bold tabular-nums" style={{ color: col }}>{Math.round(pct * 100)}%</p>
      <p className="text-[9px] font-mono text-muted-foreground capitalize leading-tight">{category.replace("_", " ")}</p>
    </button>
  );
}

// ─── Perf Gauge Row ────────────────────────────────────────────────────────────

const PERF_MAX: Record<string, number> = { LCP: 6000, TTFB: 3000, DCL: 5000, Load: 6000, CLS: 0.5 };

export function PerfGaugeRow({ label, value, unit, status }: {
  label: string; value: number | null; unit: string; status: string;
}) {
  const max     = PERF_MAX[label] ?? 1000;
  const pct     = value === null ? 0 : Math.min(100, (value / max) * 100);
  const display = value === null ? "—" : unit === "ms" ? `${Math.round(value).toLocaleString()}ms` : value.toFixed(3);

  return (
    <div className="flex items-center gap-3" role="meter" aria-label={`${label}: ${display}`}>
      <div className="w-8 text-[10px] font-mono text-muted-foreground shrink-0">{label}</div>
      <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
        {value !== null && (
          <div
            className={`h-full rounded-full transition-all duration-700 ${statusBg(status)}`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <div className={`w-20 text-right text-[10px] font-mono font-bold shrink-0 ${statusColor(status)}`}>{display}</div>
      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusBg(status)}`} title={status} />
    </div>
  );
}

// ─── Trend Sparkline ───────────────────────────────────────────────────────────

export function TrendSparkline({ data }: { data: TrendDataPoint[] }) {
  if (data.length < 2) return (
    <div className="h-16 flex items-center justify-center text-[10px] font-mono text-muted-foreground">
      run more tests to see trend
    </div>
  );

  const scores = data.map((d) => d.score ?? 0);
  const min    = Math.min(...scores);
  const max    = Math.max(...scores);
  const range  = max - min || 1;
  const w = 300, h = 60, pad = 8;

  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: h - pad - (((d.score ?? 0) - min) / range) * (h - pad * 2),
    d,
  }));

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length - 1]!.x},${h} L${pts[0]!.x},${h} Z`;
  const score = pts[pts.length - 1]!.d.score ?? 0;
  // Buildify blue for the sparkline
  const color = score >= 90 ? "oklch(0.6907 0.1300 248.5133)" : score >= 70 ? "#eab308" : "#ef4444";

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0"    />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkGrad)" />
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p) => (
          <circle
            key={p.d.runId}
            cx={p.x} cy={p.y}
            r={p.d.isCurrent ? 4 : 2.5}
            fill={p.d.isCurrent ? color : "hsl(var(--card))"}
            stroke={color} strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="flex justify-between mt-1 text-[10px] font-mono text-muted-foreground/40">
        <span>{new Date(data[0]!.date).toLocaleDateString()}</span>
        <span style={{ color }} className="font-bold">latest: {score}</span>
        <span>{new Date(data[data.length - 1]!.date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// ─── Test card border helper ───────────────────────────────────────────────────

function tcBorderClass(status: string) {
  if (status === "passed")  return "border-primary/20 bg-primary/[0.03]";
  if (status === "failed")  return "border-red-500/20 bg-red-500/[0.03]";
  if (status === "flaky")   return "border-yellow-500/20 bg-yellow-500/[0.03]";
  if (status === "running") return "border-secondary/20 bg-secondary/[0.03]";
  return "border-border bg-muted/20";
}

// ─── Live Test Case Card ───────────────────────────────────────────────────────

export function LiveTestCaseCard({ tc }: { tc: LiveTestCase }) {
  const [expanded, setExpanded] = useState(false);
  const cfg         = STATUS_CONFIG[tc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const StatusIcon  = cfg.icon;
  const Icon        = CATEGORY_ICONS[tc.category] ?? FlaskConical;
  const priorityCfg = PRIORITY_CONFIG[tc.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.P2;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${tcBorderClass(tc.status)}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors touch-manipulation"
      >
        <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color} ${tc.status === "running" ? "animate-spin" : ""}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <BfyTag className={`${cfg.bg} ${cfg.color}`}>{cfg.label}</BfyTag>
            <BfyTag className={priorityCfg.color}>{tc.priority}</BfyTag>
            <BfyTag className="text-muted-foreground border-border bg-muted/50">
              <Icon className="h-2.5 w-2.5" />
              {tc.category.replace("_", " ")}
            </BfyTag>
            {tc.durationMs !== undefined && (
              <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto">
                {(tc.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground leading-snug">{tc.title}</p>
        </div>
        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
        }
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-border pt-3 space-y-2">
          <div>
            <p className="text-[9px] font-mono text-muted-foreground/40 mb-1 uppercase tracking-widest">steps</p>
            <ol className="space-y-1">
              {tc.steps.map((s, i) => (
                <li key={i} className="text-xs font-mono text-muted-foreground flex gap-2">
                  <span className="text-muted-foreground/30 shrink-0">{i + 1}.</span>{s}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-[9px] font-mono text-muted-foreground/40 mb-1 uppercase tracking-widest">expected</p>
            <p className="text-xs font-mono text-muted-foreground">{tc.expected_result}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Test Case Card ────────────────────────────────────────────────────────────

export function TestCaseCard({ tc, liveStatus }: { tc: TestCase; liveStatus?: { status: string; durationMs?: number } }) {
  const [isOpen, setIsOpen] = useState(false);
  const result      = tc.results?.[0];
  const status      = liveStatus?.status ?? result?.status ?? "skipped";
  const Icon        = CATEGORY_ICONS[tc.category] ?? FlaskConical;
  const priorityCfg = PRIORITY_CONFIG[tc.priority] ?? PRIORITY_CONFIG.P2;
  const cfg         = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.skipped;
  const StatusIcon  = cfg.icon;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${tcBorderClass(status)}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors touch-manipulation"
      >
        <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color} ${status === "running" ? "animate-spin" : ""}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <BfyTag className={`${cfg.bg} ${cfg.color}`}>{cfg.label}</BfyTag>
            <BfyTag className={priorityCfg.color}>{tc.priority}</BfyTag>
            <BfyTag className="text-muted-foreground border-border bg-muted/50">
              <Icon className="h-2.5 w-2.5" />
              {tc.category.replace("_", " ")}
            </BfyTag>
            {(liveStatus?.durationMs ?? result?.duration_ms) && (
              <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto">
                {((liveStatus?.durationMs ?? result?.duration_ms ?? 0) / 1000).toFixed(1)}s
                {result && result.retry_count > 0 && ` · ${result.retry_count}×`}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground leading-snug">{tc.title}</p>
          {result?.actual_result && (
            <p className="mt-0.5 text-[10px] font-mono text-muted-foreground/40 truncate">{result.actual_result}</p>
          )}
        </div>
        {isOpen
          ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
        }
      </button>
      {isOpen && (
        <div className="px-3 pb-3 border-t border-border pt-3 space-y-3">
          {tc.description && <p className="text-xs font-mono text-muted-foreground">{tc.description}</p>}
          <div>
            <p className="text-[9px] font-mono text-muted-foreground/40 mb-1 uppercase tracking-widest">steps</p>
            <ol className="space-y-1">
              {tc.steps.map((s, i) => (
                <li key={i} className="text-xs font-mono text-muted-foreground flex gap-2">
                  <span className="text-muted-foreground/30 shrink-0">{i + 1}.</span>{s}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-[9px] font-mono text-muted-foreground/40 mb-1 uppercase tracking-widest">expected</p>
            <p className="text-xs font-mono text-muted-foreground">{tc.expected_result}</p>
          </div>
          {result && (
            <div className={`rounded-lg border p-3 ${cfg.bg}`}>
              <p className={`text-[9px] font-mono mb-1 uppercase tracking-widest ${cfg.color}`}>actual</p>
              <p className="text-xs font-mono text-foreground">{result.actual_result}</p>
              {/* {result.error_details && (
                <p className="mt-1.5 text-[10px] font-mono text-red-500">{result.error_details}</p>
              )} actual result and error detail has same output so one is commented out */} 
            </div>
          )}
          {result?.console_logs && result.console_logs.length > 0 && (
            <div>
              <p className="text-[9px] font-mono text-muted-foreground/40 mb-1 uppercase tracking-widest flex items-center gap-1">
                <Terminal className="h-3 w-3" /> console
              </p>
              <div className="rounded-lg bg-muted border border-border p-2 space-y-0.5 max-h-28 overflow-y-auto">
                {result.console_logs.map((log, i) => (
                  <p key={i} className="text-[10px] font-mono text-muted-foreground">{log}</p>
                ))}
              </div>
            </div>
          )}
          {result?.network_logs && result.network_logs.length > 0 && (
            <div>
              <p className="text-[9px] font-mono text-muted-foreground/40 mb-1 uppercase tracking-widest flex items-center gap-1">
                <Wifi className="h-3 w-3" /> network errors
              </p>
              <div className="space-y-1">
                {result.network_logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] font-mono rounded-md bg-muted border border-border px-2 py-1.5 flex-wrap sm:flex-nowrap">
                    <span className={`shrink-0 px-1 py-0.5 rounded ${
                      (log.status ?? 0) >= 500 ? "bg-red-500/20 text-red-500" : "bg-orange-500/20 text-orange-500"
                    }`}>
                      {log.status ?? "ERR"}
                    </span>
                    <span className="text-muted-foreground shrink-0">{log.method}</span>
                    <span className="text-muted-foreground/40 truncate flex-1 min-w-0">{log.url}</span>
                    {log.durationMs !== null && (
                      <span className="text-muted-foreground/30 shrink-0">{log.durationMs}ms</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Review Test Case Form ─────────────────────────────────────────────────────

export interface EditFormState {
  title: string; category: string; priority: "P0" | "P1" | "P2";
  steps: string[]; expectedResult: string; description: string;
}

export function ReviewTestCaseForm({ initial, onSave, onCancel, isSaving }: {
  initial: EditFormState; onSave: (data: EditFormState) => void; onCancel: () => void; isSaving: boolean;
}) {
  const [form, setForm] = useState<EditFormState>(initial);

  const setStep    = (i: number, val: string) => setForm((f) => ({ ...f, steps: f.steps.map((s, idx) => idx === i ? val : s) }));
  const addStep    = () => setForm((f) => ({ ...f, steps: [...f.steps, ""] }));
  const removeStep = (i: number) => setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));

  const selectClass =
    "w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 transition-colors";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1">
          <label className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest" htmlFor="tc-title">
            Title *
          </label>
          <input
            id="tc-title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. login form submits correctly"
            className={`${bfyInput} h-9`}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest" htmlFor="tc-cat">
            Category *
          </label>
          <select
            id="tc-cat"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className={selectClass}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest" htmlFor="tc-pri">
            Priority
          </label>
          <select
            id="tc-pri"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as "P0" | "P1" | "P2" }))}
            className={selectClass}
          >
            <option value="P0">P0 — Critical</option>
            <option value="P1">P1 — High</option>
            <option value="P2">P2 — Normal</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">Steps *</label>
          <button
            type="button"
            onClick={addStep}
            className="text-[10px] font-mono text-primary hover:text-primary/70 flex items-center gap-1 touch-manipulation"
          >
            <Plus className="h-3 w-3" /> add step
          </button>
        </div>
        <div className="space-y-1.5">
          {form.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground/30 w-5 shrink-0 text-right">{i + 1}.</span>
              <input
                value={step}
                onChange={(e) => setStep(i, e.target.value)}
                placeholder={`step ${i + 1}`}
                aria-label={`Step ${i + 1}`}
                className={`${bfyInput} h-8 flex-1`}
              />
              <button
                type="button"
                onClick={() => removeStep(i)}
                disabled={form.steps.length <= 1}
                aria-label={`Remove step ${i + 1}`}
                className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground/30 hover:text-red-500 disabled:opacity-20 touch-manipulation"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest" htmlFor="tc-exp">
          Expected Result *
        </label>
        <textarea
          id="tc-exp"
          value={form.expectedResult}
          onChange={(e) => setForm((f) => ({ ...f, expectedResult: e.target.value }))}
          placeholder="what should happen?"
          rows={2}
          className={`${bfyInput} py-2 resize-none`}
        />
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest" htmlFor="tc-desc">
          Description <span className="normal-case">(optional)</span>
        </label>
        <textarea
          id="tc-desc"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="additional context"
          rows={2}
          className={`${bfyInput} py-2 resize-none`}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-3 rounded-md border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-colors touch-manipulation"
        >
          cancel
        </button>
        <button
          type="button"
          disabled={isSaving || !form.title.trim() || !form.expectedResult.trim() || form.steps.every((s) => !s.trim())}
          onClick={() => onSave(form)}
          className="h-8 px-4 rounded-md bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-manipulation flex items-center gap-1.5"
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {isSaving ? "saving…" : "save"}
        </button>
      </div>
    </div>
  );
}

// ─── Review Test Case Card ─────────────────────────────────────────────────────

export function ReviewTestCaseCard({ tc, testRunId, totalCount }: {
  tc: ReviewTestCase; testRunId: string; totalCount: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const { mutate: updateFn, isPending: isUpdating } = useUpdateTestCase(testRunId);
  const { mutate: deleteFn, isPending: isDeleting } = useDeleteTestCase(testRunId);

  const Icon        = CATEGORY_ICONS[tc.category ?? ""] ?? FlaskConical;
  const priorityCfg = PRIORITY_CONFIG[(tc.priority ?? "P2") as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.P2;

  const handleSave = (data: EditFormState) => updateFn(
    {
      caseId: tc.id, title: data.title, category: data.category, priority: data.priority,
      steps: data.steps.filter((s) => s.trim()), expectedResult: data.expectedResult,
      description: data.description || undefined,
    },
    { onSuccess: () => { setEditing(false); toast.success("Updated"); }, onError: (err) => toast.error(err.message ?? "Failed") }
  );

  const handleDelete = () => {
    if (totalCount <= 1) { toast.error("Can't delete the last test case"); return; }
    deleteFn(tc.id, { onSuccess: () => toast.info("Removed"), onError: (err) => toast.error(err.message ?? "Failed") });
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      <div className="flex items-start gap-2.5 p-3">
        <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <BfyTag className={priorityCfg.color}>{tc.priority ?? "P2"}</BfyTag>
            <BfyTag className="text-muted-foreground border-border bg-muted/50">
              <Icon className="h-2.5 w-2.5" />
              {(tc.category ?? "general").replace("_", " ")}
            </BfyTag>
          </div>
          <p className="text-sm font-medium text-foreground leading-snug">{tc.title ?? "(untitled)"}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => { setEditing(!editing); setExpanded(false); }}
            aria-label={editing ? "Close" : "Edit"}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all touch-manipulation"
          >
            {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || totalCount <= 1}
            aria-label="Delete"
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 disabled:opacity-20 touch-manipulation"
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
          {!editing && (
            <button
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={expanded ? "Collapse" : "Expand"}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all touch-manipulation"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {expanded && !editing && (
        <div className="px-3 pb-3 border-t border-border pt-3 space-y-2">
          {tc.description && <p className="text-xs font-mono text-muted-foreground">{tc.description}</p>}
          {(tc.steps?.length ?? 0) > 0 && (
            <div>
              <p className="text-[9px] font-mono text-muted-foreground/40 mb-1 uppercase tracking-widest">steps</p>
              <ol className="space-y-1">
                {(tc.steps ?? []).map((s, i) => (
                  <li key={i} className="text-xs font-mono text-muted-foreground flex gap-2">
                    <span className="text-muted-foreground/30 shrink-0">{i + 1}.</span>{s}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {tc.expected_result && (
            <div>
              <p className="text-[9px] font-mono text-muted-foreground/40 mb-1 uppercase tracking-widest">expected</p>
              <p className="text-xs font-mono text-muted-foreground">{tc.expected_result}</p>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="px-3 pb-3 border-t border-border pt-3">
          <ReviewTestCaseForm
            initial={{
              title: tc.title ?? "", category: tc.category ?? "navigation",
              priority: (tc.priority ?? "P2") as "P0" | "P1" | "P2",
              steps: (tc.steps ?? [""]).length > 0 ? (tc.steps ?? [""]) : [""],
              expectedResult: tc.expected_result ?? "", description: tc.description ?? "",
            }}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
            isSaving={isUpdating}
          />
        </div>
      )}
    </div>
  );
}

// ─── Add Test Case Panel ───────────────────────────────────────────────────────

export function AddTestCasePanel({ testRunId, onClose }: { testRunId: string; onClose: () => void }) {
  const { mutate: createFn, isPending } = useCreateTestCase(testRunId);

  const handleSave = (data: EditFormState) => createFn(
    {
      title: data.title, category: data.category, priority: data.priority,
      steps: data.steps.filter((s) => s.trim()), expectedResult: data.expectedResult,
      description: data.description || undefined,
    },
    { onSuccess: () => { toast.success("Test case added"); onClose(); }, onError: (err) => toast.error(err.message ?? "Failed") }
  );

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Plus className="h-4 w-4 text-primary" />
        <p className="text-xs font-mono text-primary">new test case</p>
      </div>
      <ReviewTestCaseForm
        initial={{ title: "", category: "navigation", priority: "P1", steps: [""], expectedResult: "", description: "" }}
        onSave={handleSave}
        onCancel={onClose}
        isSaving={isPending}
      />
    </div>
  );
}

// ─── Review Phase ──────────────────────────────────────────────────────────────

export function ReviewPhase({ testRunId, targetUrl, onCancel }: {
  testRunId: string; targetUrl: string; onCancel: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const { data: cases, isLoading }         = useReviewTestCases(testRunId, true);
  const { mutate: confirmFn, isPending: isConfirming } = useConfirmAndExecute(testRunId);
  const { mutate: cancelFn,  isPending: isCancelling  } = useCancelTestRun();
  const count = cases?.length ?? 0;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <FlaskConical className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono font-medium text-foreground">
            review {count} test case{count !== 1 ? "s" : ""}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground truncate">{targetUrl}</p>
        </div>
        <button
          disabled={isConfirming || count === 0}
          onClick={() => confirmFn(undefined, {
            onSuccess: () => toast.success("Running tests…"),
            onError: (err) => toast.error(err.message ?? "Failed"),
          })}
          className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-mono font-bold hover:bg-primary/90 active:scale-95 disabled:opacity-30 shrink-0 touch-manipulation"
        >
          {isConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          {isConfirming ? "starting…" : `run ${count}`}
        </button>
      </div>

      {isLoading
        ? <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        : <div className="space-y-2">
            {(cases ?? []).map((tc) => (
              <ReviewTestCaseCard key={tc.id} tc={tc} testRunId={testRunId} totalCount={count} />
            ))}
            {count === 0 && (
              <div className="rounded-xl border border-border p-6 text-center">
                <FlaskConical className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs font-mono text-muted-foreground">no test cases — add at least one</p>
              </div>
            )}
          </div>
      }

      {showAdd && <AddTestCasePanel testRunId={testRunId} onClose={() => setShowAdd(false)} />}

      <div className="flex items-center gap-3 flex-wrap">
        {!showAdd && (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:border-primary/30 transition-all touch-manipulation"
          >
            <Plus className="h-3.5 w-3.5" /> add test case
          </button>
        )}
        <button
          onClick={() => cancelFn(testRunId, {
            onSuccess: (d) => { if (d.cancelled) { toast.info("Cancelled."); onCancel(); } },
            onError: (err) => toast.error(err.message ?? "Failed"),
          })}
          className="inline-flex items-center gap-1.5 ml-auto h-8 px-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-mono hover:bg-red-500/10 active:scale-95 touch-manipulation"
        >
          <X className="h-3.5 w-3.5" /> cancel run
        </button>
      </div>
    </div>
  );
}

// ─── Bug Detail Modal ──────────────────────────────────────────────────────────

export function BugDetailModal({ bug, onClose }: { bug: BugType; onClose: () => void }) {
  const cfg  = SEVERITY_CONFIG[bug.severity] ?? SEVERITY_CONFIG.medium;
  const Icon = CATEGORY_ICONS[bug.category] ?? Bug;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog" aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        className="relative z-10 w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 bg-border rounded-full" />
        </div>

        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-background">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <BfyTag className={`${cfg.color} gap-1`}>
                <div className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </BfyTag>
              <BfyTag className="text-muted-foreground border-border bg-muted/50">
                <Icon className="h-2.5 w-2.5" />{bug.category}
              </BfyTag>
              <BfyTag className={
                bug.status === "open"  ? "text-red-500 border-red-500/25 bg-red-500/10"
                : bug.status === "fixed" ? "text-primary border-primary/25 bg-primary/10"
                : "text-muted-foreground border-border bg-muted/50"
              }>
                {bug.status}
              </BfyTag>
            </div>
            <h3 className="text-sm font-medium text-foreground">{bug.title}</h3>
            <a
              href={bug.page_url} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5 transition-colors break-all"
            >
              {bug.page_url}<ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
          <button
            onClick={onClose} aria-label="Close"
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground touch-manipulation shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {bug.screenshot_url && (
            <div>
              <p className="text-[9px] font-mono text-muted-foreground/40 mb-2 uppercase tracking-widest">screenshot</p>
              <BugScreenshot url={bug.screenshot_url} alt={`Screenshot: ${bug.title}`} />
            </div>
          )}
          {bug.description && (
            <div>
              <p className="text-[9px] font-mono text-muted-foreground/40 mb-1.5 uppercase tracking-widest">description</p>
              <p className="text-sm font-mono text-muted-foreground leading-relaxed">{bug.description}</p>
            </div>
          )}
          {bug.reproduction_steps?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest">steps to reproduce</p>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(bug.reproduction_steps.join("\n"));
                    setCopied(true); setTimeout(() => setCopied(false), 2000);
                  }}
                  aria-label="Copy"
                  className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground touch-manipulation"
                >
                  {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                  {copied ? "copied" : "copy"}
                </button>
              </div>
              <ol className="space-y-2">
                {bug.reproduction_steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm font-mono">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {bug.ai_fix_suggestion && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <p className="text-[9px] font-mono text-primary uppercase tracking-widest">ai fix suggestion</p>
              </div>
              <div className="text-xs font-mono text-foreground bg-muted rounded-lg p-3 border border-border whitespace-pre-wrap">
                {bug.ai_fix_suggestion}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bug Card ──────────────────────────────────────────────────────────────────

export function BugCard({ bug, onClick }: { bug: BugType; onClick: () => void }) {
  const cfg  = SEVERITY_CONFIG[bug.severity] ?? SEVERITY_CONFIG.medium;
  const Icon = CATEGORY_ICONS[bug.category] ?? Bug;
  const [thumbFailed, setThumbFailed] = useState(false);

  return (
    <button
      onClick={onClick}
      aria-label={`${cfg.label} bug: ${bug.title}`}
      className="w-full flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/20 text-left hover:bg-muted/50 transition-all group touch-manipulation"
    >
      <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          <BfyTag className={cfg.color}>{cfg.label}</BfyTag>
          <BfyTag className="text-muted-foreground border-border bg-muted/50">
            <Icon className="h-2.5 w-2.5" />{bug.category}
          </BfyTag>
        </div>
        <p className="text-sm font-medium text-foreground leading-snug">{bug.title}</p>
        <p className="mt-0.5 text-[10px] font-mono text-muted-foreground/40 truncate">{bug.page_url}</p>
        {bug.ai_fix_suggestion && (
          <p className="mt-1 text-[10px] font-mono text-primary/60 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> ai fix available
          </p>
        )}
      </div>
      {bug.screenshot_url && !thumbFailed && (
        <div className="shrink-0 h-14 w-20 rounded-lg overflow-hidden border border-border bg-muted">
          <img
            src={bug.screenshot_url} alt="" loading="lazy" decoding="async"
            crossOrigin="anonymous" referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-top"
            onError={() => setThumbFailed(true)}
          />
        </div>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground/20 shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}
