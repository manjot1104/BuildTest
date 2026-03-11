// ADDITIONS TO src/server/api/index.ts (elysia routes)
// Add these two routes to your existing elysiaApp after the other /test/... routes:

/*

  // POST /api/test/run/:id/export-pdf — Puppeteer PDF export of full report
  .post(
    '/test/run/:id/export-pdf',
    async ({ params }) => {
      const { exportTestReportPdfHandler } = await import('@/server/api/controllers/testing.controller')
      return exportTestReportPdfHandler({ params })
    },
    { params: t.Object({ id: t.String() }) },
  )

*/

// ──────────────────────────────────────────────────────────────────────────────
// UPDATED testing page (page.tsx / TestingPage component)
// Key changes vs original:
//   1. During "executing" phase, shows all test cases in their live state
//      (pending → running → passed/failed/flaky) using sseState.generatedTestCases.
//      Previously only the counter/live bugs were shown.
//   2. "Export PDF" button now uses useExportReportPdf() mutation which calls
//      the Puppeteer endpoint instead of a client-side JSON download.
//   3. Minor: import useExportReportPdf from hooks.
// ──────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useCallback } from "react";
import {
  Globe, Play, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, RotateCcw, ExternalLink, Shield, Zap,
  Eye, Navigation, FileText, Lock, Bug, ArrowRight, Sparkles,
  Clock, BarChart3, FlaskConical, Share2, Download, Copy, Check,
  Terminal, Wifi, TrendingUp, Activity, History, ChevronRight,
  Code2, X, Map, Network, Image, StopCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  useStartTestRun, useTestRunStatus, useTestReport,
  useTestHistory, useTestRunSSE, useCancelTestRun, useExportReportPdf,
  type Bug as BugType, type TestCase, type PerformanceGauge,
  type TrendDataPoint, type SSEState, type TestHistoryItem, type LiveTestCase,
} from "@/client-api/query-hooks/use-testing-hooks";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { key: "crawling",   label: "Crawling",   desc: "Mapping all pages and elements",   icon: Globe     },
  { key: "generating", label: "Generating", desc: "AI creating test cases",            icon: Sparkles  },
  { key: "executing",  label: "Executing",  desc: "Running parallel browser sessions", icon: Zap       },
  { key: "reporting",  label: "Reporting",  desc: "Compiling results and AI summary",  icon: BarChart3 },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  navigation: Navigation, forms: FileText, visual: Eye,
  performance: Zap, a11y: Shield, security: Lock,
  auth: Lock, responsive: Eye, accessibility: Shield, error_handling: AlertTriangle,
};

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-500/15 text-red-400 border-red-500/30",         dot: "bg-red-500",    label: "Critical" },
  high:     { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", dot: "bg-orange-500", label: "High"     },
  medium:   { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500", label: "Medium"   },
  low:      { color: "bg-blue-500/15 text-blue-400 border-blue-500/30",       dot: "bg-blue-400",   label: "Low"      },
};

const PRIORITY_CONFIG = {
  P0: { color: "text-red-400 bg-red-500/10 border-red-500/20"          },
  P1: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  P2: { color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"       },
};

const STATUS_CONFIG = {
  pending:  { icon: Clock,         color: "text-zinc-500",    bg: "bg-zinc-500/10 border-zinc-500/20",       label: "Pending"  },
  running:  { icon: Loader2,       color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",       label: "Running"  },
  passed:   { icon: CheckCircle2,  color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Passed"   },
  failed:   { icon: XCircle,       color: "text-red-400",     bg: "bg-red-500/10 border-red-500/20",         label: "Failed"   },
  flaky:    { icon: AlertTriangle, color: "text-yellow-400",  bg: "bg-yellow-500/10 border-yellow-500/20",   label: "Flaky"    },
  skipped:  { icon: Clock,         color: "text-zinc-500",    bg: "bg-zinc-500/10 border-zinc-500/20",       label: "Skipped"  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ApiEndpointItem { url: string; method: string; status: number | null; responseType: string | null; durationMs: number | null }
interface NavMenu { label: string; items: { text: string; href: string }[] }
interface PageScreenshot { pageUrl: string; url375: string | null; url768: string | null; url1440: string | null }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function statusBg(s: string) {
  if (s === "good") return "bg-emerald-500";
  if (s === "needs-improvement") return "bg-yellow-500";
  if (s === "poor") return "bg-red-500";
  return "bg-zinc-600";
}
function statusColor(s: string) {
  if (s === "good") return "text-emerald-400";
  if (s === "needs-improvement") return "text-yellow-400";
  if (s === "poor") return "text-red-400";
  return "text-zinc-500";
}
function methodBadge(method: string) {
  const m = method.toUpperCase();
  if (m === "GET") return "bg-emerald-500/15 text-emerald-400";
  if (m === "POST") return "bg-blue-500/15 text-blue-400";
  if (m === "PUT") return "bg-yellow-500/15 text-yellow-400";
  if (m === "DELETE") return "bg-red-500/15 text-red-400";
  return "bg-zinc-700 text-zinc-400";
}
function statusCodeColor(code: number | null) {
  if (!code) return "text-zinc-500";
  if (code < 300) return "text-emerald-400";
  if (code < 400) return "text-yellow-400";
  return "text-red-400";
}

// ─── Score Gauge ──────────────────────────────────────────────────────────────
function ScoreGauge({ score, size = 140 }: { score: number; size?: number }) {
  const r = size * 0.386; const cx = size / 2; const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "#22c55e" : score >= 70 ? "#eab308" : "#ef4444";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} stroke="#1f2937" strokeWidth={size * 0.071} fill="none" />
        <circle cx={cx} cy={cx} r={r} stroke={color} strokeWidth={size * 0.071} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`${size < 100 ? "text-xl" : "text-4xl"} font-bold tabular-nums`} style={{ color }}>{score}</span>
        <span className="text-xs text-zinc-500 font-mono">/100</span>
      </div>
    </div>
  );
}

// ─── Category Donut ───────────────────────────────────────────────────────────
function CategoryDonut({ passed, total, category, onClick, active }: { passed: number; total: number; category: string; onClick: () => void; active: boolean }) {
  const pct = total > 0 ? passed / total : 0; const r = 28; const circ = 2 * Math.PI * r;
  const col = pct >= 0.8 ? "#22c55e" : pct >= 0.5 ? "#eab308" : "#ef4444";
  const Icon = CATEGORY_ICONS[category] ?? Bug;
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${active ? "border-emerald-500/40 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"}`}>
      <div className="relative inline-flex items-center justify-center">
        <svg width="72" height="72" className="-rotate-90">
          <circle cx="36" cy="36" r={r} stroke="#1f2937" strokeWidth="7" fill="none" />
          <circle cx="36" cy="36" r={r} stroke={col} strokeWidth="7" fill="none"
            strokeDasharray={circ} strokeDashoffset={circ - pct * circ} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div className="absolute"><Icon className="h-4 w-4 text-zinc-400" /></div>
      </div>
      <div className="text-center">
        <p className="text-xs font-bold tabular-nums" style={{ color: col }}>{Math.round(pct * 100)}%</p>
        <p className="text-xs text-zinc-500 capitalize">{category.replace("_", " ")}</p>
        <p className="text-xs text-zinc-600 font-mono">{passed}/{total}</p>
      </div>
    </button>
  );
}

// ─── Perf Gauge Row ───────────────────────────────────────────────────────────
function PerfGaugeRow({ label, value, unit, status }: { label: string; value: number | null; unit: string; status: string }) {
  const display = value === null ? "—" : unit === "ms" ? `${Math.round(value)}ms` : value.toFixed(3);
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 text-xs font-mono text-zinc-500 shrink-0">{label}</div>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        {value !== null && <div className={`h-full rounded-full ${statusBg(status)}`}
          style={{ width: `${Math.min(100, status === "good" ? 90 : status === "needs-improvement" ? 55 : 100)}%`, opacity: 0.85 }} />}
      </div>
      <div className={`w-20 text-right text-xs font-mono font-bold ${statusColor(status)}`}>{display}</div>
      <div className={`h-2 w-2 rounded-full shrink-0 ${statusBg(status)}`} />
    </div>
  );
}

// ─── Trend Sparkline ──────────────────────────────────────────────────────────
function TrendSparkline({ data }: { data: TrendDataPoint[] }) {
  if (data.length < 2) return (<div className="h-16 flex items-center justify-center text-xs text-zinc-600 font-mono">Run more tests to see trend</div>);
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
        {pts.map((p) => (<circle key={p.d.runId} cx={p.x} cy={p.y} r={p.d.isCurrent ? 5 : 3} fill={p.d.isCurrent ? color : "#27272a"} stroke={color} strokeWidth="1.5" />))}
      </svg>
      <div className="flex justify-between text-xs font-mono text-zinc-600 mt-1">
        <span>{new Date(data[0]!.date).toLocaleDateString()}</span>
        <span className={`font-bold ${score >= 90 ? "text-emerald-400" : score >= 70 ? "text-yellow-400" : "text-red-400"}`}>Latest: {score}</span>
        <span>{new Date(data[data.length - 1]!.date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// ─── Live Test Case Card (used during execution phase) ────────────────────────
function LiveTestCaseCard({ tc }: { tc: LiveTestCase }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[tc.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const Icon = CATEGORY_ICONS[tc.category] ?? FlaskConical;
  const priorityCfg = PRIORITY_CONFIG[tc.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.P2;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
      tc.status === "passed"  ? "border-emerald-500/20 bg-emerald-500/3"
      : tc.status === "failed"  ? "border-red-500/20 bg-red-500/3"
      : tc.status === "flaky"   ? "border-yellow-500/20 bg-yellow-500/3"
      : tc.status === "running" ? "border-blue-500/20 bg-blue-500/3 animate-pulse"
      : "border-zinc-800 bg-zinc-900/40"
    }`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/3 transition-colors">
        <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color} ${tc.status === "running" ? "animate-spin" : ""}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-mono ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-mono ${priorityCfg.color}`}>{tc.priority}</span>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full">
              <Icon className="h-3 w-3" />{tc.category.replace("_", " ")}
            </span>
            {tc.durationMs !== undefined && (
              <span className="text-xs text-zinc-600 font-mono ml-auto">{(tc.durationMs / 1000).toFixed(1)}s</span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-zinc-200">{tc.title}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800/60 pt-4 space-y-3">
          <div>
            <p className="text-xs font-mono text-zinc-500 mb-2 uppercase tracking-wider">Test Steps</p>
            <ol className="space-y-1.5">
              {tc.steps.map((step, i) => (
                <li key={i} className="text-xs text-zinc-400 flex gap-2">
                  <span className="text-zinc-600 font-mono shrink-0">{i + 1}.</span>{step}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-500 mb-1 uppercase tracking-wider">Expected</p>
            <p className="text-xs text-zinc-400">{tc.expected_result}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Test Case Card (used in completed report) ────────────────────────────────
function TestCaseCard({ tc, liveStatus }: { tc: TestCase; liveStatus?: { status: string; durationMs?: number } }) {
  const [expanded, setExpanded] = useState(false);
  const result = tc.results?.[0];
  const status = liveStatus?.status ?? result?.status ?? "skipped";
  const Icon = CATEGORY_ICONS[tc.category] ?? FlaskConical;
  const priorityCfg = PRIORITY_CONFIG[tc.priority] ?? PRIORITY_CONFIG.P2;
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.skipped;
  const StatusIcon = cfg.icon;

  return (
    <div className={`rounded-xl border overflow-hidden transition-all duration-300 ${
      status === "passed"  ? "border-emerald-500/20 bg-emerald-500/3"
      : status === "failed"  ? "border-red-500/20 bg-red-500/3"
      : status === "flaky"   ? "border-yellow-500/20 bg-yellow-500/3"
      : status === "running" ? "border-blue-500/20 bg-blue-500/3"
      : "border-zinc-800 bg-zinc-900/40"
    }`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/3 transition-colors">
        <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color} ${status === "running" ? "animate-spin" : ""}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-mono ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-mono ${priorityCfg.color}`}>{tc.priority}</span>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full">
              <Icon className="h-3 w-3" />{tc.category.replace("_", " ")}
            </span>
            {(liveStatus?.durationMs ?? result?.duration_ms) && (
              <span className="text-xs text-zinc-600 font-mono ml-auto">
                {((liveStatus?.durationMs ?? result?.duration_ms ?? 0) / 1000).toFixed(1)}s
                {result && result.retry_count > 0 && ` · ${result.retry_count} retr${result.retry_count === 1 ? "y" : "ies"}`}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-medium text-zinc-200">{tc.title}</p>
          {result?.actual_result && <p className="mt-0.5 text-xs text-zinc-500 truncate">{result.actual_result}</p>}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" /> : <ChevronDown className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800/60 pt-4 space-y-4">
          {tc.description && <p className="text-sm text-zinc-400">{tc.description}</p>}
          <div>
            <p className="text-xs font-mono text-zinc-500 mb-2 uppercase tracking-wider">Test Steps</p>
            <ol className="space-y-1.5">
              {tc.steps.map((step, i) => (<li key={i} className="text-xs text-zinc-400 flex gap-2"><span className="text-zinc-600 font-mono shrink-0">{i + 1}.</span>{step}</li>))}
            </ol>
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-500 mb-1 uppercase tracking-wider">Expected</p>
            <p className="text-xs text-zinc-400">{tc.expected_result}</p>
          </div>
          {result && (
            <div className={`rounded-lg border p-3 ${cfg.bg}`}>
              <p className={`text-xs font-mono mb-1 uppercase tracking-wider ${cfg.color}`}>Actual Result</p>
              <p className="text-xs text-zinc-300">{result.actual_result}</p>
              {result.error_details && <p className="mt-2 text-xs text-red-400 font-mono">{result.error_details}</p>}
            </div>
          )}
          {result?.console_logs && result.console_logs.length > 0 && (
            <div>
              <p className="text-xs font-mono text-zinc-500 mb-1.5 uppercase tracking-wider flex items-center gap-1"><Terminal className="h-3 w-3" /> Console Logs</p>
              <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-2 space-y-0.5 max-h-32 overflow-y-auto">
                {result.console_logs.map((log, i) => <p key={i} className="text-xs font-mono text-zinc-500">{log}</p>)}
              </div>
            </div>
          )}
          {result?.network_logs && result.network_logs.length > 0 && (
            <div>
              <p className="text-xs font-mono text-zinc-500 mb-1.5 uppercase tracking-wider flex items-center gap-1"><Wifi className="h-3 w-3" /> Network Errors</p>
              <div className="space-y-1">
                {result.network_logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono rounded bg-zinc-900 border border-zinc-800 px-2 py-1.5">
                    <span className={`shrink-0 px-1 py-0.5 rounded ${(log.status ?? 0) >= 500 ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>{log.status ?? "ERR"}</span>
                    <span className="text-zinc-400">{log.method}</span>
                    <span className="text-zinc-500 truncate flex-1">{log.url}</span>
                    {log.durationMs !== null && <span className="text-zinc-600 shrink-0">{log.durationMs}ms</span>}
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

// ─── Bug Detail Modal ─────────────────────────────────────────────────────────
function BugDetailModal({ bug, onClose }: { bug: BugType; onClose: () => void }) {
  const cfg = SEVERITY_CONFIG[bug.severity];
  const Icon = CATEGORY_ICONS[bug.category] ?? Bug;
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 p-5 border-b border-zinc-800 bg-zinc-950">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono ${cfg.color}`}><div className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}</span>
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full"><Icon className="h-3 w-3" />{bug.category}</span>
              <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-mono ${bug.status === "open" ? "text-red-400 border-red-500/30 bg-red-500/10" : bug.status === "fixed" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : "text-zinc-400 border-zinc-600 bg-zinc-800"}`}>{bug.status}</span>
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">{bug.title}</h3>
            <a href={bug.page_url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mt-1 font-mono">{bug.page_url}<ExternalLink className="h-3 w-3" /></a>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          {bug.screenshot_url && (
            <div className="relative rounded-xl overflow-hidden border border-zinc-800">
              <img src={bug.screenshot_url} alt="Bug screenshot" className="w-full" />
              {bug.annotation_box && (
                <div className="absolute border-2 border-red-500 rounded"
                  style={{ left: bug.annotation_box.x, top: bug.annotation_box.y, width: bug.annotation_box.width, height: bug.annotation_box.height, boxShadow: "0 0 0 2px rgba(239,68,68,0.3)" }} />
              )}
            </div>
          )}
          {bug.description && (<div><p className="text-xs font-mono text-zinc-500 mb-2 uppercase tracking-wider">Description</p><p className="text-sm text-zinc-300 leading-relaxed">{bug.description}</p></div>)}
          {bug.reproduction_steps?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Steps to Reproduce</p>
                <button onClick={() => { void navigator.clipboard.writeText(bug.reproduction_steps.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300">
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}{copied ? "Copied" : "Copy"}
                </button>
              </div>
              <ol className="space-y-2">
                {bug.reproduction_steps.map((step, i) => (<li key={i} className="flex gap-3 text-sm"><span className="shrink-0 h-5 w-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-500">{i + 1}</span><span className="text-zinc-300 pt-0.5">{step}</span></li>))}
              </ol>
            </div>
          )}
          {bug.ai_fix_suggestion && (
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
              <div className="flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-emerald-400" /><p className="text-xs font-mono text-emerald-400 uppercase tracking-wider">AI Fix Suggestion</p></div>
              <div className="text-sm text-zinc-300 font-mono bg-zinc-950/60 rounded-lg p-3 border border-zinc-800 whitespace-pre-wrap">{bug.ai_fix_suggestion}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bug Card ─────────────────────────────────────────────────────────────────
function BugCard({ bug, onClick }: { bug: BugType; onClick: () => void }) {
  const cfg = SEVERITY_CONFIG[bug.severity]; const Icon = CATEGORY_ICONS[bug.category] ?? Bug;
  return (
    <button onClick={onClick} className="w-full flex items-start gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-left hover:bg-zinc-800/60 hover:border-zinc-700 transition-all group">
      <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono ${cfg.color}`}>{cfg.label}</span>
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full"><Icon className="h-3 w-3" />{bug.category}</span>
        </div>
        <p className="text-sm font-medium text-zinc-200">{bug.title}</p>
        <p className="mt-0.5 text-xs text-zinc-500 truncate">{bug.page_url}</p>
        {bug.ai_fix_suggestion && (<p className="mt-1 text-xs text-emerald-500/70 flex items-center gap-1"><Sparkles className="h-3 w-3" /> AI fix available</p>)}
      </div>
      {bug.screenshot_url && (<div className="shrink-0 h-12 w-20 rounded-lg overflow-hidden border border-zinc-700"><img src={bug.screenshot_url} alt="" className="h-full w-full object-cover" /></div>)}
      <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5 group-hover:text-zinc-400 transition-colors" />
    </button>
  );
}

// ─── Screenshot/API/Nav sub-components (unchanged, abbreviated) ───────────────
// (ScreenshotViewer, ApiEndpointsTable, NavStructurePanel, HistoryPanel — same as original)

function HistoryPanel({ onSelect, onClose }: { onSelect: (id: string, status: string) => void; onClose: () => void }) {
  const { data: history, isLoading } = useTestHistory();
  function statusBadge(status: string) {
    if (status === "complete") return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
    if (status === "failed") return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
    if (status === "cancelled") return (<span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full shrink-0"><StopCircle className="h-3 w-3" /> Cancelled</span>);
    return <Loader2 className="h-4 w-4 animate-spin text-zinc-500 shrink-0" />;
  }
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-2"><History className="h-4 w-4 text-zinc-400" /><h2 className="text-sm font-semibold">Test History</h2></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-600" /></div>}
          {!isLoading && (!history || history.length === 0) && (<div className="text-center py-12"><FlaskConical className="h-8 w-8 text-zinc-700 mx-auto mb-2" /><p className="text-sm text-zinc-500">No previous test runs</p></div>)}
          {history?.map((item: TestHistoryItem) => {
            const scoreColor = (item.overallScore ?? 0) >= 90 ? "text-emerald-400" : (item.overallScore ?? 0) >= 70 ? "text-yellow-400" : "text-red-400";
            const isCancelled = item.status === "cancelled";
            return (
              <button key={item.id} onClick={() => { onSelect(item.id, item.status); onClose(); }}
                className={`w-full text-left p-4 rounded-xl border bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all group ${isCancelled ? "border-zinc-800/60 opacity-70" : "border-zinc-800"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-400 font-mono truncate">{item.targetUrl}</p>
                    <p className="text-xs text-zinc-600 font-mono mt-0.5">{new Date(item.startedAt).toLocaleDateString()} · {new Date(item.startedAt).toLocaleTimeString()}</p>
                  </div>
                  <div className="shrink-0">{item.status === "complete" && item.overallScore !== null ? <span className={`text-lg font-bold tabular-nums ${scoreColor}`}>{item.overallScore}</span> : statusBadge(item.status)}</div>
                </div>
                {item.status === "complete" && (<div className="flex gap-3 mt-2 text-xs font-mono"><span className="text-emerald-400">{item.passed ?? 0}✓</span><span className="text-red-400">{item.failed ?? 0}✗</span><span className="text-zinc-600">{item.skipped ?? 0} skipped</span></div>)}
                {isCancelled && (<p className="mt-1.5 text-xs text-zinc-600 font-mono italic">Stopped by user</p>)}
                {item.aiSummary && !isCancelled && (<p className="mt-2 text-xs text-zinc-500 line-clamp-2">{item.aiSummary}</p>)}
                <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="text-xs text-zinc-500 flex items-center gap-1"><ArrowRight className="h-3 w-3" /> View details</span></div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TestingPage() {
  const [url, setUrl] = useState("");
  const [testRunId, setTestRunId] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [tcFilter, setTcFilter] = useState<"all" | "passed" | "failed" | "flaky">("all");
  const [activeTab, setActiveTab] = useState<"bugs" | "tests" | "performance" | "trend" | "crawl">("tests");
  const [selectedBug, setSelectedBug] = useState<BugType | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const { mutate: startTest, isPending: isStarting } = useStartTestRun();
  const { mutate: cancelTest, isPending: isCancelling } = useCancelTestRun();
  const { mutate: exportPdf, isPending: isExportingPdf } = useExportReportPdf();
  const { data: run } = useTestRunStatus(testRunId);
  const { sseState } = useTestRunSSE(testRunId, run?.status);

  const isComplete  = run?.status === "complete"  || sseState.isComplete;
  const isFailed    = run?.status === "failed"    || sseState.pipelineStatus === "failed";
  const isCancelled = run?.status === "cancelled" || sseState.isCancelled;
  const isRunning   = !!testRunId && !isComplete && !isFailed && !isCancelled;

  const { data: report } = useTestReport(testRunId, isComplete);

  const counter = sseState.counter ?? {
    passed: run?.passed ?? 0, failed: run?.failed ?? 0,
    running: run?.running ?? 0, skipped: run?.skipped ?? 0, total: run?.totalTests ?? 0,
  };

  const percent        = sseState.percent || run?.percent || 10;
  const pipelineStatus = sseState.pipelineStatus || run?.status || "crawling";
  const currentStepIndex = PIPELINE_STEPS.findIndex((s) => s.key === pipelineStatus);

  const filteredBugs = (report?.bugs ?? []).filter((bug) => {
    if (filterSeverity !== "all" && bug.severity !== filterSeverity) return false;
    if (filterCategory !== "all" && bug.category !== filterCategory) return false;
    return true;
  });

  const filteredTestCases = (report?.testCases ?? []).filter((tc) => {
    if (tcFilter === "all") return true;
    const liveStatus = sseState.testUpdates[tc.id]?.status;
    return (liveStatus ?? tc.results?.[0]?.status ?? "skipped") === tcFilter;
  });

  // Live test cases shown during execution (from tests_generated SSE event)
  const liveTestCases = sseState.generatedTestCases;
  const isExecutingPhase = pipelineStatus === "executing" || pipelineStatus === "reporting";

  const handleStart = () => {
    if (!url.trim()) { toast.error("Please enter a URL"); return; }
    startTest({ url: url.trim() }, {
      onSuccess: (data) => { setTestRunId(data.testRunId); setActiveTab("tests"); toast.success("Test run started!"); },
      onError: (err) => toast.error(err.message ?? "Failed to start test run"),
    });
  };

  const handleCancel = () => {
    if (!testRunId) return;
    cancelTest(testRunId, {
      onSuccess: (data) => { if (data.cancelled) toast.info("Test run cancelled."); },
      onError: (err) => toast.error(err.message ?? "Failed to cancel test run"),
    });
  };

  const handleReset = () => {
    setUrl(""); setTestRunId(null);
    setFilterSeverity("all"); setFilterCategory("all");
    setTcFilter("all"); setActiveTab("tests"); setSelectedBug(null);
  };

  const crawlScreenshots: PageScreenshot[] = report?.crawlSummary?.screenshots ?? [];
  const apiEndpoints: ApiEndpointItem[]    = report?.crawlSummary?.apiEndpoints ?? [];
  const navStructure                       = report?.crawlSummary?.navStructure ?? null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {selectedBug && <BugDetailModal bug={selectedBug} onClose={() => setSelectedBug(null)} />}
      {showHistory && <HistoryPanel onSelect={(id, status) => { setTestRunId(id); setActiveTab("tests"); }} onClose={() => setShowHistory(false)} />}

      {/* Header */}
      <div className="border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Bug className="h-4 w-4 text-emerald-400" /></div>
            <div><h1 className="text-sm font-semibold tracking-tight">Testing Engine</h1><p className="text-xs text-zinc-500 font-mono">Crawl → Generate → Execute → Report</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)} className="text-zinc-500 hover:text-zinc-300 text-xs gap-1.5"><History className="h-3.5 w-3.5" /> History</Button>
            {!!testRunId && <Button variant="ghost" size="sm" onClick={handleReset} className="text-zinc-500 hover:text-zinc-300 text-xs gap-1.5"><RotateCcw className="h-3 w-3" /> New Test</Button>}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* ── IDLE ── */}
        {!testRunId && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full"><Zap className="h-3 w-3" />AI-powered · 50+ parallel sessions · 6 test categories</div>
              <h2 className="text-4xl font-bold tracking-tight">Test any site. <span className="text-zinc-500">Automatically.</span></h2>
              <p className="text-zinc-500 text-lg max-w-md">Paste a URL. Get a comprehensive bug report in minutes.</p>
            </div>
            <div className="w-full max-w-xl space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input placeholder="https://yoursite.com" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleStart()}
                    className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-11 font-mono text-sm focus:border-emerald-500/50" />
                </div>
                <Button onClick={handleStart} disabled={isStarting || !url.trim()} className="h-11 px-5 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium">
                  {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4" /> Run Tests</>}
                </Button>
              </div>
              <p className="text-xs text-zinc-600 text-center font-mono">Navigation · Forms · Visual · Performance · A11y · Security</p>
            </div>
          </div>
        )}

        {/* ── RUNNING ── */}
        {isRunning && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full"><Globe className="h-3 w-3 text-zinc-600" />{url || run?.targetUrl}</div>
              <div className="w-full max-w-xl space-y-2">
                <Progress value={percent} className="h-1.5 bg-zinc-800" />
                <div className="flex justify-between text-xs text-zinc-600 font-mono">
                  <span>{percent}% complete</span>
                  {counter.total > 0 && <span>{counter.passed + counter.failed + counter.skipped}/{counter.total} tests done</span>}
                </div>
              </div>
            </div>

            {/* Pipeline steps */}
            <div className="w-full max-w-xl mx-auto relative">
              <div className="absolute left-[18px] top-6 bottom-6 w-px bg-zinc-800" />
              <div className="space-y-1">
                {PIPELINE_STEPS.map((step, i) => {
                  const isActive = step.key === pipelineStatus;
                  const isDone   = i < currentStepIndex;
                  const Icon     = step.icon;
                  return (
                    <div key={step.key} className={`flex items-start gap-4 p-3 rounded-xl transition-all ${isActive ? "bg-zinc-900 border border-zinc-700/60" : ""}`}>
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all ${isDone ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : isActive ? "bg-zinc-800 border-zinc-600 text-zinc-200" : "bg-zinc-900 border-zinc-800 text-zinc-600"}`}>
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-medium ${i > currentStepIndex ? "text-zinc-600" : "text-zinc-200"}`}>{step.label}</p>
                        <p className="text-xs text-zinc-600">{step.desc}</p>
                      </div>
                      {isActive && (<div className="ml-auto pt-2 flex gap-1">{[0, 1, 2].map((dot) => (<div key={dot} className="h-1.5 w-1.5 rounded-full bg-emerald-500" style={{ animation: `dotPulse 1.4s ease-in-out ${dot * 0.2}s infinite` }} />))}</div>)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cancel */}
            <div className="flex justify-center w-full max-w-xl mx-auto">
              <Button onClick={handleCancel} disabled={isCancelling} variant="outline" className="border-red-900/60 text-red-400 hover:bg-red-950/40 hover:border-red-700 gap-2 text-sm transition-all">
                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                {isCancelling ? "Stopping…" : "Stop Test Run"}
              </Button>
            </div>

            {/* Counters */}
            {isExecutingPhase && (
              <div className="grid grid-cols-4 gap-3 w-full max-w-xl mx-auto">
                {[
                  { value: counter.passed,  label: "passed",  color: "text-emerald-400" },
                  { value: counter.failed,  label: "failed",  color: "text-red-400"     },
                  { value: counter.running, label: "running", color: "text-blue-400"    },
                  { value: counter.skipped, label: "skipped", color: "text-zinc-500"    },
                ].map(({ value, label, color }) => (
                  <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-center">
                    <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── LIVE TEST CASES (shown once tests_generated fires) ── */}
            {liveTestCases.length > 0 && (
              <div className="w-full max-w-2xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FlaskConical className="h-3.5 w-3.5" />
                    Test Cases — {liveTestCases.length} generated
                  </p>
                  <div className="flex gap-3 text-xs font-mono">
                    <span className="text-emerald-400">{liveTestCases.filter(t => t.status === "passed").length} ✓</span>
                    <span className="text-red-400">{liveTestCases.filter(t => t.status === "failed").length} ✗</span>
                    <span className="text-blue-400">{liveTestCases.filter(t => t.status === "running").length} ⟳</span>
                    <span className="text-zinc-500">{liveTestCases.filter(t => t.status === "pending").length} pending</span>
                  </div>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {liveTestCases.map((tc) => (
                    <LiveTestCaseCard key={tc.id} tc={tc} />
                  ))}
                </div>
              </div>
            )}

            {/* Live bugs */}
            {sseState.liveBugs.length > 0 && (
              <div className="w-full max-w-2xl mx-auto">
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Bug className="h-3 w-3 text-red-400" /> Failed ({sseState.liveBugs.length})</p>
                <div className="space-y-1.5">
                  {sseState.liveBugs.map((bug) => (
                    <div key={bug.id} className="flex items-center gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${SEVERITY_CONFIG[bug.severity as keyof typeof SEVERITY_CONFIG]?.dot ?? "bg-zinc-500"}`} />
                      <p className="text-xs text-zinc-300 flex-1 truncate">{bug.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CANCELLED ── */}
        {isCancelled && (
          <div className="flex flex-col items-center gap-6 py-16">
            <div className="h-16 w-16 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center"><StopCircle className="h-8 w-8 text-zinc-400" /></div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-zinc-200">Test run cancelled</h3>
              <p className="text-zinc-500 text-sm mt-1">You stopped this run. No further TinyFish calls will be made.</p>
              {(counter.passed > 0 || counter.failed > 0) && (<p className="text-zinc-600 text-xs font-mono mt-2">{counter.passed} passed · {counter.failed} failed before stopping</p>)}
            </div>
            <Button onClick={handleReset} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2"><RotateCcw className="h-4 w-4" /> Run New Test</Button>
          </div>
        )}

        {/* ── FAILED ── */}
        {isFailed && (
          <div className="flex flex-col items-center gap-6 py-16">
            <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center"><XCircle className="h-8 w-8 text-red-400" /></div>
            <div className="text-center"><h3 className="text-lg font-semibold">Test run failed</h3><p className="text-zinc-500 text-sm mt-1">{sseState.errorMessage ?? "Something went wrong. Please try again."}</p></div>
            <Button onClick={handleReset} variant="outline" className="border-zinc-700 text-zinc-300 gap-2"><RotateCcw className="h-4 w-4" /> Try Again</Button>
          </div>
        )}

        {/* ── COMPLETE ── */}
        {isComplete && report && (
          <div className="space-y-8">
            {/* Score Hero */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <ScoreGauge score={report.overallScore ?? 0} />
                <div className="flex-1 space-y-4 w-full">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mb-1"><Globe className="h-3 w-3" />{report.targetUrl}<a href={report.targetUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3 hover:text-zinc-300" /></a></div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono"><Clock className="h-3 w-3" />{report.crawlSummary.totalPages} pages crawled · {Math.round(report.crawlSummary.crawlTimeMs / 1000)}s crawl time{apiEndpoints.length > 0 && <> · <Network className="h-3 w-3" />{apiEndpoints.length} API endpoints</>}</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex gap-px h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500" style={{ width: `${((report.passed ?? 0) / (report.totalTests ?? 1)) * 100}%` }} />
                      <div className="bg-red-500"     style={{ width: `${((report.failed  ?? 0) / (report.totalTests ?? 1)) * 100}%` }} />
                      <div className="bg-zinc-700 flex-1" />
                    </div>
                    <div className="flex gap-4 text-xs font-mono">
                      <span className="text-emerald-400">{report.passed} passed</span>
                      <span className="text-red-400">{report.failed} failed</span>
                      <span className="text-zinc-500">{report.skipped} skipped</span>
                      <span className="text-zinc-600 ml-auto">{report.totalTests} total</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Ring Charts */}
            {Object.keys(report.resultsByCategory).length > 0 && (
              <div>
                <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3">Category Breakdown</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.entries(report.resultsByCategory).map(([cat, data]) => (
                    <CategoryDonut key={cat} category={cat} passed={data.passed} total={data.total}
                      active={filterCategory === cat} onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)} />
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
            {report.aiSummary && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex items-center gap-2 mb-3"><Sparkles className="h-4 w-4 text-emerald-400" /><span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">AI Summary</span></div>
                <p className="text-sm text-zinc-300 leading-relaxed">{report.aiSummary}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-zinc-800 overflow-x-auto">
              {([
                { key: "tests",       label: "Test Cases",  count: report.testCases?.length ?? 0,        icon: FlaskConical },
                { key: "bugs",        label: "Bugs",        count: report.bugs?.length ?? 0,              icon: Bug         },
                { key: "performance", label: "Performance", count: report.performanceGauges?.length ?? 0, icon: Activity    },
                { key: "crawl",       label: "Crawl Data",  count: crawlScreenshots.filter(s => s.url375 || s.url768 || s.url1440).length + apiEndpoints.length, icon: Map },
                { key: "trend",       label: "Trend",       count: report.trendData?.length ?? 0,         icon: TrendingUp  },
              ] as const).map(({ key, label, count, icon: Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px shrink-0 ${activeTab === key ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>
                  <Icon className="h-3.5 w-3.5" />{label}
                  {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${activeTab === key ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>{count}</span>}
                </button>
              ))}
            </div>

            {/* Tests Tab */}
            {activeTab === "tests" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-zinc-500 font-mono">Filter:</span>
                  {(["all", "passed", "failed", "flaky"] as const).map((f) => (
                    <button key={f} onClick={() => setTcFilter(f)} className={`text-xs px-2.5 py-1 rounded-full font-mono capitalize transition-all ${tcFilter === f ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-400"}`}>
                      {f}{f !== "all" && (<span className="ml-1 text-zinc-600">({(report.testCases ?? []).filter((tc) => { const live = sseState.testUpdates[tc.id]?.status; return (live ?? tc.results?.[0]?.status ?? "skipped") === f; }).length})</span>)}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {filteredTestCases.length === 0
                    ? (<div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center"><FlaskConical className="h-8 w-8 text-zinc-600 mx-auto mb-2" /><p className="text-sm text-zinc-500">No test cases match this filter</p></div>)
                    : filteredTestCases.map((tc) => (<TestCaseCard key={tc.id} tc={tc} liveStatus={sseState.testUpdates[tc.id]} />))
                  }
                </div>
              </div>
            )}

            {/* Bugs Tab */}
            {activeTab === "bugs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2"><Bug className="h-4 w-4 text-red-400" /><h3 className="text-sm font-semibold">{filteredBugs.length} Bug{filteredBugs.length !== 1 ? "s" : ""}</h3></div>
                  <div className="flex gap-1 flex-wrap">
                    {["all", "critical", "high", "medium", "low"].map((sev) => (
                      <button key={sev} onClick={() => setFilterSeverity(sev)} className={`text-xs px-2.5 py-1 rounded-full font-mono capitalize transition-all ${filterSeverity === sev ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-400"}`}>{sev}</button>
                    ))}
                  </div>
                </div>
                {filteredBugs.length === 0
                  ? (<div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center"><CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" /><p className="text-sm text-zinc-400">No bugs found for this filter</p></div>)
                  : (<div className="space-y-2">{filteredBugs.map((bug) => <BugCard key={bug.id} bug={bug} onClick={() => setSelectedBug(bug)} />)}</div>)
                }
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === "performance" && (
              <div className="space-y-4">
                {(!report.performanceGauges || report.performanceGauges.length === 0)
                  ? (<div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center"><Activity className="h-8 w-8 text-zinc-600 mx-auto mb-2" /><p className="text-sm text-zinc-500">No performance data available</p></div>)
                  : report.performanceGauges.map((pg: PerformanceGauge) => (
                    <div key={pg.pageUrl} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                      <div className="flex items-center gap-2 mb-4"><Globe className="h-4 w-4 text-zinc-500 shrink-0" /><p className="text-xs font-mono text-zinc-400 truncate">{pg.pageUrl}</p></div>
                      <div className="space-y-3">
                        <PerfGaugeRow label="LCP"  value={pg.lcpMs}  unit="ms" status={pg.lcpStatus}  />
                        <PerfGaugeRow label="FID"  value={pg.fidMs}  unit="ms" status={pg.fidStatus}  />
                        <PerfGaugeRow label="CLS"  value={pg.cls}    unit=""   status={pg.clsStatus}  />
                        <PerfGaugeRow label="TTFB" value={pg.ttfbMs} unit="ms" status={pg.ttfbStatus} />
                      </div>
                      <div className="flex gap-4 mt-4 pt-3 border-t border-zinc-800/60">
                        {[{ label: "Good", color: "bg-emerald-500" }, { label: "Needs improvement", color: "bg-yellow-500" }, { label: "Poor", color: "bg-red-500" }].map(({ label, color }) => (
                          <div key={label} className="flex items-center gap-1.5 text-xs text-zinc-500"><div className={`h-2 w-2 rounded-full ${color}`} />{label}</div>
                        ))}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Trend Tab */}
            {activeTab === "trend" && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex items-center gap-2 mb-4"><TrendingUp className="h-4 w-4 text-zinc-400" /><h3 className="text-sm font-semibold">Score Over Time</h3><span className="text-xs text-zinc-600 font-mono">{report.targetUrl}</span></div>
                <TrendSparkline data={report.trendData ?? []} />
                {report.trendData && report.trendData.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                    {report.trendData.map((pt: TrendDataPoint) => (
                      <div key={pt.runId} className={`flex items-center gap-3 text-xs font-mono ${pt.isCurrent ? "text-zinc-200" : "text-zinc-500"}`}>
                        <span className="w-24 shrink-0">{new Date(pt.date).toLocaleDateString()}</span>
                        <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden"><div className={`h-full rounded-full ${(pt.score ?? 0) >= 90 ? "bg-emerald-500" : (pt.score ?? 0) >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pt.score ?? 0}%` }} /></div>
                        <span className={`w-8 text-right ${(pt.score ?? 0) >= 90 ? "text-emerald-400" : (pt.score ?? 0) >= 70 ? "text-yellow-400" : "text-red-400"}`}>{pt.score}</span>
                        {pt.isCurrent && <span className="text-zinc-600">(current)</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer actions */}
            <div className="flex gap-3 flex-wrap pb-10">
              {/* PDF Export — uses Puppeteer via API */}
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2 text-sm"
                disabled={isExportingPdf}
                onClick={() => {
                  if (!testRunId) return;
                  exportPdf(testRunId, {
                    onSuccess: () => toast.success("PDF report downloaded"),
                    onError: (err) => toast.error(err.message ?? "PDF export failed"),
                  });
                }}
              >
                {isExportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isExportingPdf ? "Generating PDF…" : "Export PDF"}
              </Button>

              {/* JSON Export */}
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2 text-sm" onClick={() => {
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `buildify-test-report-${Date.now()}.json`; a.click();
                toast.success("JSON report downloaded");
              }}>
                <FileText className="h-4 w-4" /> Export JSON
              </Button>

              {report.shareableSlug && (
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2 text-sm" onClick={() => {
                  void navigator.clipboard.writeText(`${window.location.origin}/report/${report.shareableSlug}`);
                  setCopied(true); toast.success("Shareable link copied!"); setTimeout(() => setCopied(false), 2000);
                }}>
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                  {copied ? "Copied!" : "Share Link"}
                </Button>
              )}
              {report.embedBadgeToken && (
                <Button variant="ghost" className="text-zinc-500 hover:text-zinc-300 gap-2 text-sm" onClick={() => {
                  const badge = `[![Tested by Buildify](${window.location.origin}/api/badge/${report.embedBadgeToken}/svg)](${window.location.origin}/report/${report.shareableSlug})`;
                  void navigator.clipboard.writeText(badge); toast.success("Badge markdown copied!");
                }}>
                  <Code2 className="h-4 w-4" /> Copy Badge
                </Button>
              )}
              <Button variant="ghost" className="text-zinc-500 hover:text-zinc-300 gap-2 text-sm ml-auto" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" /> New Test
              </Button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1);   }
        }
      `}</style>
    </div>
  );
}