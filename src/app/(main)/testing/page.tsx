"use client";

import { useState, useMemo, useEffect } from "react";
import { useUserCredits } from "@/hooks/use-user-credits";
import {
  Globe, Play, Loader2, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, RotateCcw, ExternalLink, Zap,
  Bug, Sparkles, Clock, BarChart3, FlaskConical, Share2,
  Download, Copy, Check, TrendingUp, Activity, History,
  Code2, StopCircle, Plus, ListChecks, Settings2, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  useStartTestRun, useTestRunStatus, useTestReport,
  useTestRunSSE, useCancelTestRun, useExportReportPdf,
  type Bug as BugType, type PerformanceGauge,
  type TrendDataPoint,
} from "@/client-api/query-hooks/use-testing-hooks";

// Sub-components
import {
  BudgetStepper, TimeoutStepper, CrawlProgressPanel,
  ScoreGauge, CategoryDonut, PerfGaugeRow, TrendSparkline,
  LiveTestCaseCard, TestCaseCard, ReviewPhase,
  BugDetailModal, BugCard, HistoryPanel,
  fmtMs, SEVERITY_CONFIG, TIMEOUT_MIN_MS, TIMEOUT_MAX_MS,
} from "@/components/testing/testing-components";
import {
  GithubSourcePanel,
  type GithubSourceValue,
} from "@/components/testing/github-source-panel";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { key: "crawling",        label: "Crawling",   desc: "Mapping all pages and elements",      icon: Globe       },
  { key: "generating",      label: "Generating", desc: "AI creating test cases",              icon: Sparkles    },
  { key: "awaiting_review", label: "Review",     desc: "Confirm or edit test cases",          icon: ListChecks  },
  { key: "executing",       label: "Executing",  desc: "Running parallel browser sessions",   icon: Zap         },
  { key: "reporting",       label: "Reporting",  desc: "Compiling results and AI summary",    icon: BarChart3   },
];

const PIPELINE_ORDER: Record<string, number> = {
  crawling: 0, generating: 1, awaiting_review: 2, executing: 3, reporting: 4, complete: 5,
};

// ─── Plan limits ──────────────────────────────────────────────────────────────

interface PlanLimits { maxPages: number; maxTests: number; label: string }
const FREE_LIMITS: PlanLimits = { maxPages: 3, maxTests: 5, label: "Free" };
const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter:    { maxPages:  5, maxTests: 10, label: "Starter"   },
  pro:        { maxPages: 10, maxTests: 20, label: "Pro"        },
  enterprise: { maxPages: 20, maxTests: 30, label: "Enterprise" },
};
function getPlanLimits(planId: string | null | undefined): PlanLimits {
  if (!planId) return FREE_LIMITS;
  return PLAN_LIMITS[planId.toLowerCase()] ?? FREE_LIMITS;
}

const CONCURRENCY_MIN     = 1;
const CONCURRENCY_MAX     = 20;
const CONCURRENCY_DEFAULT = 5;
const DEFAULT_DISCOVERY_MS  = 300_000;
const DEFAULT_EXTRACTION_MS = 300_000;
const DEFAULT_EXECUTE_MS    = 300_000;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TestingPage() {
  const { subscription, hasActiveSubscription } = useUserCredits();
  const planLimits = useMemo(() => getPlanLimits(subscription?.plan_id), [subscription?.plan_id]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [url, setUrl]         = useState("");
  const [maxPages, setMaxPages] = useState(5);
  const [maxTests, setMaxTests] = useState(10);
  const [concurrency, setConcurrency]   = useState(CONCURRENCY_DEFAULT);
  const [discoveryMs, setDiscoveryMs]   = useState(DEFAULT_DISCOVERY_MS);
  const [extractionMs, setExtractionMs] = useState(DEFAULT_EXTRACTION_MS);
  const [executeMs, setExecuteMs]       = useState(DEFAULT_EXECUTE_MS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // [GITHUB] source value — set by GithubSourcePanel when validation passes
  const [githubSource, setGithubSource] = useState<GithubSourceValue | null>(null);

  // Clamp on plan change
  useEffect(() => {
    setMaxPages((p) => Math.min(p, planLimits.maxPages));
    setMaxTests((t) => Math.min(Math.max(t, 1), planLimits.maxTests));
  }, [planLimits]);

  // ── Pipeline state ──────────────────────────────────────────────────────────
  const [testRunId, setTestRunId] = useState<string | null>(null);

  // ── Report / UI state ───────────────────────────────────────────────────────
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [tcFilter, setTcFilter]             = useState<"all" | "passed" | "failed" | "flaky">("all");
  const [activeTab, setActiveTab]           = useState<"bugs" | "tests" | "performance" | "trend">("tests");
  const [selectedBug, setSelectedBug]       = useState<BugType | null>(null);
  const [showHistory, setShowHistory]       = useState(false);
  const [copied, setCopied]                 = useState(false);

  // ── Hooks ───────────────────────────────────────────────────────────────────
  const { mutate: startTest,  isPending: isStarting  } = useStartTestRun();
  const { mutate: cancelTest, isPending: isCancelling } = useCancelTestRun();
  const { mutate: exportPdf,  isPending: isExportingPdf } = useExportReportPdf();

  const { data: run } = useTestRunStatus(testRunId);

  const initialStatusForSSE =
    run?.status && ["complete", "failed", "cancelled"].includes(run.status)
      ? run.status
      : run?.status === "awaiting_review" ? "awaiting_review" : undefined;

  const { sseState } = useTestRunSSE(testRunId, initialStatusForSSE);

  // ── Derived state ────────────────────────────────────────────────────────────
  const isComplete       = sseState.isComplete  || run?.status === "complete";
  const isFailed         = sseState.pipelineStatus === "failed"   || run?.status === "failed";
  const isCancelled      = sseState.isCancelled || run?.status === "cancelled";
  const isAwaitingReview = sseState.isAwaitingReview || run?.status === "awaiting_review";
  const isRunning        = !!testRunId && !isComplete && !isFailed && !isCancelled && !isAwaitingReview;

  const { data: report } = useTestReport(testRunId, isComplete);

  const counter = sseState.counter ?? {
    passed: run?.passed ?? 0, failed: run?.failed ?? 0,
    running: run?.running ?? 0, skipped: run?.skipped ?? 0, total: run?.totalTests ?? 0,
  };

  const sseOrder     = PIPELINE_ORDER[sseState.pipelineStatus] ?? 0;
  const dbOrder      = PIPELINE_ORDER[run?.status ?? "crawling"] ?? 0;
  const pipelineStatus = sseOrder >= dbOrder ? sseState.pipelineStatus : (run?.status ?? "crawling");
  const percent        = sseState.percent > 0 ? sseState.percent : (run?.percent ?? 10);
  const currentStepIndex = PIPELINE_STEPS.findIndex((s) => s.key === pipelineStatus);

  const isCrawlingPhase  = pipelineStatus === "crawling";
  const isExecutingPhase = pipelineStatus === "executing" || pipelineStatus === "reporting";

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

  const liveTestCases = sseState.generatedTestCases;

  const hasAdvancedChanges =
    concurrency  !== CONCURRENCY_DEFAULT   ||
    discoveryMs  !== DEFAULT_DISCOVERY_MS  ||
    extractionMs !== DEFAULT_EXTRACTION_MS ||
    executeMs    !== DEFAULT_EXECUTE_MS;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleMaxPagesChange = (next: number) => {
    const pages = Math.max(1, Math.min(next, planLimits.maxPages));
    setMaxPages(pages);
    if (pages > maxTests) setMaxTests(pages);
  };

  const handleMaxTestsChange = (next: number) => {
    setMaxTests(Math.max(maxPages, Math.min(next, planLimits.maxTests)));
  };

  const handleResetAdvanced = () => {
    setConcurrency(CONCURRENCY_DEFAULT);
    setDiscoveryMs(DEFAULT_DISCOVERY_MS);
    setExtractionMs(DEFAULT_EXTRACTION_MS);
    setExecuteMs(DEFAULT_EXECUTE_MS);
  };

  const handleStart = () => {
    if (!url.trim()) { toast.error("Please enter a URL"); return; }

    const timeouts: Record<string, number> = {};
    if (discoveryMs  !== DEFAULT_DISCOVERY_MS)  timeouts.discoveryMs  = discoveryMs;
    if (extractionMs !== DEFAULT_EXTRACTION_MS) timeouts.extractionMs = extractionMs;
    if (executeMs    !== DEFAULT_EXECUTE_MS)    timeouts.executeTestBaseMs = executeMs;

    startTest(
      {
        url: url.trim(),
        maxPages,
        maxTests,
        ...(concurrency !== CONCURRENCY_DEFAULT && { concurrency }),
        ...(Object.keys(timeouts).length > 0 && { timeouts }),
        // [GITHUB] pass source fields when the panel has a validated value
        ...(githubSource && {
          githubOwner:  githubSource.owner,
          githubRepo:   githubSource.repo,
          githubBranch: githubSource.branch,
        }),
      },
      {
        onSuccess: (data) => { setTestRunId(data.testRunId); setActiveTab("tests"); toast.success("Test run started!"); },
        onError:   (err)  => toast.error(err.message ?? "Failed to start test run"),
      },
    );
  };

  const handleCancel = () => {
    if (!testRunId) return;
    cancelTest(testRunId, {
      onSuccess: (data) => { if (data.cancelled) toast.info("Test run cancelled."); },
      onError: (err) => toast.error(err.message ?? "Failed to cancel"),
    });
  };

  const handleReset = () => {
    setUrl(""); setTestRunId(null); setGithubSource(null);
    setFilterSeverity("all"); setFilterCategory("all");
    setTcFilter("all"); setActiveTab("tests"); setSelectedBug(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {selectedBug && <BugDetailModal bug={selectedBug} onClose={() => setSelectedBug(null)} />}
      {showHistory  && <HistoryPanel  onSelect={(id) => { setTestRunId(id); setActiveTab("tests"); }} onClose={() => setShowHistory(false)} />}

      {/* Header */}
      <div className="border-b border-border bg-background/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Bug className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">Testing Engine</h1>
              <p className="text-xs text-muted-foreground font-mono">Crawl → Generate → Review → Execute → Report</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)} className="text-muted-foreground hover:text-foreground text-xs gap-1.5">
              <History className="h-3.5 w-3.5" /> History
            </Button>
            {!!testRunId && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground hover:text-foreground text-xs gap-1.5">
                <RotateCcw className="h-3 w-3" /> New Test
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* ── IDLE ─────────────────────────────────────────────────────────── */}
        {!testRunId && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                <Zap className="h-3 w-3" />AI-powered · 50+ parallel sessions · 6 test categories
              </div>
              <h2 className="text-4xl font-bold tracking-tight">Test any site. <span className="text-muted-foreground/50">Automatically.</span></h2>
              <p className="text-muted-foreground text-lg max-w-md">Paste a URL. Get a comprehensive bug report in minutes.</p>
            </div>

            <div className="w-full max-w-xl space-y-3">
              {/* URL + run button */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="https://yoursite.com" value={url} onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStart()}
                    className="pl-9 h-11 font-mono text-sm" />
                </div>
                <Button onClick={handleStart} disabled={isStarting || !url.trim()}
                  className="h-11 px-5 bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium">
                  {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4" /> Run Tests</>}
                </Button>
              </div>

              {/* Test budget */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Test Budget</p>
                  {!hasActiveSubscription && (
                    <span className="text-[10px] font-mono text-muted-foreground/50 border border-border/40 rounded-full px-2 py-0.5">
                      Free plan · <a href="/pricing" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">Upgrade</a> for more
                    </span>
                  )}
                </div>
                <div className="flex gap-4">
                  <BudgetStepper label="Pages to crawl"    hint={`max ${planLimits.maxPages}`}
                    value={maxPages} min={1} max={Math.min(planLimits.maxPages, maxTests)} onChange={handleMaxPagesChange} />
                  <div className="w-px bg-border shrink-0" />
                  <BudgetStepper label="Tests to generate" hint={`max ${planLimits.maxTests}`}
                    value={maxTests} min={maxPages} max={planLimits.maxTests} onChange={handleMaxTestsChange} />
                </div>
                <p className="text-xs text-muted-foreground/50 font-mono">Tests ≥ pages · more tests = slower but more thorough</p>
              </div>

              {/* [GITHUB] Source code analysis panel */}
              <GithubSourcePanel onChange={setGithubSource} disabled={isStarting} />

              {/* Advanced settings */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <button type="button" onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Advanced Settings</span>
                    {hasAdvancedChanges && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" title="Non-default settings active" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasAdvancedChanges && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); handleResetAdvanced(); }}
                        className="text-[10px] font-mono text-muted-foreground/60 hover:text-muted-foreground transition-colors px-1.5 py-0.5 rounded border border-border/40 hover:border-border">
                        reset
                      </button>
                    )}
                    {showAdvanced ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </button>

                {showAdvanced && (
                  <div className="px-4 pb-4 border-t border-border space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Parallelism</p>
                      <BudgetStepper label="Concurrent extractions" hint={`${CONCURRENCY_MIN}–${CONCURRENCY_MAX}`}
                        value={concurrency} min={CONCURRENCY_MIN} max={CONCURRENCY_MAX} onChange={setConcurrency} />
                      <p className="text-xs text-muted-foreground/50 font-mono">
                        Pages fetched in parallel during crawl Stage 2. Higher = faster but uses more TinyFish credits simultaneously.
                      </p>
                    </div>
                    <div className="w-full h-px bg-border" />
                    <div className="space-y-3">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Timeouts</p>
                      <div className="flex gap-4">
                        <TimeoutStepper label="Discovery"  hint={`${fmtMs(TIMEOUT_MIN_MS)}–${fmtMs(TIMEOUT_MAX_MS)}`} value={discoveryMs}  onChange={setDiscoveryMs}  />
                        <div className="w-px bg-border shrink-0" />
                        <TimeoutStepper label="Extraction" hint={`${fmtMs(TIMEOUT_MIN_MS)}–${fmtMs(TIMEOUT_MAX_MS)}`} value={extractionMs} onChange={setExtractionMs} />
                        <div className="w-px bg-border shrink-0" />
                        <TimeoutStepper label="Execute"    hint={`${fmtMs(TIMEOUT_MIN_MS)}–${fmtMs(TIMEOUT_MAX_MS)}`} value={executeMs}    onChange={setExecuteMs}    />
                      </div>
                      <p className="text-xs text-muted-foreground/50 font-mono">
                        Per-call TinyFish timeouts. Increase for slow or JS-heavy sites.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground/60 text-center font-mono">Navigation · Forms · Visual · Performance · A11y · Security</p>
            </div>
          </div>
        )}

        {/* ── REVIEW ───────────────────────────────────────────────────────── */}
        {isAwaitingReview && testRunId && (
          <div className="space-y-6">
            <div className="w-full max-w-2xl mx-auto">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-3">
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <ListChecks className="h-3.5 w-3.5" /> Review &amp; edit test cases before running
                </span>
                <span className="text-muted-foreground/50">{url || run?.targetUrl}</span>
              </div>
              <Progress value={40} className="h-1" />
            </div>
            <ReviewPhase testRunId={testRunId} targetUrl={url || (run?.targetUrl ?? "")} onCancel={handleReset} />
          </div>
        )}

        {/* ── RUNNING ──────────────────────────────────────────────────────── */}
        {isRunning && (
          <div className="space-y-6">
            {/* URL + progress bar */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted border border-border px-4 py-2 rounded-full">
                <Globe className="h-3 w-3 text-muted-foreground/60" />{url || run?.targetUrl}
              </div>
              <div className="w-full max-w-xl space-y-2">
                <Progress value={percent} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>{percent}% complete</span>
                  {counter.total > 0 && <span>{counter.passed + counter.failed + counter.skipped}/{counter.total} tests done</span>}
                </div>
              </div>
            </div>

            {/* Pipeline steps */}
            <div className="w-full max-w-xl mx-auto relative">
              <div className="absolute left-[18px] top-6 bottom-6 w-px bg-border" />
              <div className="space-y-1">
                {PIPELINE_STEPS.map((step, i) => {
                  const isActive = step.key === pipelineStatus;
                  const isDone   = i < currentStepIndex;
                  const Icon     = step.icon;
                  return (
                    <div key={step.key} className={`flex items-start gap-4 p-3 rounded-xl transition-all ${isActive ? "bg-muted border border-border" : ""}`}>
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                        isDone ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                        : isActive ? "bg-muted border-border text-foreground"
                        : "bg-background border-border text-muted-foreground"
                      }`}>
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-medium ${i > currentStepIndex ? "text-muted-foreground" : "text-foreground"}`}>{step.label}</p>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                      {isActive && (
                        <div className="ml-auto pt-2 flex gap-1">
                          {[0, 1, 2].map((dot) => (
                            <div key={dot} className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                              style={{ animation: `dotPulse 1.4s ease-in-out ${dot * 0.2}s infinite` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Crawl progress panel */}
            {isCrawlingPhase && (
              <CrawlProgressPanel
                stage={sseState.crawlStage}
                stageDescription={sseState.crawlStageDescription}
                foundUrls={sseState.crawlFoundUrls}
                extractedPages={sseState.crawlExtractedPages}
                failedPages={sseState.crawlFailedPages}
              />
            )}

            {/* Cancel */}
            <div className="flex justify-center w-full max-w-xl mx-auto">
              <Button onClick={handleCancel} disabled={isCancelling} variant="outline"
                className="border-red-900/60 text-red-400 hover:bg-red-950/40 hover:border-red-700 gap-2 text-sm">
                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <StopCircle className="h-4 w-4" />}
                {isCancelling ? "Stopping…" : "Stop Test Run"}
              </Button>
            </div>

            {/* Execution counters */}
            {isExecutingPhase && (
              <div className="grid grid-cols-4 gap-3 w-full max-w-xl mx-auto">
                {[
                  { value: counter.passed,  label: "passed",  color: "text-emerald-400" },
                  { value: counter.failed,  label: "failed",  color: "text-red-400"     },
                  { value: counter.running, label: "running", color: "text-blue-400"    },
                  { value: counter.skipped, label: "skipped", color: "text-muted-foreground" },
                ].map(({ value, label, color }) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Live test cards */}
            {isExecutingPhase && (
              <div className="w-full max-w-2xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <FlaskConical className="h-3.5 w-3.5" />
                    {liveTestCases.length > 0 ? `Test Cases — ${liveTestCases.length} running` : "Test Cases — waiting for first result…"}
                  </p>
                  {liveTestCases.length > 0 && (
                    <div className="flex gap-3 text-xs font-mono">
                      <span className="text-emerald-400">{liveTestCases.filter(t => t.status === "passed").length} ✓</span>
                      <span className="text-red-400">{liveTestCases.filter(t => t.status === "failed").length} ✗</span>
                      <span className="text-blue-400">{liveTestCases.filter(t => t.status === "running").length} ⟳</span>
                      <span className="text-muted-foreground">{liveTestCases.filter(t => t.status === "pending").length} pending</span>
                    </div>
                  )}
                </div>
                {liveTestCases.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card/40 p-6 flex items-center justify-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-mono">Executing tests in parallel…</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {liveTestCases.map((tc) => <LiveTestCaseCard key={tc.id} tc={tc} />)}
                  </div>
                )}
              </div>
            )}

            {/* Generating placeholder */}
            {pipelineStatus === "generating" && (
              <div className="w-full max-w-xl mx-auto rounded-xl border border-border bg-card/40 p-4 flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-sm text-muted-foreground">AI is generating test cases from the crawled pages…</p>
              </div>
            )}

            {/* Live bugs */}
            {sseState.liveBugs.length > 0 && (
              <div className="w-full max-w-2xl mx-auto">
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Bug className="h-3 w-3 text-red-400" /> Failed ({sseState.liveBugs.length})
                </p>
                <div className="space-y-1.5">
                  {sseState.liveBugs.map((bug) => (
                    <div key={bug.id} className="flex items-center gap-3 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${SEVERITY_CONFIG[bug.severity as keyof typeof SEVERITY_CONFIG]?.dot ?? "bg-muted-foreground"}`} />
                      <p className="text-xs text-foreground flex-1 truncate">{bug.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CANCELLED ────────────────────────────────────────────────────── */}
        {isCancelled && (
          <div className="flex flex-col items-center gap-6 py-16">
            <div className="h-16 w-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <StopCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground">Test run cancelled</h3>
              <p className="text-muted-foreground text-sm mt-1">You stopped this run. No further calls will be made.</p>
              {(counter.passed > 0 || counter.failed > 0) && (
                <p className="text-muted-foreground/60 text-xs font-mono mt-2">{counter.passed} passed · {counter.failed} failed before stopping</p>
              )}
            </div>
            <Button onClick={handleReset} variant="outline" className="gap-2"><RotateCcw className="h-4 w-4" /> Run New Test</Button>
          </div>
        )}

        {/* ── FAILED ───────────────────────────────────────────────────────── */}
        {isFailed && (
          <div className="flex flex-col items-center gap-6 py-16">
            <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">Test run failed</h3>
              <p className="text-muted-foreground text-sm mt-1">{sseState.errorMessage ?? "Something went wrong. Please try again."}</p>
            </div>
            <Button onClick={handleReset} variant="outline" className="gap-2"><RotateCcw className="h-4 w-4" /> Try Again</Button>
          </div>
        )}

        {/* ── COMPLETE ─────────────────────────────────────────────────────── */}
        {isComplete && report && (
          <div className="space-y-8">
            {/* Score hero */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <ScoreGauge score={report.overallScore ?? 0} />
                <div className="flex-1 space-y-4 w-full">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mb-1">
                      <Globe className="h-3 w-3" />{report.targetUrl}
                      <a href={report.targetUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 hover:text-foreground" />
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/60 font-mono">
                      <Clock className="h-3 w-3" />
                      {report.crawlSummary.totalPages} pages crawled · {Math.round(report.crawlSummary.crawlTimeMs / 1000)}s crawl time
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex gap-px h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500" style={{ width: `${((report.passed ?? 0) / (report.totalTests ?? 1)) * 100}%` }} />
                      <div className="bg-red-500"     style={{ width: `${((report.failed  ?? 0) / (report.totalTests ?? 1)) * 100}%` }} />
                      <div className="bg-muted flex-1" />
                    </div>
                    <div className="flex gap-4 text-xs font-mono">
                      <span className="text-emerald-400">{report.passed} passed</span>
                      <span className="text-red-400">{report.failed} failed</span>
                      <span className="text-muted-foreground">{report.skipped} skipped</span>
                      <span className="text-muted-foreground/60 ml-auto">{report.totalTests} total</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Category donuts */}
            {Object.keys(report.resultsByCategory).length > 0 && (
              <div>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Category Breakdown</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Object.entries(report.resultsByCategory).map(([cat, data]) => (
                    <CategoryDonut key={cat} category={cat} passed={data.passed} total={data.total}
                      active={filterCategory === cat} onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)} />
                  ))}
                </div>
              </div>
            )}

            {/* AI summary */}
            {report.aiSummary && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">AI Summary</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{report.aiSummary}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border overflow-x-auto">
              {([
                { key: "tests",       label: "Test Cases",  count: report.testCases?.length ?? 0,        icon: FlaskConical },
                { key: "bugs",        label: "Bugs",        count: report.bugs?.length ?? 0,              icon: Bug         },
                { key: "performance", label: "Performance", count: report.performanceGauges?.length ?? 0, icon: Activity    },
                { key: "trend",       label: "Trend",       count: report.trendData?.length ?? 0,         icon: TrendingUp  },
              ] as const).map(({ key, label, count, icon: Icon }) => (
                <button key={key} onClick={() => setActiveTab(key as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px shrink-0 ${
                    activeTab === key ? "border-emerald-500 text-emerald-400" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                  <Icon className="h-3.5 w-3.5" />{label}
                  {count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${activeTab === key ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tests tab */}
            {activeTab === "tests" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground font-mono">Filter:</span>
                  {(["all", "passed", "failed", "flaky"] as const).map((f) => (
                    <button key={f} onClick={() => setTcFilter(f)}
                      className={`text-xs px-2.5 py-1 rounded-full font-mono capitalize transition-all ${tcFilter === f ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {f}{f !== "all" && (
                        <span className="ml-1 text-muted-foreground/60">
                          ({(report.testCases ?? []).filter((tc) => {
                            const live = sseState.testUpdates[tc.id]?.status;
                            return (live ?? tc.results?.[0]?.status ?? "skipped") === f;
                          }).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {filteredTestCases.length === 0
                    ? <div className="rounded-xl border border-border bg-card p-8 text-center">
                        <FlaskConical className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No test cases match this filter</p>
                      </div>
                    : filteredTestCases.map((tc) => <TestCaseCard key={tc.id} tc={tc} liveStatus={sseState.testUpdates[tc.id]} />)
                  }
                </div>
              </div>
            )}

            {/* Bugs tab */}
            {activeTab === "bugs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-red-400" />
                    <h3 className="text-sm font-semibold">{filteredBugs.length} Bug{filteredBugs.length !== 1 ? "s" : ""}</h3>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {["all", "critical", "high", "medium", "low"].map((sev) => (
                      <button key={sev} onClick={() => setFilterSeverity(sev)}
                        className={`text-xs px-2.5 py-1 rounded-full font-mono capitalize transition-all ${filterSeverity === sev ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>
                {filteredBugs.length === 0
                  ? <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No bugs found for this filter</p>
                    </div>
                  : <div className="space-y-2">{filteredBugs.map((bug) => <BugCard key={bug.id} bug={bug} onClick={() => setSelectedBug(bug)} />)}</div>
                }
              </div>
            )}

            {/* Performance tab */}
            {activeTab === "performance" && (
              <div className="space-y-4">
                {(!report.performanceGauges || report.performanceGauges.length === 0)
                  ? <div className="rounded-xl border border-border bg-card p-8 text-center">
                      <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No performance data available</p>
                    </div>
                  : report.performanceGauges.map((pg: PerformanceGauge) => (
                    <div key={pg.pageUrl} className="rounded-xl border border-border bg-card p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="text-xs font-mono text-muted-foreground truncate">{pg.pageUrl}</p>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wider mb-2">Core Web Vitals</p>
                      <div className="space-y-3 mb-5">
                        <PerfGaugeRow label="LCP"  value={pg.lcpMs}  unit="ms" status={pg.lcpStatus}  />
                        <PerfGaugeRow label="CLS"  value={pg.cls}    unit=""   status={pg.clsStatus}  />
                        <PerfGaugeRow label="TTFB" value={pg.ttfbMs} unit="ms" status={pg.ttfbStatus} />
                      </div>
                      <p className="text-xs font-mono text-muted-foreground/60 uppercase tracking-wider mb-2">Load Timing</p>
                      <div className="space-y-3">
                        <PerfGaugeRow label="DCL"  value={pg.domContentLoadedMs} unit="ms" status={pg.domContentLoadedStatus ?? "unknown"} />
                        <PerfGaugeRow label="Load" value={pg.loadEventMs}         unit="ms" status={pg.loadEventStatus ?? "unknown"} />
                      </div>
                      <div className="flex gap-4 mt-4 pt-3 border-t border-border flex-wrap">
                        {[{ label: "Good", color: "bg-emerald-500" }, { label: "Needs improvement", color: "bg-yellow-500" }, { label: "Poor", color: "bg-red-500" }, { label: "Unknown", color: "bg-muted-foreground/30" }]
                          .map(({ label, color }) => (
                            <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <div className={`h-2 w-2 rounded-full ${color}`} />{label}
                            </div>
                          ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-x-6 gap-y-1">
                        {[
                          { label: "LCP",  desc: "Largest Contentful Paint — render time of largest element" },
                          { label: "CLS",  desc: "Cumulative Layout Shift — visual stability score"           },
                          { label: "TTFB", desc: "Time to First Byte — server response speed"                 },
                          { label: "DCL",  desc: "DOMContentLoaded — HTML parsed, scripts ready"              },
                          { label: "Load", desc: "Page Load — all resources including images finished"        },
                        ].map(({ label, desc }) => (
                          <div key={label} className="flex gap-2 text-xs py-0.5">
                            <span className="font-mono text-muted-foreground shrink-0 w-10">{label}</span>
                            <span className="text-muted-foreground/60">{desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* Trend tab */}
            {activeTab === "trend" && (
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Score Over Time</h3>
                  <span className="text-xs text-muted-foreground/60 font-mono">{report.targetUrl}</span>
                </div>
                <TrendSparkline data={report.trendData ?? []} />
                {report.trendData && report.trendData.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-border space-y-2">
                    {report.trendData.map((pt: TrendDataPoint) => (
                      <div key={pt.runId} className={`flex items-center gap-3 text-xs font-mono ${pt.isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                        <span className="w-24 shrink-0">{new Date(pt.date).toLocaleDateString()}</span>
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${(pt.score ?? 0) >= 90 ? "bg-emerald-500" : (pt.score ?? 0) >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${pt.score ?? 0}%` }} />
                        </div>
                        <span className={`w-8 text-right ${(pt.score ?? 0) >= 90 ? "text-emerald-400" : (pt.score ?? 0) >= 70 ? "text-yellow-400" : "text-red-400"}`}>{pt.score}</span>
                        {pt.isCurrent && <span className="text-muted-foreground/60">(current)</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer actions */}
            <div className="flex gap-3 flex-wrap pb-10">
              <Button variant="outline" className="gap-2 text-sm" disabled={isExportingPdf}
                onClick={() => { if (!testRunId) return; exportPdf(testRunId, { onSuccess: () => toast.success("PDF report downloaded"), onError: (err) => toast.error(err.message ?? "PDF export failed") }); }}>
                {isExportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isExportingPdf ? "Generating PDF…" : "Export PDF"}
              </Button>
              <Button variant="outline" className="gap-2 text-sm"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                  a.download = `buildify-test-report-${Date.now()}.json`; a.click();
                  toast.success("JSON report downloaded");
                }}>
                <FileText className="h-4 w-4" /> Export JSON
              </Button>
              {report.shareableSlug && (
                <Button variant="outline" className="gap-2 text-sm"
                  onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/report/${report.shareableSlug}`); setCopied(true); toast.success("Shareable link copied!"); setTimeout(() => setCopied(false), 2000); }}>
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
                  {copied ? "Copied!" : "Share Link"}
                </Button>
              )}
              {report.embedBadgeToken && (
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-2 text-sm"
                  onClick={() => {
                    const badge = `[![Tested by Buildify](${window.location.origin}/api/badge/${report.embedBadgeToken}/svg)](${window.location.origin}/report/${report.shareableSlug})`;
                    void navigator.clipboard.writeText(badge); toast.success("Badge markdown copied!");
                  }}>
                  <Code2 className="h-4 w-4" /> Copy Badge
                </Button>
              )}
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-2 text-sm ml-auto" onClick={handleReset}>
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