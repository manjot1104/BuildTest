"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Bug, CheckCircle2, XCircle, Globe, Clock, Sparkles,
  AlertTriangle, Zap, Shield, Lock, Eye, Navigation,
  FileText, FlaskConical, Activity, ExternalLink, Loader2,
} from "lucide-react";

// ── Types (minimal subset needed for public view) ────────────────────────────

interface PublicReport {
  id: string;
  targetUrl: string;
  overallScore: number;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  startedAt: string;
  completedAt: string;
  aiSummary: string | null;
  bugs: {
    id: string;
    severity: string;
    category: string;
    title: string;
    description: string;
    page_url: string;
    screenshot_url: string | null;
    ai_fix_suggestion: string | null;
    reproduction_steps: string[];
  }[];
  resultsByCategory: Record<string, { passed: number; failed: number; total: number }>;
  testCases: {
    id: string;
    title: string;
    category: string;
    priority: string;
    results: { status: string; duration_ms: number | null }[];
  }[];
  crawlSummary: {
    totalPages: number;
    crawlTimeMs: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-500/15 text-red-400 border-red-500/30", dot: "bg-red-500" },
  high:     { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", dot: "bg-orange-500" },
  medium:   { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500" },
  low:      { color: "bg-blue-500/15 text-blue-400 border-blue-500/30", dot: "bg-blue-400" },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  navigation: Navigation, forms: FileText, visual: Eye,
  performance: Zap, a11y: Shield, security: Lock,
  auth: Lock, responsive: Eye, accessibility: Shield,
  error_handling: AlertTriangle,
};

// ── Score Gauge — uses --primary CSS variable, matching testing-components ───

function ScoreGauge({ score }: { score: number }) {
  const size = 140;
  const r = size * 0.386;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  // Use CSS variables matching global.css — same logic as ScoreGauge in testing-components.tsx
  const color =
    score >= 90 ? "var(--color-primary)" :
    score >= 70 ? "#eab308" :
    "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={cx} cy={cx} r={r}
          stroke="currentColor" strokeWidth={size * 0.071} fill="none"
          className="text-muted/60"
        />
        <circle
          cx={cx} cy={cx} r={r}
          stroke={color} strokeWidth={size * 0.071} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground font-mono">/100</span>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PublicReportPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [report, setReport] = useState<PublicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/test/report/public/${slug}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json() as { error?: string };
          throw new Error(data.error ?? "Report not found");
        }
        return res.json() as Promise<PublicReport>;
      })
      .then(setReport)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground font-mono">Loading report…</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-lg font-semibold">Report not found</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            {error ?? "This report doesn't exist or is no longer public."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Header ── */}
      <div className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Brand icon — primary blue, matching TestingPage top bar */}
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Bug className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Test Report</h1>
              <p className="text-xs text-muted-foreground font-mono">Public · Read-only</p>
            </div>
          </div>
          <a
            href={report.targetUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-mono"
          >
            <Globe className="h-3.5 w-3.5" />
            {report.targetUrl}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* ── Score Hero ── */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <ScoreGauge score={report.overallScore ?? 0} />
            <div className="flex-1 space-y-4 w-full">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-1">
                  <Globe className="h-3 w-3" />{report.targetUrl}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/60 font-mono">
                  <Clock className="h-3 w-3" />
                  {report.crawlSummary.totalPages} pages crawled ·{" "}
                  {Math.round(report.crawlSummary.crawlTimeMs / 1000)}s crawl time
                </div>
              </div>
              {/* Progress bar — primary blue for passed */}
              <div className="space-y-1.5">
                <div className="flex gap-px h-2 rounded-full overflow-hidden bg-border">
                  <div
                    className="bg-primary rounded-l-full"
                    style={{ width: `${((report.passed ?? 0) / (report.totalTests ?? 1)) * 100}%` }}
                  />
                  <div
                    className="bg-red-500"
                    style={{ width: `${((report.failed ?? 0) / (report.totalTests ?? 1)) * 100}%` }}
                  />
                </div>
                <div className="flex gap-4 text-xs font-mono">
                  <span className="text-primary">{report.passed} passed</span>
                  <span className="text-red-400">{report.failed} failed</span>
                  <span className="text-muted-foreground">{report.skipped} skipped</span>
                  <span className="text-muted-foreground/60 ml-auto">{report.totalTests} total</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── AI Summary ── */}
        {report.aiSummary && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              {/* Sparkles icon — primary blue */}
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">AI Summary</span>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{report.aiSummary}</p>
          </div>
        )}

        {/* ── Category Breakdown ── */}
        {Object.keys(report.resultsByCategory).length > 0 && (
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Category Breakdown</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {Object.entries(report.resultsByCategory).map(([cat, data]) => {
                const pct = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
                // Same color logic as CategoryDonut in testing-components
                const col = pct >= 80 ? "var(--color-primary)" : pct >= 50 ? "#eab308" : "#ef4444";
                const Icon = CATEGORY_ICONS[cat] ?? FlaskConical;
                return (
                  <div
                    key={cat}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-bold tabular-nums" style={{ color: col }}>{pct}%</p>
                    <p className="text-xs text-muted-foreground capitalize text-center">{cat.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground/60 font-mono">{data.passed}/{data.total}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Bugs ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-semibold">
              {report.bugs.length} Bug{report.bugs.length !== 1 ? "s" : ""} Found
            </h3>
          </div>
          {report.bugs.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              {/* No bugs — primary-colored check icon */}
              <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No bugs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {report.bugs.map((bug) => {
                const cfg = SEVERITY_CONFIG[bug.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.medium;
                const Icon = CATEGORY_ICONS[bug.category] ?? Bug;
                return (
                  <div key={bug.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono ${cfg.color}`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{bug.severity}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        <Icon className="h-3 w-3" />{bug.category}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{bug.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{bug.page_url}</p>
                    {bug.description && (
                      <p className="text-xs text-muted-foreground">{bug.description}</p>
                    )}
                    {bug.reproduction_steps?.length > 0 && (
                      <ol className="space-y-1 mt-2">
                        {bug.reproduction_steps.map((step, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-muted-foreground/50 font-mono shrink-0">{i + 1}.</span>{step}
                          </li>
                        ))}
                      </ol>
                    )}
                    {bug.ai_fix_suggestion && (
                      /* AI fix suggestion box — primary blue, matching BugDetailModal */
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 mt-2">
                        <p className="text-xs font-mono text-primary mb-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> AI Fix Suggestion
                        </p>
                        <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                          {bug.ai_fix_suggestion}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Test Cases ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">{report.testCases.length} Test Cases</h3>
          </div>
          <div className="space-y-2">
            {report.testCases.map((tc) => {
              const result = tc.results?.[0];
              const status = result?.status ?? "skipped";
              // Same status color logic as STATUS_CONFIG in testing-components
              const statusColor =
                status === "passed"  ? "text-primary bg-primary/10 border-primary/25" :
                status === "failed"  ? "text-red-400 bg-red-500/10 border-red-500/20" :
                status === "flaky"   ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" :
                "text-muted-foreground bg-muted/50 border-border";
              const Icon = CATEGORY_ICONS[tc.category] ?? FlaskConical;
              return (
                <div
                  key={tc.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                >
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-mono shrink-0 ${statusColor}`}>
                    {status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-mono shrink-0 ${
                    tc.priority === "P0" ? "text-red-400 border-red-500/20 bg-red-500/10"
                    : tc.priority === "P1" ? "text-yellow-400 border-yellow-500/20 bg-yellow-500/10"
                    : "text-muted-foreground border-border bg-muted/50"
                  }`}>
                    {tc.priority}
                  </span>
                  <span className="text-sm text-foreground flex-1 min-w-0 truncate">{tc.title}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Icon className="h-3 w-3" />{tc.category}
                  </span>
                  {result?.duration_ms && (
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {(result.duration_ms / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-muted-foreground font-mono pb-10">
          <span>Generated by Buildify Testing Engine</span>
          <span>{new Date(report.completedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}