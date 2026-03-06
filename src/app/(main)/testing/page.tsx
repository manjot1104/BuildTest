"use client";

import { useState } from "react";
import {
  Globe,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ExternalLink,
  Shield,
  Zap,
  Eye,
  Navigation,
  FileText,
  Lock,
  Bug,
  ArrowRight,
  Sparkles,
  Clock,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  useStartTestRun,
  useTestRunStatus,
  useTestReport,
  type Bug as BugType,
} from "@/client-api/query-hooks/use-testing-hooks";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { key: "crawling",   label: "Crawling",   desc: "Mapping all pages and elements",   icon: Globe },
  { key: "generating", label: "Generating", desc: "AI creating test cases",            icon: Sparkles },
  { key: "executing",  label: "Executing",  desc: "Running parallel browser sessions", icon: Zap },
  { key: "reporting",  label: "Reporting",  desc: "Compiling results and AI summary",  icon: BarChart3 },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  navigation:     Navigation,
  forms:          FileText,
  auth:           Lock,
  responsive:     Eye,
  visual:         Eye,
  performance:    Zap,
  accessibility:  Shield,
  error_handling: AlertTriangle,
  security:       Shield,
};

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-500/15 text-red-400 border-red-500/30",         dot: "bg-red-500",    label: "Critical" },
  high:     { color: "bg-orange-500/15 text-orange-400 border-orange-500/30", dot: "bg-orange-500", label: "High" },
  medium:   { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", dot: "bg-yellow-500", label: "Medium" },
  low:      { color: "bg-blue-500/15 text-blue-400 border-blue-500/30",       dot: "bg-blue-400",   label: "Low" },
};

// ─── Score Gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "#22c55e" : score >= 70 ? "#eab308" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} stroke="#1f2937" strokeWidth="10" fill="none" />
        <circle
          cx="70" cy="70" r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-xs text-zinc-500 font-mono">/100</span>
      </div>
    </div>
  );
}

// ─── Bug Card ─────────────────────────────────────────────────────────────────

function BugCard({ bug }: { bug: BugType }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[bug.severity];
  const Icon = CATEGORY_ICONS[bug.category] ?? Bug;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-zinc-800/40 transition-colors"
      >
        <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-mono ${cfg.color}`}>
              {cfg.label}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
              <Icon className="h-3 w-3" />
              {bug.category}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-zinc-200 leading-snug">{bug.title}</p>
          <p className="mt-0.5 text-xs text-zinc-500 truncate">{bug.page_url}</p>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />
          : <ChevronDown className="h-4 w-4 text-zinc-600 shrink-0 mt-0.5" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 pt-4 space-y-3">
          <p className="text-sm text-zinc-400">{bug.description}</p>

          {bug.reproduction_steps?.length > 0 && (
            <div>
              <p className="text-xs font-mono text-zinc-500 mb-2 uppercase tracking-wider">
                Steps to reproduce
              </p>
              <ol className="space-y-1">
                {bug.reproduction_steps.map((step, i) => (
                  <li key={i} className="text-xs text-zinc-400 flex gap-2">
                    <span className="text-zinc-600 font-mono shrink-0">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {bug.ai_fix_suggestion && (
            <div className="rounded-lg bg-zinc-800/80 border border-zinc-700/50 p-3">
              <p className="text-xs font-mono text-emerald-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI Fix Suggestion
              </p>
              <p className="text-xs text-zinc-300 leading-relaxed">{bug.ai_fix_suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TestingPage() {
  const [url, setUrl] = useState("");
  const [testRunId, setTestRunId] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // ── Hooks ──────────────────────────────────────────────────────────────────
  const { mutate: startTest, isPending: isStarting } = useStartTestRun();

  // Auto-polls every 2.5s, stops automatically when complete/failed
  const { data: run } = useTestRunStatus(testRunId);

  const isComplete = run?.status === "complete";
  const isFailed   = run?.status === "failed";
  const isRunning  = !!testRunId && !isComplete && !isFailed;

  // Only fires once run is complete
  const { data: report } = useTestReport(testRunId, isComplete);

  // ── Derived ────────────────────────────────────────────────────────────────
  const status = run?.status ?? "crawling";
  const currentStepIndex = PIPELINE_STEPS.findIndex((s) => s.key === status);

  const filteredBugs = (report?.bugs ?? []).filter((bug) => {
    if (filterSeverity !== "all" && bug.severity !== filterSeverity) return false;
    if (filterCategory !== "all" && bug.category !== filterCategory) return false;
    return true;
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStart = () => {
    if (!url.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    startTest(
      { url: url.trim() },
      {
        onSuccess: (data) => {
          setTestRunId(data.testRunId);
          toast.success("Test run started!");
        },
        onError: (err) => {
          toast.error(err.message ?? "Failed to start test run");
        },
      },
    );
  };

  const handleReset = () => {
    setUrl("");
    setTestRunId(null);
    setFilterSeverity("all");
    setFilterCategory("all");
  };

  const handleExportJSON = () => {
    if (!report) return;
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `buildify-test-report-${Date.now()}.json`;
    a.click();
    toast.success("JSON report downloaded");
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* ── Header ── */}
      <div className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Bug className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Testing Engine</h1>
              <p className="text-xs text-zinc-500 font-mono">Crawl → Generate → Execute → Report</p>
            </div>
          </div>
          {!!testRunId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-zinc-500 hover:text-zinc-300 text-xs gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
              New Test
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* ════════════════════════════════════════════════════════════════
            STATE: IDLE
        ════════════════════════════════════════════════════════════════ */}
        {!testRunId && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">

            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                <Zap className="h-3 w-3" />
                AI-powered · 50+ parallel sessions · 9 test categories
              </div>
              <h2 className="text-4xl font-bold tracking-tight">
                Test any site.{" "}
                <span className="text-zinc-500">Automatically.</span>
              </h2>
              <p className="text-zinc-500 text-lg max-w-md">
                Paste a URL. Get a comprehensive bug report in minutes. No QA team needed.
              </p>
            </div>

            <div className="w-full max-w-xl space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="https://yoursite.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStart()}
                    className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-11 font-mono text-sm focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  />
                </div>
                <Button
                  onClick={handleStart}
                  disabled={isStarting || !url.trim()}
                  className="h-11 px-5 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium"
                >
                  {isStarting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <><Play className="h-4 w-4" /> Run Tests</>
                  }
                </Button>
              </div>
              <p className="text-xs text-zinc-600 text-center font-mono">
                Navigation · Forms · Auth · Visual · Performance · Security · Accessibility
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { icon: Globe,    text: "Auto-crawls all pages" },
                { icon: Sparkles, text: "AI generates test cases" },
                { icon: Zap,      text: "50 parallel browsers" },
                { icon: Bug,      text: "Visual bug reports" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
                  <Icon className="h-3 w-3 text-zinc-600" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STATE: RUNNING
        ════════════════════════════════════════════════════════════════ */}
        {isRunning && (
          <div className="flex flex-col items-center gap-8 py-8">

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full">
              <Globe className="h-3 w-3 text-zinc-600" />
              {url}
            </div>

            <div className="w-full max-w-lg space-y-2">
              <Progress value={run?.percent ?? 10} className="h-1.5 bg-zinc-800" />
              <div className="flex justify-between text-xs text-zinc-600 font-mono">
                <span>{run?.percent ?? 10}% complete</span>
                {run?.totalTests ? <span>{run.totalTests} tests generated</span> : null}
              </div>
            </div>

            <div className="w-full max-w-lg relative">
              <div className="absolute left-[18px] top-6 bottom-6 w-px bg-zinc-800" />
              <div className="space-y-1">
                {PIPELINE_STEPS.map((step, i) => {
                  const isActive  = step.key === status;
                  const isDone    = i < currentStepIndex;
                  const isPending = i > currentStepIndex;
                  const Icon      = step.icon;

                  return (
                    <div
                      key={step.key}
                      className={`flex items-start gap-4 p-3 rounded-xl transition-all ${isActive ? "bg-zinc-900 border border-zinc-700/60" : ""}`}
                    >
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                        isDone    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : isActive ? "bg-zinc-800 border-zinc-600 text-zinc-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-600"
                      }`}>
                        {isDone    ? <CheckCircle2 className="h-4 w-4" />
                        : isActive  ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Icon className="h-4 w-4" />}
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-medium ${isPending ? "text-zinc-600" : "text-zinc-200"}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-zinc-600">{step.desc}</p>
                      </div>
                      {isActive && (
                        <div className="ml-auto pt-2 flex gap-1">
                          {[0, 1, 2].map((dot) => (
                            <div
                              key={dot}
                              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                              style={{ animation: `dotPulse 1.4s ease-in-out ${dot * 0.2}s infinite` }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {status === "executing" && run && (
              <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
                {[
                  { value: run.passed  ?? 0, label: "passed",  color: "text-emerald-400" },
                  { value: run.failed  ?? 0, label: "failed",  color: "text-red-400" },
                  { value: run.skipped ?? 0, label: "skipped", color: "text-zinc-400" },
                ].map(({ value, label, color }) => (
                  <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center">
                    <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STATE: FAILED
        ════════════════════════════════════════════════════════════════ */}
        {isFailed && (
          <div className="flex flex-col items-center gap-6 py-16">
            <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Test run failed</h3>
              <p className="text-zinc-500 text-sm mt-1">Something went wrong during the pipeline. Please try again.</p>
            </div>
            <Button onClick={handleReset} variant="outline" className="border-zinc-700 text-zinc-300 gap-2">
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            STATE: COMPLETE
        ════════════════════════════════════════════════════════════════ */}
        {isComplete && report && (
          <div className="space-y-8">

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <ScoreGauge score={report.overallScore ?? 0} />

                <div className="flex-1 space-y-4 w-full">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mb-1">
                      <Globe className="h-3 w-3" />
                      {report.targetUrl}
                      <a href={report.targetUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 hover:text-zinc-300 transition-colors" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-600 font-mono">
                      <Clock className="h-3 w-3" />
                      {report.crawlSummary.totalPages} pages crawled ·{" "}
                      {Math.round(report.crawlSummary.crawlTimeMs / 1000)}s crawl time
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex gap-px h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 transition-all" style={{ width: `${((report.passed ?? 0) / (report.totalTests ?? 1)) * 100}%` }} />
                      <div className="bg-red-500 transition-all"     style={{ width: `${((report.failed ?? 0)  / (report.totalTests ?? 1)) * 100}%` }} />
                      <div className="bg-zinc-700 flex-1" />
                    </div>
                    <div className="flex gap-4 text-xs font-mono">
                      <span className="text-emerald-400">{report.passed} passed</span>
                      <span className="text-red-400">{report.failed} failed</span>
                      <span className="text-zinc-600">{report.skipped} skipped</span>
                      <span className="text-zinc-500 ml-auto">{report.totalTests} total</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(report.resultsByCategory).slice(0, 6).map(([cat, data]) => {
                      const pct  = data.total > 0 ? Math.round((data.passed / data.total) * 100) : 0;
                      const Icon = CATEGORY_ICONS[cat] ?? Bug;
                      return (
                        <button
                          key={cat}
                          onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                            filterCategory === cat
                              ? "border-emerald-500/40 bg-emerald-500/10"
                              : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                          }`}
                        >
                          <Icon className="h-3 w-3 text-zinc-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-zinc-400 capitalize truncate">{cat.replace("_", " ")}</p>
                            <p className={`text-xs font-mono font-bold ${pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                              {pct}%
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {report.aiSummary && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">AI Summary</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{report.aiSummary}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-red-400" />
                  <h3 className="text-sm font-semibold">
                    {filteredBugs.length} Bug{filteredBugs.length !== 1 ? "s" : ""}
                    {filterSeverity !== "all" || filterCategory !== "all" ? " (filtered)" : ""}
                  </h3>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="flex gap-1">
                    {["all", "critical", "high", "medium", "low"].map((sev) => (
                      <button
                        key={sev}
                        onClick={() => setFilterSeverity(sev)}
                        className={`text-xs px-2.5 py-1 rounded-full font-mono capitalize transition-all ${
                          filterSeverity === sev ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:text-zinc-400"
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                  {filterCategory !== "all" && (
                    <button
                      onClick={() => setFilterCategory("all")}
                      className="text-xs text-zinc-500 hover:text-zinc-400 font-mono flex items-center gap-1"
                    >
                      <XCircle className="h-3 w-3" /> {filterCategory}
                    </button>
                  )}
                </div>
              </div>

              {filteredBugs.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">No bugs found for this filter</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredBugs.map((bug) => <BugCard key={bug.id} bug={bug} />)}
                </div>
              )}
            </div>

            <div className="flex gap-3 flex-wrap pb-10">
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2 text-sm"
                onClick={handleExportJSON}
              >
                <ArrowRight className="h-4 w-4" />
                Export JSON
              </Button>
              <Button
                variant="ghost"
                className="text-zinc-500 hover:text-zinc-300 gap-2 text-sm ml-auto"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4" />
                New Test
              </Button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </div>
  );
}