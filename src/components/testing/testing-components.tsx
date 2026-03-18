"use client";

import { useState, useEffect } from "react";
import {
  Globe, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, ExternalLink, Shield, Zap,
  Eye, Navigation, FileText, Lock, Bug, Sparkles,
  Clock, BarChart3, FlaskConical, Terminal, Wifi, TrendingUp,
  Activity, History, ChevronRight, X, StopCircle, ImageOff,
  Minus, Plus, Pencil, Trash2, Check, Copy, ArrowRight,
  Search, FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// ─── Constants ────────────────────────────────────────────────────────────────

export const CATEGORY_ICONS: Record<string, React.ElementType> = {
  navigation: Navigation, forms: FileText, visual: Eye,
  performance: Zap, a11y: Shield, security: Lock,
  auth: Lock, responsive: Eye, accessibility: Shield, error_handling: AlertTriangle,
};

export const SEVERITY_CONFIG = {
  critical: { color: "bg-red-500/15 text-red-400 border-red-500/30",         dot: "bg-red-500",    label: "Critical" },
  high:     { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", dot: "bg-orange-500", label: "High"     },
  medium:   { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500", label: "Medium"   },
  low:      { color: "bg-blue-500/15 text-blue-400 border-blue-500/30",       dot: "bg-blue-400",   label: "Low"      },
};

export const PRIORITY_CONFIG = {
  P0: { color: "text-red-400 bg-red-500/10 border-red-500/20"          },
  P1: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  P2: { color: "text-muted-foreground bg-muted/50 border-border"       },
};

export const STATUS_CONFIG = {
  pending:  { icon: Clock,         color: "text-muted-foreground",  bg: "bg-muted/50 border-border",                 label: "Pending"  },
  running:  { icon: Loader2,       color: "text-blue-400",          bg: "bg-blue-500/10 border-blue-500/20",         label: "Running"  },
  passed:   { icon: CheckCircle2,  color: "text-emerald-400",       bg: "bg-emerald-500/10 border-emerald-500/20",   label: "Passed"   },
  failed:   { icon: XCircle,       color: "text-red-400",           bg: "bg-red-500/10 border-red-500/20",           label: "Failed"   },
  flaky:    { icon: AlertTriangle, color: "text-yellow-400",        bg: "bg-yellow-500/10 border-yellow-500/20",     label: "Flaky"    },
  skipped:  { icon: Clock,         color: "text-muted-foreground",  bg: "bg-muted/50 border-border",                 label: "Skipped"  },
};

export const CATEGORIES = ["navigation", "forms", "visual", "performance", "a11y", "security"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function statusBg(s: string) {
  if (s === "good") return "bg-emerald-500";
  if (s === "needs-improvement") return "bg-yellow-500";
  if (s === "poor") return "bg-red-500";
  return "bg-muted-foreground/30";
}

export function statusColor(s: string) {
  if (s === "good") return "text-emerald-400";
  if (s === "needs-improvement") return "text-yellow-400";
  if (s === "poor") return "text-red-400";
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

// ─── Budget Stepper ───────────────────────────────────────────────────────────

export function BudgetStepper({
  label, hint, value, min, max, onChange,
}: {
  label: string; hint: string; value: number; min: number; max: number; onChange: (next: number) => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">{label}</span>
        <span className="text-xs font-mono text-muted-foreground/50">{hint}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
          className="h-7 w-7 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <Minus className="h-3 w-3" />
        </button>
        <div className="flex-1 h-7 rounded-lg border border-border bg-muted flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums text-foreground">{value}</span>
        </div>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
          className="h-7 w-7 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Timeout Stepper ──────────────────────────────────────────────────────────

export const TIMEOUT_MIN_MS  = 30_000;
export const TIMEOUT_MAX_MS  = 600_000;
export const TIMEOUT_STEP_MS = 30_000;

export function TimeoutStepper({
  label, hint, value, onChange,
}: {
  label: string; hint: string; value: number; onChange: (next: number) => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">{label}</span>
        <span className="text-xs font-mono text-muted-foreground/50">{hint}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button"
          onClick={() => onChange(Math.max(TIMEOUT_MIN_MS, value - TIMEOUT_STEP_MS))}
          disabled={value <= TIMEOUT_MIN_MS}
          className="h-7 w-7 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <Minus className="h-3 w-3" />
        </button>
        <div className="flex-1 h-7 rounded-lg border border-border bg-muted flex items-center justify-center">
          <span className="text-sm font-bold tabular-nums text-foreground">{fmtMs(value)}</span>
        </div>
        <button type="button"
          onClick={() => onChange(Math.min(TIMEOUT_MAX_MS, value + TIMEOUT_STEP_MS))}
          disabled={value >= TIMEOUT_MAX_MS}
          className="h-7 w-7 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── CrawlProgressPanel ───────────────────────────────────────────────────────

export function CrawlProgressPanel({
  stage, stageDescription, foundUrls, extractedPages, failedPages,
}: {
  stage: string | null;
  stageDescription: string | null;
  foundUrls: CrawlFoundUrl[];
  extractedPages: CrawlExtractedPage[];
  failedPages: CrawlFailedPage[];
}) {
  const [activeTab, setActiveTab] = useState<"urls" | "pages">("urls");

  useEffect(() => {
    if (extractedPages.length > 0) setActiveTab("pages");
  }, [extractedPages.length]);

  const sourceBadge = (source: CrawlFoundUrl["source"]) => {
    if (source === "discovery") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (source === "sitemap")   return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    return "text-muted-foreground bg-muted/50 border-border";
  };

  const hasData = foundUrls.length > 0 || extractedPages.length > 0 || failedPages.length > 0;
  if (!stage && !hasData) return null;

  return (
    <div className="w-full max-w-xl mx-auto rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/20">
        <Loader2 className="h-3.5 w-3.5 text-emerald-400 animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{stage ?? "Starting crawl…"}</p>
          {stageDescription && (
            <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{stageDescription}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
          <span className="text-muted-foreground/60">
            <span className="text-foreground font-semibold">{foundUrls.length}</span> URLs
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span className="text-muted-foreground/60">
            <span className="text-emerald-400 font-semibold">{extractedPages.length}</span> pages
          </span>
          {failedPages.length > 0 && (
            <><span className="text-muted-foreground/30">·</span>
            <span className="text-red-400 font-semibold">{failedPages.length} failed</span></>
          )}
        </div>
      </div>

      {hasData && (
        <>
          <div className="flex border-b border-border text-xs font-mono">
            {(["urls", "pages"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 transition-colors ${
                  activeTab === tab
                    ? "text-foreground border-b-2 border-emerald-500 -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                {tab === "urls" ? <Search className="h-3 w-3" /> : <FileSearch className="h-3 w-3" />}
                {tab === "urls" ? "URLs Found" : "Pages Extracted"}
                <span className="text-muted-foreground/50">
                  ({tab === "urls" ? foundUrls.length : extractedPages.length})
                </span>
              </button>
            ))}
          </div>

          <div className="max-h-52 overflow-y-auto">
            {activeTab === "urls" && (
              <div className="p-2 space-y-0.5">
                {foundUrls.length === 0
                  ? <p className="text-xs text-muted-foreground/40 font-mono text-center py-5">Waiting for URL discovery…</p>
                  : foundUrls.map((u, i) => (
                    <div key={`${u.url}-${i}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors group">
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                        u.source === "discovery" ? "bg-emerald-500" : u.source === "sitemap" ? "bg-blue-500" : "bg-muted-foreground/30"
                      }`} />
                      <span className="text-xs font-mono text-muted-foreground flex-1 truncate group-hover:text-foreground transition-colors">
                        {urlPath(u.url)}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border shrink-0 ${sourceBadge(u.source)}`}>
                        {u.source}
                      </span>
                    </div>
                  ))
                }
              </div>
            )}

            {activeTab === "pages" && (
              <div className="p-2 space-y-0.5">
                {extractedPages.length === 0 && failedPages.length === 0
                  ? <p className="text-xs text-muted-foreground/40 font-mono text-center py-5">Extraction in progress…</p>
                  : (
                    <>
                      {extractedPages.map((p, i) => (
                        <div key={`${p.url}-${i}`} className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{p.title || urlPath(p.url)}</p>
                            <p className="text-[10px] font-mono text-muted-foreground/50 truncate">{urlPath(p.url)}</p>
                            <div className="flex gap-2 mt-0.5 text-[10px] font-mono text-muted-foreground/40">
                              <span>{p.elementsCount} elements</span>
                              {p.formsCount > 0 && <span>· {p.formsCount} forms</span>}
                              <span>· {p.linksCount} links</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground/30 shrink-0 mt-0.5">{p.index}/{p.total}</span>
                        </div>
                      ))}
                      {failedPages.length > 0 && (
                        <>
                          <div className="px-2 pt-2 pb-0.5">
                            <p className="text-[10px] font-mono text-red-400/50 uppercase tracking-wider">Failed ({failedPages.length})</p>
                          </div>
                          {failedPages.map((p, i) => (
                            <div key={`${p.url}-fail-${i}`} className="flex items-start gap-2 px-2 py-1.5 rounded-lg">
                              <XCircle className="h-3.5 w-3.5 text-red-400/60 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-mono text-muted-foreground/50 truncate">{urlPath(p.url)}</p>
                                <p className="text-[10px] font-mono text-red-400/50 truncate">{p.reason}</p>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )
                }
              </div>
            )}
          </div>
        </>
      )}

      {!hasData && (
        <div className="flex items-center justify-center py-5">
          <p className="text-xs text-muted-foreground/40 font-mono">Initialising crawler…</p>
        </div>
      )}
    </div>
  );
}

// ─── Bug Screenshot ────────────────────────────────────────────────────────────

export function BugScreenshot({ url, alt = "Bug screenshot" }: { url: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (failed) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border text-muted-foreground text-xs font-mono">
        <ImageOff className="h-3.5 w-3.5" />
        <span>Screenshot unavailable</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto text-muted-foreground hover:text-foreground underline">open ↗</a>
      </div>
    );
  }
  return (
    <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <img src={url} alt={alt} crossOrigin="anonymous" referrerPolicy="no-referrer"
        className={`w-full object-cover object-top transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        style={{ maxHeight: "400px" }}
        onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      {loaded && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="absolute top-2 right-2 flex items-center gap-1 text-xs bg-background/80 text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg backdrop-blur-sm">
          <ExternalLink className="h-3 w-3" /> Full size
        </a>
      )}
    </div>
  );
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────

export function ScoreGauge({ score, size = 140 }: { score: number; size?: number }) {
  const r = size * 0.386; const cx = size / 2; const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "#22c55e" : score >= 70 ? "#eab308" : "#ef4444";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} stroke="currentColor" strokeWidth={size * 0.071} fill="none" className="text-muted/60" />
        <circle cx={cx} cy={cx} r={r} stroke={color} strokeWidth={size * 0.071} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`${size < 100 ? "text-xl" : "text-4xl"} font-bold tabular-nums`} style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground font-mono">/100</span>
      </div>
    </div>
  );
}

// ─── Category Donut ───────────────────────────────────────────────────────────

export function CategoryDonut({ passed, total, category, onClick, active }: {
  passed: number; total: number; category: string; onClick: () => void; active: boolean;
}) {
  const pct = total > 0 ? passed / total : 0; const r = 28; const circ = 2 * Math.PI * r;
  const col = pct >= 0.8 ? "#22c55e" : pct >= 0.5 ? "#eab308" : "#ef4444";
  const Icon = CATEGORY_ICONS[category] ?? Bug;
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${active ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-card hover:border-border/80"}`}>
      <div className="relative inline-flex items-center justify-center">
        <svg width="72" height="72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} stroke="currentColor" strokeWidth="7" fill="none" className="text-muted/60" />
          <circle cx="36" cy="36" r={r} stroke={col} strokeWidth="7" fill="none"
            strokeDasharray={circ} strokeDashoffset={circ - pct * circ} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div className="absolute"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      </div>
      <div className="text-center">
        <p className="text-xs font-bold tabular-nums" style={{ color: col }}>{Math.round(pct * 100)}%</p>
        <p className="text-xs text-muted-foreground capitalize">{category.replace("_", " ")}</p>
        <p className="text-xs text-muted-foreground/60 font-mono">{passed}/{total}</p>
      </div>
    </button>
  );
}

// ─── Perf Gauge Row ───────────────────────────────────────────────────────────

const PERF_MAX: Record<string, number> = { LCP: 6000, TTFB: 3000, DCL: 5000, Load: 6000, CLS: 0.5 };

export function PerfGaugeRow({ label, value, unit, status }: { label: string; value: number | null; unit: string; status: string; }) {
  const max = PERF_MAX[label] ?? 1000;
  const pct = value === null ? 0 : Math.min(100, (value / max) * 100);
  const display = value === null ? "—" : unit === "ms" ? `${Math.round(value).toLocaleString()}ms` : value.toFixed(3);
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 text-xs font-mono text-muted-foreground shrink-0">{label}</div>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        {value !== null && <div className={`h-full rounded-full transition-all duration-700 ${statusBg(status)}`} style={{ width: `${pct}%`, opacity: 0.85 }} />}
      </div>
      <div className={`w-20 text-right text-xs font-mono font-bold ${statusColor(status)}`}>{display}</div>
      <div className={`h-2 w-2 rounded-full shrink-0 ${statusBg(status)}`} />
    </div>
  );
}

// ─── Trend Sparkline ──────────────────────────────────────────────────────────

export function TrendSparkline({ data }: { data: TrendDataPoint[] }) {
  if (data.length < 2) return <div className="h-16 flex items-center justify-center text-xs text-muted-foreground font-mono">Run more tests to see trend</div>;
  const scores = data.map((d) => d.score ?? 0); const min = Math.min(...scores), max = Math.max(...scores), range = max - min || 1;
  const w = 300, h = 64, pad = 8;
  const pts = data.map((d, i) => ({ x: pad + (i / (data.length - 1)) * (w - pad * 2), y: h - pad - (((d.score ?? 0) - min) / range) * (h - pad * 2), d }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${path} L${pts[pts.length - 1]!.x},${h} L${pts[0]!.x},${h} Z`;
  const score = pts[pts.length - 1]!.d.score ?? 0;
  const color = score >= 90 ? "#22c55e" : score >= 70 ? "#eab308" : "#ef4444";
  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        <defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill="url(#sparkGrad)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p) => <circle key={p.d.runId} cx={p.x} cy={p.y} r={p.d.isCurrent ? 5 : 3} fill={p.d.isCurrent ? color : "var(--card)"} stroke={color} strokeWidth="1.5" />)}
      </svg>
      <div className="flex justify-between text-xs font-mono text-muted-foreground mt-1">
        <span>{new Date(data[0]!.date).toLocaleDateString()}</span>
        <span className={`font-bold ${score >= 90 ? "text-emerald-400" : score >= 70 ? "text-yellow-400" : "text-red-400"}`}>Latest: {score}</span>
        <span>{new Date(data[data.length - 1]!.date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// ─── Live Test Case Card ──────────────────────────────────────────────────────

export function LiveTestCaseCard({ tc }: { tc: LiveTestCase }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[tc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const Icon = CATEGORY_ICONS[tc.category] ?? FlaskConical;
  const priorityCfg = PRIORITY_CONFIG[tc.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.P2;
  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
      tc.status === "passed"  ? "border-emerald-500/20 bg-emerald-500/5"
      : tc.status === "failed"  ? "border-red-500/20 bg-red-500/5"
      : tc.status === "flaky"   ? "border-yellow-500/20 bg-yellow-500/5"
      : tc.status === "running" ? "border-blue-500/20 bg-blue-500/5 animate-pulse"
      : "border-border bg-card/40"
    }`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors">
        <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color} ${tc.status === "running" ? "animate-spin" : ""}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-mono ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-mono ${priorityCfg.color}`}>{tc.priority}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Icon className="h-3 w-3" />{tc.category.replace("_", " ")}
            </span>
            {tc.durationMs !== undefined && <span className="text-xs text-muted-foreground font-mono ml-auto">{(tc.durationMs / 1000).toFixed(1)}s</span>}
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground">{tc.title}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-3">
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Test Steps</p>
            <ol className="space-y-1.5">
              {tc.steps.map((step, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-muted-foreground/50 font-mono shrink-0">{i + 1}.</span>{step}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">Expected</p>
            <p className="text-xs text-muted-foreground">{tc.expected_result}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Test Case Card ───────────────────────────────────────────────────────────

export function TestCaseCard({ tc, liveStatus }: { tc: TestCase; liveStatus?: { status: string; durationMs?: number } }) {
  const [expanded, setExpanded] = useState(false);
  const result = tc.results?.[0];
  const status = liveStatus?.status ?? result?.status ?? "skipped";
  const Icon = CATEGORY_ICONS[tc.category] ?? FlaskConical;
  const priorityCfg = PRIORITY_CONFIG[tc.priority] ?? PRIORITY_CONFIG.P2;
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.skipped;
  const StatusIcon = cfg.icon;
  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
      status === "passed"  ? "border-emerald-500/20 bg-emerald-500/5"
      : status === "failed"  ? "border-red-500/20 bg-red-500/5"
      : status === "flaky"   ? "border-yellow-500/20 bg-yellow-500/5"
      : status === "running" ? "border-blue-500/20 bg-blue-500/5"
      : "border-border bg-card/40"
    }`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors">
        <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color} ${status === "running" ? "animate-spin" : ""}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-mono ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-mono ${priorityCfg.color}`}>{tc.priority}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Icon className="h-3 w-3" />{tc.category.replace("_", " ")}
            </span>
            {(liveStatus?.durationMs ?? result?.duration_ms) && (
              <span className="text-xs text-muted-foreground font-mono ml-auto">
                {((liveStatus?.durationMs ?? result?.duration_ms ?? 0) / 1000).toFixed(1)}s
                {result && result.retry_count > 0 && ` · ${result.retry_count} retr${result.retry_count === 1 ? "y" : "ies"}`}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground">{tc.title}</p>
          {result?.actual_result && <p className="mt-0.5 text-xs text-muted-foreground truncate">{result.actual_result}</p>}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
          {tc.description && <p className="text-sm text-muted-foreground">{tc.description}</p>}
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Test Steps</p>
            <ol className="space-y-1.5">
              {tc.steps.map((step, i) => <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-muted-foreground/50 font-mono shrink-0">{i + 1}.</span>{step}</li>)}
            </ol>
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">Expected</p>
            <p className="text-xs text-muted-foreground">{tc.expected_result}</p>
          </div>
          {result && (
            <div className={`rounded-lg border p-3 ${cfg.bg}`}>
              <p className={`text-xs font-mono mb-1 uppercase tracking-wider ${cfg.color}`}>Actual Result</p>
              <p className="text-xs text-foreground">{result.actual_result}</p>
              {result.error_details && <p className="mt-2 text-xs text-red-400 font-mono">{result.error_details}</p>}
            </div>
          )}
          {result?.console_logs && result.console_logs.length > 0 && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1.5 uppercase tracking-wider flex items-center gap-1"><Terminal className="h-3 w-3" /> Console Logs</p>
              <div className="rounded-lg bg-muted border border-border p-2 space-y-0.5 max-h-32 overflow-y-auto">
                {result.console_logs.map((log, i) => <p key={i} className="text-xs font-mono text-muted-foreground">{log}</p>)}
              </div>
            </div>
          )}
          {result?.network_logs && result.network_logs.length > 0 && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1.5 uppercase tracking-wider flex items-center gap-1"><Wifi className="h-3 w-3" /> Network Errors</p>
              <div className="space-y-1">
                {result.network_logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono rounded bg-muted border border-border px-2 py-1.5">
                    <span className={`shrink-0 px-1 py-0.5 rounded ${(log.status ?? 0) >= 500 ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>{log.status ?? "ERR"}</span>
                    <span className="text-muted-foreground">{log.method}</span>
                    <span className="text-muted-foreground/60 truncate flex-1">{log.url}</span>
                    {log.durationMs !== null && <span className="text-muted-foreground/50 shrink-0">{log.durationMs}ms</span>}
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

// ─── Review Test Case Edit Form ───────────────────────────────────────────────

export interface EditFormState {
  title: string; category: string; priority: "P0" | "P1" | "P2";
  steps: string[]; expectedResult: string; description: string;
}

export function ReviewTestCaseForm({ initial, onSave, onCancel, isSaving }: {
  initial: EditFormState; onSave: (data: EditFormState) => void;
  onCancel: () => void; isSaving: boolean;
}) {
  const [form, setForm] = useState<EditFormState>(initial);
  const setStep = (i: number, val: string) => setForm((f) => ({ ...f, steps: f.steps.map((s, idx) => idx === i ? val : s) }));
  const addStep = () => setForm((f) => ({ ...f, steps: [...f.steps, ""] }));
  const removeStep = (i: number) => setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Title *</label>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Login form submits correctly" className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Category *</label>
          <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Priority</label>
          <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as "P0" | "P1" | "P2" }))}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="P0">P0 — Critical</option><option value="P1">P1 — High</option><option value="P2">P2 — Normal</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Steps *</label>
          <button type="button" onClick={addStep} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
            <Plus className="h-3 w-3" /> Add step
          </button>
        </div>
        <div className="space-y-2">
          {form.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground/50 w-5 shrink-0 text-right">{i + 1}.</span>
              <Input value={step} onChange={(e) => setStep(i, e.target.value)} placeholder={`Step ${i + 1}`} className="h-8 text-xs flex-1" />
              <button type="button" onClick={() => removeStep(i)} disabled={form.steps.length <= 1}
                className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Expected Result *</label>
        <textarea value={form.expectedResult} onChange={(e) => setForm((f) => ({ ...f, expectedResult: e.target.value }))}
          placeholder="What should happen when the test passes?" rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Description <span className="text-muted-foreground/40">(optional)</span></label>
        <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Additional context about this test case" rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground h-8 text-xs">Cancel</Button>
        <Button type="button" size="sm"
          disabled={isSaving || !form.title.trim() || !form.expectedResult.trim() || form.steps.every((s) => !s.trim())}
          onClick={() => onSave(form)}
          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5">
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ─── Review Test Case Card ────────────────────────────────────────────────────

export function ReviewTestCaseCard({ tc, testRunId, totalCount }: { tc: ReviewTestCase; testRunId: string; totalCount: number; }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const { mutate: updateFn, isPending: isUpdating } = useUpdateTestCase(testRunId);
  const { mutate: deleteFn, isPending: isDeleting } = useDeleteTestCase(testRunId);
  const Icon = CATEGORY_ICONS[tc.category ?? ""] ?? FlaskConical;
  const priorityCfg = PRIORITY_CONFIG[(tc.priority ?? "P2") as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.P2;

  const handleSave = (data: EditFormState) => {
    updateFn(
      { caseId: tc.id, title: data.title, category: data.category, priority: data.priority, steps: data.steps.filter((s) => s.trim()), expectedResult: data.expectedResult, description: data.description || undefined },
      { onSuccess: () => { setEditing(false); toast.success("Test case updated"); }, onError: (err) => toast.error(err.message ?? "Failed to update") },
    );
  };

  const handleDelete = () => {
    if (totalCount <= 1) { toast.error("Can't delete the last test case"); return; }
    deleteFn(tc.id, { onSuccess: () => toast.info("Test case removed"), onError: (err) => toast.error(err.message ?? "Failed to delete") });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden transition-all">
      <div className="flex items-start gap-3 p-4">
        <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-mono ${priorityCfg.color}`}>{tc.priority ?? "P2"}</span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Icon className="h-3 w-3" />{(tc.category ?? "general").replace("_", " ")}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground">{tc.title ?? "(untitled)"}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => { setEditing(!editing); setExpanded(false); }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
          <button onClick={handleDelete} disabled={isDeleting || totalCount <= 1}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </button>
          {!editing && (
            <button onClick={() => setExpanded(!expanded)}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
      {expanded && !editing && (
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-3">
          {tc.description && <p className="text-xs text-muted-foreground">{tc.description}</p>}
          {(tc.steps?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1.5 uppercase tracking-wider">Steps</p>
              <ol className="space-y-1">{(tc.steps ?? []).map((s, i) => <li key={i} className="text-xs text-muted-foreground flex gap-2"><span className="text-muted-foreground/40 font-mono shrink-0">{i + 1}.</span>{s}</li>)}</ol>
            </div>
          )}
          {tc.expected_result && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-1 uppercase tracking-wider">Expected</p>
              <p className="text-xs text-muted-foreground">{tc.expected_result}</p>
            </div>
          )}
        </div>
      )}
      {editing && (
        <div className="px-4 pb-4 border-t border-border pt-4">
          <ReviewTestCaseForm
            initial={{ title: tc.title ?? "", category: tc.category ?? "navigation", priority: (tc.priority ?? "P2") as "P0" | "P1" | "P2", steps: (tc.steps ?? [""]).length > 0 ? (tc.steps ?? [""]) : [""], expectedResult: tc.expected_result ?? "", description: tc.description ?? "" }}
            onSave={handleSave} onCancel={() => setEditing(false)} isSaving={isUpdating}
          />
        </div>
      )}
    </div>
  );
}

// ─── Add Test Case Panel ──────────────────────────────────────────────────────

export function AddTestCasePanel({ testRunId, onClose }: { testRunId: string; onClose: () => void }) {
  const { mutate: createFn, isPending } = useCreateTestCase(testRunId);

  const handleSave = (data: EditFormState) => {
    createFn(
      { title: data.title, category: data.category, priority: data.priority, steps: data.steps.filter((s) => s.trim()), expectedResult: data.expectedResult, description: data.description || undefined },
      { onSuccess: () => { toast.success("Test case added"); onClose(); }, onError: (err) => toast.error(err.message ?? "Failed to add test case") },
    );
  };

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Plus className="h-4 w-4 text-emerald-400" />
        <p className="text-sm font-medium text-emerald-400">Add Test Case</p>
      </div>
      <ReviewTestCaseForm
        initial={{ title: "", category: "navigation", priority: "P1", steps: [""], expectedResult: "", description: "" }}
        onSave={handleSave} onCancel={onClose} isSaving={isPending}
      />
    </div>
  );
}

// ─── Review Phase UI ──────────────────────────────────────────────────────────

export function ReviewPhase({ testRunId, targetUrl, onCancel }: { testRunId: string; targetUrl: string; onCancel: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const { data: cases, isLoading } = useReviewTestCases(testRunId, true);
  const { mutate: confirmFn, isPending: isConfirming } = useConfirmAndExecute(testRunId);
  const { mutate: cancelFn, isPending: isCancelling } = useCancelTestRun();
  const count = cases?.length ?? 0;

  const handleConfirm = () => confirmFn(undefined, {
    onSuccess: () => toast.success("Running tests…"),
    onError: (err) => toast.error(err.message ?? "Failed to confirm"),
  });

  const handleCancel = () => cancelFn(testRunId, {
    onSuccess: (data) => { if (data.cancelled) { toast.info("Test run cancelled."); onCancel(); } },
    onError: (err) => toast.error(err.message ?? "Failed to cancel"),
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
            <FlaskConical className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Review Generated Test Cases</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{targetUrl}</p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              AI generated <span className="text-foreground font-medium">{count} test case{count !== 1 ? "s" : ""}</span>. Review, edit, delete or add before execution.
            </p>
          </div>
        </div>
      </div>
      {isLoading
        ? <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        : (
          <div className="space-y-2">
            {(cases ?? []).map((tc) => <ReviewTestCaseCard key={tc.id} tc={tc} testRunId={testRunId} totalCount={count} />)}
            {count === 0 && (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <FlaskConical className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No test cases — add at least one to proceed</p>
              </div>
            )}
          </div>
        )
      }
      {showAdd && <AddTestCasePanel testRunId={testRunId} onClose={() => setShowAdd(false)} />}
      <div className="flex items-center gap-3 flex-wrap">
        {!showAdd && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-2 text-sm border-dashed">
            <Plus className="h-3.5 w-3.5" /> Add Test Case
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={isCancelling}
            className="border-red-900/60 text-red-400 hover:bg-red-950/40 hover:border-red-700 gap-2 text-sm">
            {isCancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            Cancel
          </Button>
          <Button size="sm" disabled={isConfirming || count === 0} onClick={handleConfirm}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 text-sm min-w-[140px]">
            {isConfirming
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting…</>
              : <><Zap className="h-3.5 w-3.5" /> Run {count} Test{count !== 1 ? "s" : ""}</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Bug Detail Modal ─────────────────────────────────────────────────────────

export function BugDetailModal({ bug, onClose }: { bug: BugType; onClose: () => void }) {
  const cfg = SEVERITY_CONFIG[bug.severity] ?? SEVERITY_CONFIG.medium;
  const Icon = CATEGORY_ICONS[bug.category] ?? Bug;
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 p-5 border-b border-border bg-background">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono ${cfg.color}`}>
                <div className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                <Icon className="h-3 w-3" />{bug.category}
              </span>
              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-mono ${
                bug.status === "open" ? "text-red-400 border-red-500/30 bg-red-500/10"
                : bug.status === "fixed" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                : "text-muted-foreground border-border bg-muted"
              }`}>{bug.status}</span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">{bug.title}</h3>
            <a href={bug.page_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1 font-mono">
              {bug.page_url}<ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          {bug.screenshot_url && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                <Eye className="h-3 w-3" /> Failure Screenshot
              </p>
              <BugScreenshot url={bug.screenshot_url} alt={`Screenshot of bug: ${bug.title}`} />
            </div>
          )}
          {bug.description && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Description</p>
              <p className="text-sm text-foreground leading-relaxed">{bug.description}</p>
            </div>
          )}
          {bug.reproduction_steps?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Steps to Reproduce</p>
                <button onClick={() => { void navigator.clipboard.writeText(bug.reproduction_steps.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <ol className="space-y-2">
                {bug.reproduction_steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-mono text-muted-foreground">{i + 1}</span>
                    <span className="text-foreground pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {bug.ai_fix_suggestion && (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <p className="text-xs font-mono text-emerald-400 uppercase tracking-wider">AI Fix Suggestion</p>
              </div>
              <div className="text-sm text-foreground font-mono bg-muted/60 rounded-lg p-3 border border-border whitespace-pre-wrap">
                {bug.ai_fix_suggestion}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bug Card ─────────────────────────────────────────────────────────────────

export function BugCard({ bug, onClick }: { bug: BugType; onClick: () => void }) {
  const cfg = SEVERITY_CONFIG[bug.severity] ?? SEVERITY_CONFIG.medium;
  const Icon = CATEGORY_ICONS[bug.category] ?? Bug;
  const [thumbFailed, setThumbFailed] = useState(false);
  return (
    <button onClick={onClick} className="w-full flex items-start gap-3 p-4 rounded-xl border border-border bg-card text-left hover:bg-muted/50 hover:border-border/80 transition-all group">
      <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono ${cfg.color}`}>{cfg.label}</span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            <Icon className="h-3 w-3" />{bug.category}
          </span>
        </div>
        <p className="text-sm font-medium text-foreground">{bug.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">{bug.page_url}</p>
        {bug.ai_fix_suggestion && (
          <p className="mt-1 text-xs text-emerald-500/70 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI fix available</p>
        )}
      </div>
      {bug.screenshot_url && !thumbFailed && (
        <div className="shrink-0 h-14 w-24 rounded-lg overflow-hidden border border-border bg-muted">
          <img src={bug.screenshot_url} alt="" crossOrigin="anonymous" referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-top" onError={() => setThumbFailed(true)} />
        </div>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
    </button>
  );
}

// ─── History Panel ────────────────────────────────────────────────────────────

export function HistoryPanel({ onSelect, onClose }: { onSelect: (id: string, status: string) => void; onClose: () => void }) {
  const { data: history, isLoading } = useTestHistory();
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md h-full bg-background border-l border-border flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2"><History className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Test History</h2></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
          {!isLoading && (!history || history.length === 0) && (
            <div className="text-center py-12">
              <FlaskConical className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No previous test runs</p>
            </div>
          )}
          {history?.map((item: TestHistoryItem) => {
            const scoreColor = (item.overallScore ?? 0) >= 90 ? "text-emerald-400" : (item.overallScore ?? 0) >= 70 ? "text-yellow-400" : "text-red-400";
            const isCancelled = item.status === "cancelled";
            return (
              <button key={item.id} onClick={() => { onSelect(item.id, item.status); onClose(); }}
                className={`w-full text-left p-4 rounded-xl border bg-card hover:border-border/80 hover:bg-muted/50 transition-all group ${isCancelled ? "border-border/40 opacity-70" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-mono truncate">{item.targetUrl}</p>
                    <p className="text-xs text-muted-foreground/60 font-mono mt-0.5">{new Date(item.startedAt).toLocaleDateString()} · {new Date(item.startedAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="shrink-0">
                    {item.status === "complete" && item.overallScore !== null
                      ? <span className={`text-lg font-bold tabular-nums ${scoreColor}`}>{item.overallScore}</span>
                      : item.status === "cancelled"
                        ? <StopCircle className="h-4 w-4 text-muted-foreground" />
                        : item.status === "failed"
                          ? <XCircle className="h-4 w-4 text-red-400" />
                          : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    }
                  </div>
                </div>
                {item.status === "complete" && (
                  <div className="flex gap-3 mt-2 text-xs font-mono">
                    <span className="text-emerald-400">{item.passed ?? 0}✓</span>
                    <span className="text-red-400">{item.failed ?? 0}✗</span>
                    <span className="text-muted-foreground/60">{item.skipped ?? 0} skipped</span>
                  </div>
                )}
                {isCancelled && <p className="mt-1.5 text-xs text-muted-foreground/60 font-mono italic">Stopped by user</p>}
                {item.aiSummary && !isCancelled && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{item.aiSummary}</p>}
                <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><ArrowRight className="h-3 w-3" /> View details</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}