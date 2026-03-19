"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUserCredits } from "@/hooks/use-user-credits";
import {
  Globe, Play, Loader2, CheckCircle2, XCircle,
  RotateCcw, ExternalLink, Zap, Bug, Sparkles,
  Clock, BarChart3, FlaskConical, Share2, Download,
  Check, TrendingUp, Activity, History,
  Code2, Settings2, FileText, Plus,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  useStartTestRun, useTestRunStatus, useTestReport,
  useTestRunSSE, useCancelTestRun, useExportReportPdf,
  useTestUsage,
  type Bug as BugType, type PerformanceGauge, type TrendDataPoint,
} from "@/client-api/query-hooks/use-testing-hooks";

import {
  BudgetStepper, TimeoutStepper, CrawlProgressPanel,
  ScoreGauge, CategoryDonut, PerfGaugeRow, TrendSparkline,
  LiveTestCaseCard, TestCaseCard, ReviewPhase,
  BugDetailModal, BugCard, HistoryPanel,
  PipelineStepsRow, ExecutionCounters, StopButton,
  fmtMs, SEVERITY_CONFIG, TIMEOUT_MIN_MS, TIMEOUT_MAX_MS,
} from "@/components/testing/testing-components";
import {
  GithubSourcePanel,
  type GithubSourceValue,
} from "@/components/testing/github-source-panel";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_ORDER: Record<string, number> = {
  crawling: 0, generating: 1, awaiting_review: 2, executing: 3, reporting: 4, complete: 5,
};

interface PlanLimits { maxPages: number; maxTests: number; label: string }
const FREE_LIMITS: PlanLimits = { maxPages: 3, maxTests: 5, label: "Free" };
const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter:    { maxPages:  5, maxTests: 10, label: "Starter"   },
  pro:        { maxPages: 10, maxTests: 20, label: "Pro"        },
  enterprise: { maxPages: 20, maxTests: 30, label: "Enterprise" },
};
function getPlanLimits(p: string | null | undefined): PlanLimits {
  if (!p) return FREE_LIMITS;
  return PLAN_LIMITS[p.toLowerCase()] ?? FREE_LIMITS;
}

const CONCURRENCY_MIN     = 1;
const CONCURRENCY_MAX     = 20;
const CONCURRENCY_DEFAULT = 5;
const DEFAULT_DISCOVERY_MS  = 300_000;
const DEFAULT_EXTRACTION_MS = 300_000;
const DEFAULT_EXECUTE_MS    = 300_000;

// ─── Button primitives ────────────────────────────────────────────────────────

function BfyPrimaryBtn({ onClick, disabled, children, className = "" }: {
  onClick?: () => void; disabled?: boolean; children: React.ReactNode; className?: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-[#00FF85] text-black text-sm font-mono font-bold hover:bg-[#00FF85]/90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all touch-manipulation shrink-0 ${className}`}>
      {children}
    </button>
  );
}

function BfyGhostBtn({ onClick, children, className = "" }: {
  onClick?: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all touch-manipulation ${className}`}>
      {children}
    </button>
  );
}

// ─── Usage Pill ───────────────────────────────────────────────────────────────
// Shows today's run count vs daily limit. Goes amber at 80% and red when full.
// Only renders when usage data is available (no flash of content on first load).

function UsagePill({ runsToday, dailyLimit, planId }: {
  runsToday: number;
  dailyLimit: number;
  planId: string;
}) {
  const remaining = dailyLimit - runsToday;
  const pct = runsToday / dailyLimit;
  const isAtLimit   = runsToday >= dailyLimit;
  const isNearLimit = pct >= 0.8 && !isAtLimit;

  const barColor = isAtLimit
    ? "bg-red-500"
    : isNearLimit
    ? "bg-yellow-500"
    : "bg-[#00FF85]";

  const textColor = isAtLimit
    ? "text-red-500"
    : isNearLimit
    ? "text-yellow-500"
    : "text-muted-foreground/50";

  const borderColor = isAtLimit
    ? "border-red-500/25"
    : isNearLimit
    ? "border-yellow-500/20"
    : "border-border";

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${borderColor} bg-background`}
      title={`${runsToday} of ${dailyLimit} daily runs used (${planId} plan). Resets at midnight UTC.`}
      role="meter"
      aria-valuenow={runsToday}
      aria-valuemin={0}
      aria-valuemax={dailyLimit}
      aria-label={`${runsToday} of ${dailyLimit} runs today`}
    >
      {/* Mini progress track */}
      <div className="w-16 h-1 rounded-full bg-border overflow-hidden shrink-0">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, pct * 100)}%` }}
        />
      </div>

      <span className={`text-[10px] font-mono tabular-nums ${textColor}`}>
        {isAtLimit ? (
          <span className="text-red-500">limit reached</span>
        ) : (
          <>{remaining} run{remaining !== 1 ? "s" : ""} left today</>
        )}
      </span>

      {/* Upgrade nudge only on free tier when at or near limit */}
      {(isAtLimit || isNearLimit) && planId === "free" && (
        <a
          href="/pricing"
          className="text-[10px] font-mono text-[#00FF85]/70 hover:text-[#00FF85] underline underline-offset-2 shrink-0 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          upgrade
        </a>
      )}
    </div>
  );
}

// ─── Prefill Banner ───────────────────────────────────────────────────────────
// Shown briefly when the page was opened from the Preview Panel with prefilled
// query params (url, owner, repo, branch). Auto-dismisses after 6 seconds.

function PrefillBanner({ repoFullName, onDismiss }: { repoFullName: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-[#00FF85]/20 bg-[#00FF85]/5 text-xs font-mono text-muted-foreground animate-in fade-in-0 slide-in-from-top-1 duration-200">
      <FlaskConical className="h-3.5 w-3.5 text-[#00FF85] shrink-0" />
      <span>
        Prefilled from your project ·{" "}
        <span className="text-foreground font-medium">{repoFullName}</span>
      </span>
      <button onClick={onDismiss} className="ml-auto text-muted-foreground/40 hover:text-muted-foreground transition-colors">✕</button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TestingPage() {
  const searchParams = useSearchParams();
  const { subscription, hasActiveSubscription } = useUserCredits();
  const planLimits = useMemo(() => getPlanLimits(subscription?.plan_id), [subscription?.plan_id]);

  // [ADDED] Daily run quota — drives the usage pill and Run button disable state
  const { data: usageData } = useTestUsage();
  const isAtDailyLimit = usageData
    ? usageData.runsToday >= usageData.dailyLimit
    : false;

  // ── Read prefill params from query string (set by PreviewPanel's TestingButton) ──
  // These are optional — the page works normally when no params are present.
  const prefillUrl    = searchParams.get("url") ?? "";
  const prefillOwner  = searchParams.get("owner") ?? "";
  const prefillRepo   = searchParams.get("repo") ?? "";
  const prefillBranch = searchParams.get("branch") ?? "";
  const hasPrefill    = !!(prefillUrl || prefillOwner || prefillRepo);

  const [url, setUrl]               = useState(prefillUrl);
  const [maxPages, setMaxPages]     = useState(5);
  const [maxTests, setMaxTests]     = useState(10);
  const [concurrency, setConcurrency]   = useState(CONCURRENCY_DEFAULT);
  const [discoveryMs, setDiscoveryMs]   = useState(DEFAULT_DISCOVERY_MS);
  const [extractionMs, setExtractionMs] = useState(DEFAULT_EXTRACTION_MS);
  const [executeMs, setExecuteMs]       = useState(DEFAULT_EXECUTE_MS);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [githubSource, setGithubSource] = useState<GithubSourceValue | null>(null);

  // Show the prefill banner once if we arrived with params
  const [showPrefillBanner, setShowPrefillBanner] = useState(hasPrefill);

  // Derived repo name shown in the banner
  const prefillRepoFullName = prefillOwner && prefillRepo
    ? `${prefillOwner}/${prefillRepo}`
    : prefillRepo || prefillOwner;

  // Initial value passed down to GithubSourcePanel to seed its fields
  const githubInitial: GithubSourceValue | null = (prefillOwner && prefillRepo)
    ? { owner: prefillOwner, repo: prefillRepo, branch: prefillBranch || "main" }
    : null;

  useEffect(() => {
    setMaxPages((p) => Math.min(p, planLimits.maxPages));
    setMaxTests((t) => Math.min(Math.max(t, 1), planLimits.maxTests));
  }, [planLimits]);

  const [testRunId, setTestRunId]             = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity]   = useState("all");
  const [filterCategory, setFilterCategory]   = useState("all");
  const [tcFilter, setTcFilter]               = useState<"all"|"passed"|"failed"|"flaky">("all");
  const [activeTab, setActiveTab]             = useState<"tests"|"bugs"|"performance"|"trend">("tests");
  const [selectedBug, setSelectedBug]         = useState<BugType | null>(null);
  const [showHistory, setShowHistory]         = useState(false);
  const [copied, setCopied]                   = useState(false);

  const { mutate: startTest,  isPending: isStarting    } = useStartTestRun();
  const { mutate: cancelTest, isPending: isCancelling  } = useCancelTestRun();
  const { mutate: exportPdf,  isPending: isExportingPdf} = useExportReportPdf();
  const { data: run } = useTestRunStatus(testRunId);

  const initialStatusForSSE =
    run?.status && ["complete","failed","cancelled"].includes(run.status) ? run.status
    : run?.status === "awaiting_review" ? "awaiting_review" : undefined;

  const { sseState } = useTestRunSSE(testRunId, initialStatusForSSE);

  const isComplete       = sseState.isComplete       || run?.status === "complete";
  const isFailed         = sseState.pipelineStatus === "failed" || run?.status === "failed";
  const isCancelled      = sseState.isCancelled      || run?.status === "cancelled";
  const isAwaitingReview = sseState.isAwaitingReview || run?.status === "awaiting_review";
  const isRunning        = !!testRunId && !isComplete && !isFailed && !isCancelled && !isAwaitingReview;

  const { data: report } = useTestReport(testRunId, isComplete);

  const counter = sseState.counter ?? {
    passed: run?.passed ?? 0, failed: run?.failed ?? 0,
    running: run?.running ?? 0, skipped: run?.skipped ?? 0, total: run?.totalTests ?? 0,
  };

  const sseOrder       = PIPELINE_ORDER[sseState.pipelineStatus] ?? 0;
  const dbOrder        = PIPELINE_ORDER[run?.status ?? "crawling"] ?? 0;
  const pipelineStatus = sseOrder >= dbOrder ? sseState.pipelineStatus : (run?.status ?? "crawling");
  const percent        = sseState.percent > 0 ? sseState.percent : (run?.percent ?? 10);
  const isCrawlingPhase  = pipelineStatus === "crawling";
  const isExecutingPhase = pipelineStatus === "executing" || pipelineStatus === "reporting";
  const liveTestCases    = sseState.generatedTestCases;

  const filteredBugs = (report?.bugs ?? []).filter((b) => {
    if (filterSeverity !== "all" && b.severity !== filterSeverity) return false;
    if (filterCategory !== "all" && b.category !== filterCategory) return false;
    return true;
  });
  const filteredTestCases = (report?.testCases ?? []).filter((tc) => {
    if (tcFilter === "all") return true;
    const ls = sseState.testUpdates[tc.id]?.status;
    return (ls ?? tc.results?.[0]?.status ?? "skipped") === tcFilter;
  });

  const hasAdvancedChanges = concurrency !== CONCURRENCY_DEFAULT || discoveryMs !== DEFAULT_DISCOVERY_MS || extractionMs !== DEFAULT_EXTRACTION_MS || executeMs !== DEFAULT_EXECUTE_MS;

  const handleMaxPagesChange = (n: number) => {
    const p = Math.max(1, Math.min(n, planLimits.maxPages));
    setMaxPages(p); if (p > maxTests) setMaxTests(p);
  };
  const handleStart = () => {
    if (!url.trim()) { toast.error("Please enter a URL"); return; }
    // [ADDED] Client-side guard — the server enforces this too, but blocking
    // early gives a better UX than waiting for a 429 after crawl starts.
    if (isAtDailyLimit) {
      toast.error(
        `Daily limit reached. Your ${usageData?.planId ?? "free"} plan allows ${usageData?.dailyLimit ?? 0} runs/day. Resets at midnight UTC.`
      );
      return;
    }
    const timeouts: Record<string, number> = {};
    if (discoveryMs  !== DEFAULT_DISCOVERY_MS)  timeouts.discoveryMs       = discoveryMs;
    if (extractionMs !== DEFAULT_EXTRACTION_MS) timeouts.extractionMs      = extractionMs;
    if (executeMs    !== DEFAULT_EXECUTE_MS)    timeouts.executeTestBaseMs = executeMs;
    startTest(
      { url: url.trim(), maxPages, maxTests,
        ...(concurrency !== CONCURRENCY_DEFAULT && { concurrency }),
        ...(Object.keys(timeouts).length > 0 && { timeouts }),
        ...(githubSource && { githubOwner: githubSource.owner, githubRepo: githubSource.repo, githubBranch: githubSource.branch }) },
      { onSuccess: (d) => { setTestRunId(d.testRunId); setActiveTab("tests"); toast.success("Test run started!"); },
        onError: (e) => toast.error(e.message ?? "Failed") }
    );
  };
  const handleCancel = () => {
    if (!testRunId) return;
    cancelTest(testRunId, { onSuccess: (d) => { if (d.cancelled) toast.info("Cancelled."); }, onError: (e) => toast.error(e.message ?? "Failed") });
  };
  const handleReset = () => {
    setUrl(""); setTestRunId(null); setGithubSource(null);
    setFilterSeverity("all"); setFilterCategory("all");
    setTcFilter("all"); setActiveTab("tests"); setSelectedBug(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {selectedBug && <BugDetailModal bug={selectedBug} onClose={() => setSelectedBug(null)} />}
      {showHistory  && <HistoryPanel onSelect={(id) => { setTestRunId(id); setActiveTab("tests"); }} onClose={() => setShowHistory(false)} />}

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <main className="w-full max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Actions row — History + New Test only, no logo (app already shows "Testing") */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#00FF85]/10 border border-[#00FF85]/20 flex items-center justify-center">
              <Bug className="h-3.5 w-3.5 text-[#00FF85]" />
            </div>
            <span className="text-sm font-mono font-semibold text-foreground">TestFish</span>
            <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">BETA</span>
            {testRunId && (run?.targetUrl || url) && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/40 truncate max-w-[160px]">
                <span className="text-border shrink-0">·</span>
                <span className="truncate">{(url || (run?.targetUrl ?? "")).replace(/^https?:\/\//, "")}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <BfyGhostBtn onClick={() => setShowHistory(true)}>
              <History className="h-3.5 w-3.5" />
              <span>History</span>
            </BfyGhostBtn>
            {!!testRunId && (
              <BfyGhostBtn onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>New Test</span>
              </BfyGhostBtn>
            )}
          </div>
        </div>

        {/* ══ IDLE ═══════════════════════════════════════════════════════════ */}
        {!testRunId && (
          <div className="space-y-4">

            {/* Prefill banner — only shown when navigated here from the Preview Panel */}
            {showPrefillBanner && prefillRepoFullName && (
              <PrefillBanner
                repoFullName={prefillRepoFullName}
                onDismiss={() => setShowPrefillBanner(false)}
              />
            )}

            {/* Hero */}
            <div className="text-center space-y-2 pt-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#00FF85] bg-[#00FF85]/10 border border-[#00FF85]/20 px-3 py-1 rounded-full">
                <Zap className="h-3 w-3" /> ai-powered · 6 test categories
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Test any site. <span className="text-muted-foreground/40">Automatically.</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">Paste a URL. Get a full bug report in minutes.</p>
            </div>

            {/* URL row + usage pill */}
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                <input type="url" placeholder="https://your-app.com" value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                  aria-label="Website URL to test"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[#00FF85]/50 focus:ring-1 focus:ring-[#00FF85]/20 transition-colors" />
              </div>
              {/* [ADDED] Disable the Run button when the daily cap is reached.
                  isAtDailyLimit is false until usageData loads, so it never
                  flashes disabled on first render. */}
              <BfyPrimaryBtn onClick={handleStart} disabled={isStarting || !url.trim() || isAtDailyLimit}>
                {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4" /><span className="hidden xs:inline">Run Tests</span><span className="xs:hidden">Run</span></>}
              </BfyPrimaryBtn>
            </div>

            {/* [ADDED] Usage pill — shown only once data has loaded to avoid
                a flash of "0 runs left" before the fetch completes. */}
            {usageData && (
              <div className="flex items-center justify-end -mt-1">
                <UsagePill
                  runsToday={usageData.runsToday}
                  dailyLimit={usageData.dailyLimit}
                  planId={usageData.planId}
                />
              </div>
            )}

            {/* Test Budget */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Test Budget</p>
                {!hasActiveSubscription && (
                  <span className="text-[10px] font-mono text-muted-foreground/30 border border-border rounded-full px-2 py-0.5 shrink-0">
                    free · <a href="/pricing" className="text-[#00FF85]/60 hover:text-[#00FF85] underline underline-offset-2">upgrade</a>
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <BudgetStepper label="pages to crawl" hint={`max ${planLimits.maxPages}`} value={maxPages}
                  min={1} max={Math.min(planLimits.maxPages, maxTests)} onChange={handleMaxPagesChange} />
                <div className="hidden sm:block w-px bg-border shrink-0" aria-hidden="true" />
                <BudgetStepper label="tests to generate" hint={`max ${planLimits.maxTests}`} value={maxTests}
                  min={maxPages} max={planLimits.maxTests} onChange={(n) => setMaxTests(Math.max(maxPages, Math.min(n, planLimits.maxTests)))} />
              </div>
              <p className="text-[9px] font-mono text-muted-foreground/30">tests ≥ pages · more tests = more thorough</p>
            </div>

            {/* Advanced settings */}
            <div className="rounded-xl border border-border overflow-hidden">
              <button type="button" onClick={() => setShowAdvanced(v => !v)} aria-expanded={showAdvanced}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors touch-manipulation">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-3.5 w-3.5 text-muted-foreground/40" />
                  <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">Advanced Settings</span>
                  {hasAdvancedChanges && <span className="h-1.5 w-1.5 rounded-full bg-[#00FF85]" />}
                </div>
                <div className="flex items-center gap-2">
                  {hasAdvancedChanges && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setConcurrency(CONCURRENCY_DEFAULT); setDiscoveryMs(DEFAULT_DISCOVERY_MS); setExtractionMs(DEFAULT_EXTRACTION_MS); setExecuteMs(DEFAULT_EXECUTE_MS); }}
                      className="text-[9px] font-mono text-muted-foreground/30 hover:text-muted-foreground px-1.5 py-0.5 rounded border border-border">reset</button>
                  )}
                  {showAdvanced ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />}
                </div>
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 border-t border-border space-y-4 pt-4">
                  {/* Parallelism */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">Parallelism</p>
                    <div className="max-w-xs">
                      <BudgetStepper label="concurrent extractions" hint={`${CONCURRENCY_MIN}–${CONCURRENCY_MAX}`}
                        value={concurrency} min={CONCURRENCY_MIN} max={CONCURRENCY_MAX} onChange={setConcurrency} />
                    </div>
                    <p className="text-[9px] font-mono text-muted-foreground/30">higher = faster but more simultaneous credits</p>
                  </div>
                  <div className="h-px bg-border" />
                  {/* Timeouts — 3-col grid on tablet+ */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest">Timeouts</p>
                    <div className="grid grid-cols-3 gap-3">
                      <TimeoutStepper label="discovery"  hint={`${fmtMs(TIMEOUT_MIN_MS)}–${fmtMs(TIMEOUT_MAX_MS)}`} value={discoveryMs}  onChange={setDiscoveryMs}  />
                      <TimeoutStepper label="extraction" hint={`${fmtMs(TIMEOUT_MIN_MS)}–${fmtMs(TIMEOUT_MAX_MS)}`} value={extractionMs} onChange={setExtractionMs} />
                      <TimeoutStepper label="execute"    hint={`${fmtMs(TIMEOUT_MIN_MS)}–${fmtMs(TIMEOUT_MAX_MS)}`} value={executeMs}    onChange={setExecuteMs}    />
                    </div>
                    <p className="text-[9px] font-mono text-muted-foreground/30">increase for slow or JS-heavy sites</p>
                  </div>
                </div>
              )}
            </div>

            {/* Source Code Analysis — after Advanced Settings.
                Pass initialValue so it seeds the form when navigated from a project. */}
            <GithubSourcePanel
              onChange={setGithubSource}
              disabled={isStarting}
              initialValue={githubInitial}
            />

            <p className="text-[10px] font-mono text-muted-foreground/30 text-center pb-2">
              navigation · forms · visual · performance · a11y · security
            </p>
          </div>
        )}

        {/* ══ REVIEW ═════════════════════════════════════════════════════════ */}
        {isAwaitingReview && testRunId && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <PipelineStepsRow pipelineStatus="awaiting_review" percent={40} />
            </div>
            <ReviewPhase testRunId={testRunId} targetUrl={url || (run?.targetUrl ?? "")} onCancel={handleReset} />
          </div>
        )}

        {/* ══ RUNNING ════════════════════════════════════════════════════════ */}
        {isRunning && (
          <div className="space-y-4">

            {/* Top card */}
            <div className="rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    {(url || (run?.targetUrl ?? "")).replace(/^https?:\/\//, "")}
                  </span>
                </div>
                <StopButton onCancel={handleCancel} isCancelling={isCancelling} />
              </div>
              <PipelineStepsRow pipelineStatus={pipelineStatus} percent={percent} />
            </div>

            {/* Counters */}
            {isExecutingPhase && (
              <ExecutionCounters passed={counter.passed} failed={counter.failed}
                running={counter.running} skipped={counter.skipped} total={counter.total} />
            )}

            {/* Crawl panel */}
            {isCrawlingPhase && (
              <CrawlProgressPanel stage={sseState.crawlStage} stageDescription={sseState.crawlStageDescription}
                foundUrls={sseState.crawlFoundUrls} extractedPages={sseState.crawlExtractedPages} failedPages={sseState.crawlFailedPages} />
            )}

            {/* Generating */}
            {pipelineStatus === "generating" && (
              <div className="rounded-xl border border-border p-4 flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-[#00FF85] shrink-0" />
                <p className="text-xs font-mono text-muted-foreground">ai is generating test cases from crawled pages…</p>
              </div>
            )}

            {/* Live test cards — tablet: 2-col grid */}
            {isExecutingPhase && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest flex items-center gap-1.5">
                    <FlaskConical className="h-3 w-3" />
                    {liveTestCases.length > 0 ? `${liveTestCases.length} test cases` : "executing…"}
                  </p>
                  {liveTestCases.length > 0 && (
                    <div className="flex gap-3 text-[10px] font-mono">
                      <span className="text-[#00FF85]">{liveTestCases.filter(t => t.status === "passed").length}✓</span>
                      <span className="text-red-500">{liveTestCases.filter(t => t.status === "failed").length}✗</span>
                      <span className="text-blue-500">{liveTestCases.filter(t => t.status === "running").length}⟳</span>
                    </div>
                  )}
                </div>
                {liveTestCases.length === 0
                  ? (
                    <div className="rounded-xl border border-border p-5 flex items-center justify-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-[#00FF85]" />
                      <p className="text-xs font-mono text-muted-foreground">executing tests in parallel…</p>
                    </div>
                  )
                  : (
                    /* tablet: 2-col, mobile: 1-col */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list">
                      {liveTestCases.map((tc) => (
                        <div key={tc.id} role="listitem"><LiveTestCaseCard tc={tc} /></div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}

            {/* Live bugs */}
            {sseState.liveBugs.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Bug className="h-3 w-3 text-red-500" />
                  {sseState.liveBugs.length} issue{sseState.liveBugs.length !== 1 ? "s" : ""} found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" role="list">
                  {sseState.liveBugs.map((bug) => (
                    <div key={bug.id} role="listitem"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-red-500/15 bg-red-500/5">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${SEVERITY_CONFIG[bug.severity as keyof typeof SEVERITY_CONFIG]?.dot ?? "bg-muted-foreground"}`} />
                      <p className="text-xs font-mono text-foreground flex-1 truncate">{bug.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ CANCELLED ══════════════════════════════════════════════════════ */}
        {isCancelled && (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <XCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-base font-mono font-semibold text-foreground">test run cancelled</h2>
              <p className="text-muted-foreground text-xs font-mono mt-1">you stopped this run.</p>
              {(counter.passed > 0 || counter.failed > 0) && (
                <p className="text-muted-foreground/40 text-[10px] font-mono mt-1.5">{counter.passed} passed · {counter.failed} failed before stopping</p>
              )}
            </div>
            <button onClick={handleReset}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all touch-manipulation">
              <RotateCcw className="h-4 w-4" /> run new test
            </button>
          </div>
        )}

        {/* ══ FAILED ═════════════════════════════════════════════════════════ */}
        {isFailed && (
          <div className="flex flex-col items-center gap-5 py-16 text-center" role="alert">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-mono font-semibold text-foreground">test run failed</h2>
              <p className="text-muted-foreground text-xs font-mono mt-1">{sseState.errorMessage ?? "something went wrong. please try again."}</p>
            </div>
            <button onClick={handleReset}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all touch-manipulation">
              <RotateCcw className="h-4 w-4" /> try again
            </button>
          </div>
        )}

        {/* ══ COMPLETE ═══════════════════════════════════════════════════════ */}
        {isComplete && report && (
          <div className="space-y-4">

            {/* Score hero — tablet: side by side with stats */}
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-4">
                {/* Gauge — bigger on tablet */}
                <ScoreGauge score={report.overallScore ?? 0} size={72} />

                <div className="flex-1 min-w-0 space-y-2.5">
                  {/* URL row */}
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/50">
                    <Globe className="h-3 w-3 shrink-0" />
                    <span className="truncate flex-1">{report.targetUrl.replace(/^https?:\/\//, "")}</span>
                    <a href={report.targetUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 hover:text-foreground transition-colors">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {/* Stats grid — 2-col on tablet */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    {[
                      { val: report.passed,     label: "passed",  cls: "text-[#00FF85]" },
                      { val: report.failed,     label: "failed",  cls: "text-red-500"   },
                      { val: report.skipped,    label: "skipped", cls: "text-muted-foreground/60" },
                      { val: report.totalTests, label: "total",   cls: "text-foreground" },
                    ].map(({ val, label, cls }) => (
                      <div key={label} className="rounded-lg bg-muted/50 border border-border px-2 py-1.5">
                        <p className={`text-sm font-mono font-bold tabular-nums ${cls}`}>{val ?? 0}</p>
                        <p className="text-[9px] font-mono text-muted-foreground/50 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Progress bar */}
                  <div className="flex gap-px h-1.5 rounded-full overflow-hidden bg-border">
                    <div className="bg-[#00FF85] rounded-l-full" style={{ width: `${((report.passed ?? 0) / (report.totalTests ?? 1)) * 100}%` }} />
                    <div className="bg-red-500" style={{ width: `${((report.failed ?? 0) / (report.totalTests ?? 1)) * 100}%` }} />
                  </div>
                  <p className="text-[9px] font-mono text-muted-foreground/30 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />{report.crawlSummary.totalPages} pages crawled · {Math.round(report.crawlSummary.crawlTimeMs / 1000)}s
                  </p>
                </div>
              </div>
            </div>

            {/* Category donuts — grid on tablet, scroll on mobile */}
            {Object.keys(report.resultsByCategory).length > 0 && (
              <div>
                <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Categories</p>
                {/* Mobile: horizontal scroll. Tablet+: wrap grid */}
                <div className="flex gap-2 overflow-x-auto sm:overflow-x-visible sm:flex-wrap pb-1" role="group">
                  {Object.entries(report.resultsByCategory).map(([cat, data]) => (
                    <div key={cat} className="shrink-0 sm:shrink">
                      <CategoryDonut category={cat} passed={data.passed} total={data.total}
                        active={filterCategory === cat} onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI summary */}
            {report.aiSummary && (
              <details className="rounded-xl border border-border overflow-hidden group">
                <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors list-none touch-manipulation">
                  <Sparkles className="h-4 w-4 text-[#00FF85] shrink-0" />
                  <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest flex-1">AI Summary</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 pt-2 border-t border-border">
                  <p className="text-sm font-mono text-muted-foreground leading-relaxed">{report.aiSummary}</p>
                </div>
              </details>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border" role="tablist">
              {([
                { key: "tests",       label: "tests", count: report.testCases?.length ?? 0,        icon: FlaskConical },
                { key: "bugs",        label: "bugs",  count: report.bugs?.length ?? 0,              icon: Bug         },
                { key: "performance", label: "perf",  count: report.performanceGauges?.length ?? 0, icon: Activity    },
                { key: "trend",       label: "trend", count: report.trendData?.length ?? 0,         icon: TrendingUp  },
              ] as const).map(({ key, label, count, icon: Icon }) => (
                <button key={key} role="tab" aria-selected={activeTab === key}
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs font-mono uppercase tracking-widest border-b-2 transition-colors -mb-px shrink-0 touch-manipulation ${
                    activeTab === key ? "border-[#00FF85] text-[#00FF85]" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] ${activeTab === key ? "bg-[#00FF85]/15 text-[#00FF85]" : "bg-muted text-muted-foreground/50"}`}>{count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tests tab ──────────────────────────────────────────────── */}
            {activeTab === "tests" && (
              <div className="space-y-3">
                {/* Filter chips */}
                <div className="flex items-center gap-1.5 flex-wrap" role="group">
                  {(["all","passed","failed","flaky"] as const).map((f) => (
                    <button key={f} onClick={() => setTcFilter(f)} aria-pressed={tcFilter === f}
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-md capitalize transition-all touch-manipulation border ${
                        tcFilter === f ? "bg-muted text-foreground border-border" : "text-muted-foreground hover:text-foreground border-border/50"
                      }`}>
                      {f}
                      {f !== "all" && (
                        <span className="ml-1 text-muted-foreground/40">
                          ({(report.testCases ?? []).filter((tc) => {
                            const ls = sseState.testUpdates[tc.id]?.status;
                            return (ls ?? tc.results?.[0]?.status ?? "skipped") === f;
                          }).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {/* tablet: 2-col grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list">
                  {filteredTestCases.length === 0
                    ? (
                      <div className="sm:col-span-2 rounded-xl border border-border p-6 text-center">
                        <FlaskConical className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs font-mono text-muted-foreground">no test cases match this filter</p>
                      </div>
                    )
                    : filteredTestCases.map((tc) => (
                      <div key={tc.id} role="listitem">
                        <TestCaseCard tc={tc} liveStatus={sseState.testUpdates[tc.id]} />
                      </div>
                    ))
                  }
                </div>
              </div>
            )}

            {/* ── Bugs tab ───────────────────────────────────────────────── */}
            {activeTab === "bugs" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest flex items-center gap-1.5">
                    <Bug className="h-3.5 w-3.5 text-red-500" />{filteredBugs.length} bug{filteredBugs.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-1 flex-wrap" role="group">
                    {["all","critical","high","medium","low"].map((sev) => (
                      <button key={sev} onClick={() => setFilterSeverity(sev)} aria-pressed={filterSeverity === sev}
                        className={`text-[10px] font-mono px-2 py-1 rounded-md capitalize transition-all touch-manipulation border ${
                          filterSeverity === sev ? "bg-muted text-foreground border-border" : "text-muted-foreground hover:text-foreground border-border/50"
                        }`}>{sev}</button>
                    ))}
                  </div>
                </div>
                {filteredBugs.length === 0
                  ? (
                    <div className="rounded-xl border border-border p-6 text-center">
                      <CheckCircle2 className="h-7 w-7 text-[#00FF85] mx-auto mb-2" />
                      <p className="text-xs font-mono text-muted-foreground">no bugs found for this filter</p>
                    </div>
                  )
                  : (
                    /* tablet: 2-col for bug cards */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list">
                      {filteredBugs.map((bug) => (
                        <div key={bug.id} role="listitem">
                          <BugCard bug={bug} onClick={() => setSelectedBug(bug)} />
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}

            {/* ── Performance tab ────────────────────────────────────────── */}
            {activeTab === "performance" && (
              <div className="space-y-4">
                {(!report.performanceGauges || report.performanceGauges.length === 0)
                  ? (
                    <div className="rounded-xl border border-border p-6 text-center">
                      <Activity className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs font-mono text-muted-foreground">no performance data available</p>
                    </div>
                  )
                  : (
                    /* tablet: 2-col grid for perf cards */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {report.performanceGauges.map((pg: PerformanceGauge) => (
                        <div key={pg.pageUrl} className="rounded-xl border border-border p-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                            <p className="text-[10px] font-mono text-muted-foreground truncate">{pg.pageUrl}</p>
                          </div>
                          <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Core Web Vitals</p>
                          <div className="space-y-2 mb-3">
                            <PerfGaugeRow label="LCP"  value={pg.lcpMs}  unit="ms" status={pg.lcpStatus}  />
                            <PerfGaugeRow label="CLS"  value={pg.cls}    unit=""   status={pg.clsStatus}  />
                            <PerfGaugeRow label="TTFB" value={pg.ttfbMs} unit="ms" status={pg.ttfbStatus} />
                          </div>
                          <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Load Timing</p>
                          <div className="space-y-2">
                            <PerfGaugeRow label="DCL"  value={pg.domContentLoadedMs} unit="ms" status={pg.domContentLoadedStatus ?? "unknown"} />
                            <PerfGaugeRow label="Load" value={pg.loadEventMs}         unit="ms" status={pg.loadEventStatus ?? "unknown"} />
                          </div>
                          <div className="flex gap-3 mt-3 pt-3 border-t border-border flex-wrap">
                            {[{l:"good",c:"bg-[#00FF85]"},{l:"needs improvement",c:"bg-yellow-500"},{l:"poor",c:"bg-red-500"},{l:"unknown",c:"bg-muted"}].map(({l,c}) => (
                              <div key={l} className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground/40"><div className={`h-1.5 w-1.5 rounded-full ${c}`} />{l}</div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}

            {/* ── Trend tab ──────────────────────────────────────────────── */}
            {activeTab === "trend" && (
              <div className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-muted-foreground/40" />
                  <h3 className="text-xs font-mono font-medium text-foreground">score over time</h3>
                </div>
                <TrendSparkline data={report.trendData ?? []} />
                {report.trendData && report.trendData.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                    {report.trendData.map((pt: TrendDataPoint) => (
                      <div key={pt.runId} className={`flex items-center gap-3 text-[10px] font-mono ${pt.isCurrent ? "text-foreground" : "text-muted-foreground/40"}`}>
                        <span className="w-20 shrink-0">{new Date(pt.date).toLocaleDateString()}</span>
                        <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                          <div className={`h-full rounded-full ${(pt.score ?? 0) >= 90 ? "bg-[#00FF85]" : (pt.score ?? 0) >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pt.score ?? 0}%` }} />
                        </div>
                        <span className={`w-8 text-right font-bold ${(pt.score ?? 0) >= 90 ? "bg-[#00FF85]" : (pt.score ?? 0) >= 70 ? "text-yellow-500" : "text-red-500"}`}>{pt.score}</span>
                        {pt.isCurrent && <span className="text-muted-foreground/30">(now)</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer actions */}
            <div className="flex gap-2 flex-wrap pb-6 pt-1" role="group">
              <button disabled={isExportingPdf}
                onClick={() => { if (!testRunId) return; exportPdf(testRunId, { onSuccess: () => toast.success("PDF downloaded"), onError: (e) => toast.error(e.message ?? "Failed") }); }}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted disabled:opacity-40 transition-all touch-manipulation">
                {isExportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {isExportingPdf ? "generating…" : "PDF"}
              </button>
              <button onClick={() => { const b = new Blob([JSON.stringify(report,null,2)],{type:"application/json"}); const a = document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`testfish-${Date.now()}.json`; a.click(); toast.success("JSON downloaded"); }}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all touch-manipulation">
                <FileText className="h-3.5 w-3.5" /> JSON
              </button>
              {report.shareableSlug && (
                <button onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/report/${report.shareableSlug}`); setCopied(true); toast.success("Link copied!"); setTimeout(()=>setCopied(false),2000); }}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all touch-manipulation">
                  {copied ? <Check className="h-3.5 w-3.5 text-[#00FF85]" /> : <Share2 className="h-3.5 w-3.5" />}
                  {copied ? "copied!" : "share"}
                </button>
              )}
              {report.embedBadgeToken && (
                <button onClick={() => { void navigator.clipboard.writeText(`[![TestFish](${window.location.origin}/api/badge/${report.embedBadgeToken}/svg)](${window.location.origin}/report/${report.shareableSlug})`); toast.success("Badge copied!"); }}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all touch-manipulation">
                  <Code2 className="h-3.5 w-3.5" /> badge
                </button>
              )}
              <button onClick={handleReset}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-muted-foreground/40 text-xs font-mono hover:text-muted-foreground transition-all ml-auto touch-manipulation">
                <RotateCcw className="h-3.5 w-3.5" /> new test
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}