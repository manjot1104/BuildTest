"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useUserCredits } from "@/hooks/use-user-credits";
import {
  Globe, Play, Loader2, CheckCircle2, XCircle, KeyRound,
  RotateCcw, ExternalLink, Zap, Bug, Sparkles,
  Clock, BarChart3, FlaskConical, Share2, Download,
  Check, TrendingUp, Activity, History,
  Code2, Settings2, FileText, Plus,
  ChevronDown, ChevronUp, Info, AlertCircle,
  Lock, Gauge, Timer,
} from "lucide-react";
import { toast } from "sonner";
import {
  useStartTestRun, useRunFromCases, useTestRunStatus, useTestReport,
  useTestRunSSE, useCancelTestRun, useExportReportPdf,
  useTestUsage,
  type Bug as BugType, type PerformanceGauge, type TrendDataPoint,
} from "@/client-api/query-hooks/use-testing-hooks";

import {
  BudgetStepper, TimeoutStepper, CrawlProgressPanel,
  ScoreGauge, CategoryDonut, PerfGaugeRow, TrendSparkline,
  LiveTestCaseCard, TestCaseCard, ReviewPhase,
  BugDetailModal, BugCard,
  PipelineStepsRow, ExecutionCounters, StopButton,
  fmtMs, SEVERITY_CONFIG, TIMEOUT_MIN_MS, TIMEOUT_MAX_MS,
} from "@/components/testing/testing-components";
import { HistoryPanel } from "@/components/testing/history-panel";
import type { SelectedCase } from "@/components/testing/history-panel";
import {
  GithubSourcePanel,
  type GithubSourceValue,
} from "@/components/testing/github-source-panel";
import { SubscriptionModal } from "@/components/payments/subscription-modal";

// ─── Constants ─────────────────────────────────────────────────────────────────

const PIPELINE_ORDER: Record<string, number> = {
  crawling: 0, generating: 1, awaiting_review: 2, executing: 3, reporting: 4, complete: 5,
};

const ABSOLUTE_MAX_PAGES = 20;
const ABSOLUTE_MAX_TESTS = 30;

interface PlanLimits { maxPages: number; maxTests: number; maxConcurrency: number; label: string }
const FREE_LIMITS: PlanLimits = { maxPages: 3, maxTests: 5, maxConcurrency: 3, label: "Free" };
const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter:    { maxPages:  5, maxTests: 10, maxConcurrency:  5, label: "Starter"   },
  pro:        { maxPages: 10, maxTests: 20, maxConcurrency: 10, label: "Pro"        },
  enterprise: { maxPages: 20, maxTests: 30, maxConcurrency: 20, label: "Enterprise" },
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

// ─── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[220px] px-2.5 py-1.5 rounded-lg bg-popover border border-border text-[10px] font-mono text-popover-foreground shadow-lg pointer-events-none text-center leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
        </span>
      )}
    </span>
  );
}

// ─── Upgrade Nudge ─────────────────────────────────────────────────────────────

function UpgradeNudge({ feature, planNeeded, onUpgrade }: { feature: string; planNeeded: string; onUpgrade: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
      <Lock className="h-3 w-3 text-primary shrink-0" />
      <p className="text-[10px] font-mono text-muted-foreground flex-1">
        {feature} limit reached on your plan
      </p>
      <button
        type="button"
        className="text-[10px] font-mono text-primary hover:text-primary/80 font-semibold underline underline-offset-2 shrink-0 transition-colors"
        onClick={(e) => { e.stopPropagation(); onUpgrade(); }}
      >
        {planNeeded} ↗
      </button>
    </div>
  );
}

// ─── Button primitives ─────────────────────────────────────────────────────────

function BfyPrimaryBtn({ onClick, disabled, disabledReason, children, className = "" }: {
  onClick?: () => void; disabled?: boolean; disabledReason?: string;
  children: React.ReactNode; className?: string;
}) {
  const btn = (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-sans font-bold hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation shrink-0 ${className}`}
    >
      {children}
    </button>
  );
  if (disabled && disabledReason) {
    return <Tooltip text={disabledReason}>{btn}</Tooltip>;
  }
  return btn;
}

function BfyGhostBtn({ onClick, children, className = "" }: {
  onClick?: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all touch-manipulation ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Usage Pill ────────────────────────────────────────────────────────────────

function UsagePill({ runsToday, dailyLimit, planId, onUpgrade }: {
  runsToday: number; dailyLimit: number; planId: string; onUpgrade: () => void;
}) {
  const remaining   = dailyLimit - runsToday;
  const pct         = runsToday / dailyLimit;
  const isAtLimit   = runsToday >= dailyLimit;
  const isNearLimit = pct >= 0.8 && !isAtLimit;

  const barColor    = isAtLimit ? "bg-red-500" : isNearLimit ? "bg-yellow-500" : "bg-primary";
  const textColor   = isAtLimit ? "text-red-400" : isNearLimit ? "text-yellow-400" : "text-muted-foreground/60";
  const borderColor = isAtLimit ? "border-red-500/25" : isNearLimit ? "border-yellow-500/20" : "border-border";

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border ${borderColor} bg-muted/30`}
      title={`${runsToday} of ${dailyLimit} daily runs used (${planId} plan). Resets at midnight UTC.`}
      role="meter" aria-valuenow={runsToday} aria-valuemin={0} aria-valuemax={dailyLimit}
    >
      <div className="w-14 h-1.5 rounded-full bg-border overflow-hidden shrink-0">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.min(100, pct * 100)}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono tabular-nums ${textColor}`}>
        {isAtLimit
          ? <span className="text-red-400 font-semibold">limit reached</span>
          : <>{remaining} run{remaining !== 1 ? "s" : ""} left today</>
        }
      </span>
      {(isAtLimit || isNearLimit) && planId === "free" && (
        <button
          type="button"
          className="text-[10px] font-mono text-primary hover:text-primary/80 font-semibold underline underline-offset-2 shrink-0 transition-colors"
          onClick={(e) => { e.stopPropagation(); onUpgrade(); }}
        >
          upgrade ↗
        </button>
      )}
    </div>
  );
}

// ─── Prefill Banner ────────────────────────────────────────────────────────────

function PrefillBanner({ repoFullName, onDismiss }: { repoFullName: string; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 6000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs font-mono text-muted-foreground animate-in fade-in-0 slide-in-from-top-1 duration-200">
      <FlaskConical className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="flex-1 min-w-0 truncate">
        Prefilled from your project · <span className="text-foreground font-medium">{repoFullName}</span>
      </span>
      <button onClick={onDismiss} className="ml-auto text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 text-sm">✕</button>
    </div>
  );
}

// ─── Advanced Settings Section ─────────────────────────────────────────────────

function AdvancedSettingsPanel({
  concurrency, setConcurrency,
  discoveryMs, setDiscoveryMs,
  extractionMs, setExtractionMs,
  executeMs, setExecuteMs,
  hasChanges, onReset,
  maxConcurrency, planLabel, onUpgrade,
}: {
  concurrency: number; setConcurrency: (n: number) => void;
  discoveryMs: number; setDiscoveryMs: (n: number) => void;
  extractionMs: number; setExtractionMs: (n: number) => void;
  executeMs: number; setExecuteMs: (n: number) => void;
  hasChanges: boolean; onReset: () => void;
  maxConcurrency: number; planLabel: string; onUpgrade: () => void;
}) {
  const [open, setOpen] = useState(false);

  const timeouts = [
    {
      label: "discovery", icon: Globe, value: discoveryMs, onChange: setDiscoveryMs,
      tooltip: "How long to spend discovering pages on the site. Increase for large sites.",
    },
    {
      label: "extraction", icon: FileText, value: extractionMs, onChange: setExtractionMs,
      tooltip: "How long to spend extracting page content. Increase for JS-heavy apps.",
    },
    {
      label: "execute", icon: Zap, value: executeMs, onChange: setExecuteMs,
      tooltip: "How long each individual test gets to run. Increase for slow interactions.",
    },
  ];

  const low = Math.ceil(maxConcurrency * 0.4);
  const mid = Math.ceil(maxConcurrency * 0.75);

  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors touch-manipulation group"
      >
        <div className="flex items-center gap-2.5">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${open ? "bg-muted" : "bg-muted/50 group-hover:bg-muted"}`}>
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              Advanced Settings
            </span>
            {!open && (
              <span className="text-[9px] font-mono text-muted-foreground/40">
                parallelism · timeouts
              </span>
            )}
          </div>
          {hasChanges && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
              <span className="h-1 w-1 rounded-full bg-primary" />
              modified
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReset(); }}
              className="text-[9px] font-mono text-muted-foreground/50 hover:text-muted-foreground px-2 py-1 rounded-md border border-border hover:bg-muted transition-all"
            >
              reset defaults
            </button>
          )}
          {open
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
          }
        </div>
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border">

          {/* Parallelism */}
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-widest">
                Parallelism
              </span>
              <Tooltip text="How many pages are extracted at the same time. Higher = faster but uses more credits simultaneously.">
                <Info className="h-3 w-3 text-muted-foreground/30 hover:text-muted-foreground cursor-help transition-colors" />
              </Tooltip>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">concurrent extractions</span>
                <Tooltip text={`Your ${planLabel} plan allows up to ${maxConcurrency} concurrent extractions.`}>
                  <span className="text-[10px] font-mono text-muted-foreground/50 bg-muted border border-border rounded px-1.5 py-0.5 cursor-help">
                    max {maxConcurrency}
                  </span>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button" aria-label="Decrease concurrency"
                  onClick={() => setConcurrency(Math.max(CONCURRENCY_MIN, concurrency - 1))}
                  disabled={concurrency <= CONCURRENCY_MIN}
                  className="h-9 w-9 shrink-0 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all touch-manipulation"
                >
                  <span className="text-base font-light">−</span>
                </button>
                <div className="flex-1 space-y-1.5">
                  <div className="h-9 rounded-lg border border-border bg-background flex items-center justify-center">
                    <span className="text-sm font-mono font-bold text-foreground tabular-nums">{concurrency}</span>
                  </div>
                  {/* Speed indicator bar */}
                  <div className="flex gap-0.5 h-1">
                    {Array.from({ length: CONCURRENCY_MAX }).map((_, i) => {
                      const isActive = i < concurrency;
                      const isLocked = i >= maxConcurrency;
                      const activeColor = concurrency <= low  ? "bg-primary/70"
                                        : concurrency <= mid  ? "bg-yellow-500/70"
                                        : "bg-orange-500/70";
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-full transition-colors duration-150 ${
                            isLocked  ? "bg-border/30"
                            : isActive ? activeColor
                            : "bg-border"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button" aria-label="Increase concurrency"
                  onClick={() => setConcurrency(Math.min(CONCURRENCY_MAX, concurrency + 1))}
                  disabled={concurrency >= CONCURRENCY_MAX}
                  className="h-9 w-9 shrink-0 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all touch-manipulation"
                >
                  <span className="text-base font-light">+</span>
                </button>
              </div>
              {concurrency > maxConcurrency ? (
                <UpgradeNudge feature="Concurrency" planNeeded="Upgrade plan" onUpgrade={onUpgrade} />
              ) : (
                <p className={`text-[10px] font-mono flex items-center gap-1.5 ${
                  concurrency <= low ? "text-primary/60"
                  : concurrency <= mid ? "text-yellow-500/60"
                  : "text-orange-500/60"
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    concurrency <= low ? "bg-primary/60"
                    : concurrency <= mid ? "bg-yellow-500/60"
                    : "bg-orange-500/60"
                  }`} />
                  {concurrency <= low
                    ? "lower parallelism · steady credit usage"
                    : concurrency <= mid
                    ? "moderate parallelism · balanced speed"
                    : "high parallelism · uses credits quickly"
                  }
                </p>
              )}
            </div>
          </div>

          {/* Timeouts */}
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Timer className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
              <span className="text-[10px] font-mono text-muted-foreground/70 uppercase tracking-widest">
                Timeouts
              </span>
              <Tooltip text="Maximum time allowed for each pipeline phase. Increase these for slow or JavaScript-heavy sites.">
                <Info className="h-3 w-3 text-muted-foreground/30 hover:text-muted-foreground cursor-help transition-colors" />
              </Tooltip>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {timeouts.map(({ label, icon: Icon, value, onChange, tooltip }) => (
                <div key={label} className="rounded-lg border border-border bg-background/50 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-3 w-3 text-muted-foreground/50" />
                      <span className="text-[10px] font-mono text-muted-foreground capitalize">{label}</span>
                    </div>
                    <Tooltip text={tooltip}>
                      <Info className="h-3 w-3 text-muted-foreground/25 hover:text-muted-foreground/60 cursor-help transition-colors" />
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button" aria-label={`Decrease ${label} timeout`}
                      onClick={() => onChange(Math.max(TIMEOUT_MIN_MS, value - 30_000))}
                      disabled={value <= TIMEOUT_MIN_MS}
                      className="h-7 w-7 shrink-0 rounded-md border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all touch-manipulation"
                    >
                      <span className="text-sm font-light">−</span>
                    </button>
                    <div className="flex-1 h-7 rounded-md border border-border bg-background flex items-center justify-center">
                      <span className="text-xs font-mono font-bold text-foreground tabular-nums">{fmtMs(value)}</span>
                    </div>
                    <button
                      type="button" aria-label={`Increase ${label} timeout`}
                      onClick={() => onChange(Math.min(TIMEOUT_MAX_MS, value + 30_000))}
                      disabled={value >= TIMEOUT_MAX_MS}
                      className="h-7 w-7 shrink-0 rounded-md border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all touch-manipulation"
                    >
                      <span className="text-sm font-light">+</span>
                    </button>
                  </div>
                  <div className="h-0.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary/50 rounded-full transition-all duration-300"
                      style={{ width: `${((value - TIMEOUT_MIN_MS) / (TIMEOUT_MAX_MS - TIMEOUT_MIN_MS)) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-muted-foreground/25">
                    <span>{fmtMs(TIMEOUT_MIN_MS)}</span>
                    <span>{fmtMs(TIMEOUT_MAX_MS)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
              <Info className="h-3 w-3 text-muted-foreground/40 shrink-0 mt-0.5" />
              <p className="text-[10px] font-mono text-muted-foreground/50 leading-relaxed">
                Increasing timeouts gives your site more time to load but extends overall test duration. Only raise these if tests are timing out on your site.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const CRAWL_CONTEXT_MAX = 500;

function CrawlContextInput({
  value, onChange, disabled,
}: {
  value: string; onChange: (v: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const remaining = CRAWL_CONTEXT_MAX - value.length;
  const hasValue = value.trim().length > 0;

  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors touch-manipulation group"
      >
        <div className="flex items-center gap-2.5">
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${open ? "bg-muted" : "bg-muted/50 group-hover:bg-muted"}`}>
            <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
              Auth / Crawl Context
            </span>
            {!open && (
              <span className="text-[9px] font-mono text-muted-foreground/40">
                {hasValue ? "hint provided · click to edit" : "optional · help crawler past login screens"}
              </span>
            )}
          </div>
          {hasValue && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
              <span className="h-1 w-1 rounded-full bg-primary" />
              hint set
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasValue && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="text-[9px] font-mono text-muted-foreground/50 hover:text-muted-foreground px-2 py-1 rounded-md border border-border hover:bg-muted transition-all"
            >
              clear
            </button>
          )}
          {open
            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground/40" />
            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
          }
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 space-y-3">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15">
            <Info className="h-3 w-3 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-primary/70 leading-relaxed">
                Provide credentials or navigation instructions so the crawler can access
                pages behind login walls or interaction barriers.
              </p>
              <div className="space-y-0.5">
                {[
                  `Login with email: test@example.com and password: demo1234`,
                  `Click "Enter as guest" to skip the login screen`,
                  `Accept the cookie banner first, then navigate normally`,
                ].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => onChange(ex)}
                    className="block text-left text-[9px] font-mono text-muted-foreground/50 hover:text-primary/70 transition-colors truncate max-w-full"
                  >
                    ↳ {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value.slice(0, CRAWL_CONTEXT_MAX))}
              disabled={disabled}
              placeholder="e.g. Login with email: user@example.com and password: demo1234"
              rows={3}
              aria-label="Crawl context hint"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors resize-none disabled:opacity-40"
            />
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-mono text-muted-foreground/30 leading-relaxed">
                This hint is sent to the AI crawler — do not include sensitive production credentials.
              </p>
              <span className={`text-[9px] font-mono tabular-nums shrink-0 ${remaining < 50 ? "text-yellow-500" : "text-muted-foreground/30"}`}>
                {remaining}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TestingPage() {
  const searchParams = useSearchParams();
  const { subscription, hasActiveSubscription, credits, isLoading: isCreditsLoading } = useUserCredits();
  const planLimits = useMemo(() => getPlanLimits(subscription?.plan_id), [subscription?.plan_id]);

  const { data: usageData } = useTestUsage();
  const isAtDailyLimit = usageData ? usageData.runsToday >= usageData.dailyLimit : false;

  const prefillUrl    = searchParams.get("url")    ?? "";
  const prefillOwner  = searchParams.get("owner")  ?? "";
  const prefillRepo   = searchParams.get("repo")   ?? "";
  const prefillBranch = searchParams.get("branch") ?? "";
  const hasPrefill    = !!(prefillUrl || prefillOwner || prefillRepo);

  const [url, setUrl]             = useState(prefillUrl);
  const [maxPages, setMaxPages]   = useState(5);
  const [maxTests, setMaxTests]   = useState(10);
  const [concurrency, setConcurrency]   = useState(CONCURRENCY_DEFAULT);
  const [discoveryMs, setDiscoveryMs]   = useState(DEFAULT_DISCOVERY_MS);
  const [extractionMs, setExtractionMs] = useState(DEFAULT_EXTRACTION_MS);
  const [executeMs, setExecuteMs]       = useState(DEFAULT_EXECUTE_MS);
  const [githubSource, setGithubSource] = useState<GithubSourceValue | null>(null);
  const [crawlContext, setCrawlContext] = useState("");
  const [showPrefillBanner, setShowPrefillBanner] = useState(hasPrefill);

  const [showPagesUpgradeNudge, setShowPagesUpgradeNudge] = useState(false);
  const [showTestsUpgradeNudge, setShowTestsUpgradeNudge] = useState(false);

  const prefillRepoFullName = prefillOwner && prefillRepo ? `${prefillOwner}/${prefillRepo}` : prefillRepo || prefillOwner;
  const githubInitial: GithubSourceValue | null = (prefillOwner && prefillRepo)
    ? { owner: prefillOwner, repo: prefillRepo, branch: prefillBranch || "main" }
    : null;

  useEffect(() => {
    setMaxPages((p) => Math.min(p, planLimits.maxPages));
    setMaxTests((t) => Math.min(Math.max(t, 1), planLimits.maxTests));
    setConcurrency((c) => Math.min(c, planLimits.maxConcurrency));
    setShowPagesUpgradeNudge(false);
    setShowTestsUpgradeNudge(false);
  }, [planLimits]);

  const [testRunId, setTestRunId]           = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [tcFilter, setTcFilter]             = useState<"all" | "passed" | "failed" | "flaky">("all");
  const [activeTab, setActiveTab]           = useState<"tests" | "bugs" | "performance" | "trend">("tests");
  const [selectedBug, setSelectedBug]       = useState<BugType | null>(null);
  const [showHistory, setShowHistory]       = useState(false);
  const [copied, setCopied]                 = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { mutate: startTest, isPending: isStarting } = useStartTestRun();
  const { mutate: runFromCases, isPending: isRunningFromCases } = useRunFromCases();
  const { mutate: cancelTest, isPending: isCancelling } = useCancelTestRun();
  const { mutate: exportPdf, isPending: isExportingPdf } = useExportReportPdf();
  const { data: run } = useTestRunStatus(testRunId);

  const initialStatusForSSE =
    run?.status && ["complete", "failed", "cancelled"].includes(run.status) ? run.status
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

  const hasAdvancedChanges =
    concurrency !== CONCURRENCY_DEFAULT ||
    discoveryMs !== DEFAULT_DISCOVERY_MS ||
    extractionMs !== DEFAULT_EXTRACTION_MS ||
    executeMs !== DEFAULT_EXECUTE_MS;

  const handleMaxPagesChange = (n: number) => {
    if (n > planLimits.maxPages) {
      setShowPagesUpgradeNudge(true);
      return;
    }
    setShowPagesUpgradeNudge(false);
    const p = Math.max(1, n);
    setMaxPages(p);
    if (p > maxTests) setMaxTests(p);
  };

  const runDisabledReason = isStarting
    ? "Starting test run…"
    : !url.trim()
    ? "Enter a URL above to get started"
    : isAtDailyLimit
    ? `Daily limit reached. Upgrade to run more tests today.`
    : undefined;

  const handleStart = () => {
    if (!url.trim()) { toast.error("Please enter a URL to test"); return; }
    if (isAtDailyLimit) {
      toast.error(`Daily limit reached. Your ${usageData?.planId ?? "free"} plan allows ${usageData?.dailyLimit ?? 0} runs/day.`);
      return;
    }
    const effectiveConcurrency = Math.min(concurrency, planLimits.maxConcurrency);
    const timeouts: Record<string, number> = {};
    if (discoveryMs  !== DEFAULT_DISCOVERY_MS)  timeouts.discoveryMs       = discoveryMs;
    if (extractionMs !== DEFAULT_EXTRACTION_MS) timeouts.extractionMs      = extractionMs;
    if (executeMs    !== DEFAULT_EXECUTE_MS)    timeouts.executeTestBaseMs = executeMs;
    startTest(
      {
        url: url.trim(), maxPages, maxTests,
        ...(effectiveConcurrency !== CONCURRENCY_DEFAULT && { concurrency: effectiveConcurrency }),
        ...(Object.keys(timeouts).length > 0 && { timeouts }),
        ...(githubSource && { githubOwner: githubSource.owner, githubRepo: githubSource.repo, githubBranch: githubSource.branch }),
        ...(crawlContext.trim() && { crawlContext: crawlContext.trim() }),
      },
      {
        onSuccess: (d) => { setTestRunId(d.testRunId); setActiveTab("tests"); toast.success("Test run started!"); },
        onError: (e) => toast.error(e.message ?? "Failed to start test run"),
      }
    );
  };

  const handleCancel = () => {
    if (!testRunId) return;
    cancelTest(testRunId, {
      onSuccess: (d) => { if (d.cancelled) toast.info("Test run cancelled."); },
      onError: (e) => toast.error(e.message ?? "Failed"),
    });
  };

  const handleRunFromCases = ({ targetUrl, cases }: { targetUrl: string; cases: SelectedCase[] }) => {
    runFromCases(
      { targetUrl, cases },
      {
        onSuccess: (d) => {
          setUrl(targetUrl);
          setTestRunId(d.testRunId);
          setActiveTab("tests");
          toast.success("Test run started from previous cases!");
        },
        onError: (e) => toast.error(e.message ?? "Failed to start run"),
      }
    );
  };

  const handleReset = () => {
    setUrl(""); setTestRunId(null); setGithubSource(null); setCrawlContext("");
    setFilterSeverity("all"); setFilterCategory("all");
    setTcFilter("all"); setActiveTab("tests"); setSelectedBug(null);
    setShowPagesUpgradeNudge(false); setShowTestsUpgradeNudge(false);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative -m-4 w-[calc(100%+2rem)] min-h-screen bg-sidebar">
      {selectedBug && <BugDetailModal bug={selectedBug} onClose={() => setSelectedBug(null)} />}
      {showHistory  && (
        <HistoryPanel
          onSelect={(id: string, status: string) => { setTestRunId(id); setActiveTab("tests"); }}
          onClose={() => setShowHistory(false)}
          maxTests={planLimits.maxTests}
          onRunCases={handleRunFromCases}
          onUpgrade={() => setShowUpgradeModal(true)}
        />
      )}
      <SubscriptionModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        hasActiveSubscription={hasActiveSubscription}
        currentCredits={credits?.totalCredits ?? 0}
        currentPlanId={subscription?.plan_id ?? null}
      />

      <main className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {/* Brand icon uses primary blue */}
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Bug className="h-3.5 w-3.5 text-primary" />
            </div>
            {/* Brand name uses AR One Sans via font-sans */}
            <span className="text-sm font-sans font-semibold text-foreground">TestFish</span>
            <span className="text-[10px] font-mono text-muted-foreground/60 border border-border rounded-full px-1.5 py-0.5 shrink-0">BETA</span>
            {testRunId && (run?.targetUrl || url) && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-muted-foreground/40 truncate max-w-[180px]">
                <span className="text-border shrink-0">·</span>
                <span className="truncate">{(url || (run?.targetUrl ?? "")).replace(/^https?:\/\//, "")}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <BfyGhostBtn onClick={() => setShowHistory(true)}>
              <History className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">History</span>
            </BfyGhostBtn>
            {!!testRunId && (
              <BfyGhostBtn onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Test</span>
              </BfyGhostBtn>
            )}
          </div>
        </div>

        {/* ══ IDLE ══════════════════════════════════════════════════════════════ */}
        {!testRunId && (
          <div className="space-y-3">

            {showPrefillBanner && prefillRepoFullName && (
              <PrefillBanner repoFullName={prefillRepoFullName} onDismiss={() => setShowPrefillBanner(false)} />
            )}

            {/* Hero */}
            <div className="text-center space-y-2.5 py-4">
              {/* Pill badge uses primary blue — matching Buildify's style */}
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                <Zap className="h-3 w-3" /> ai-powered · 6 test categories
              </div>
              {/* Heading uses AR One Sans via font-sans */}
              <h1 className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-foreground">
                Test any site. <span className="text-muted-foreground/35">Automatically.</span>
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Paste a URL · AI crawls your site · Get a full bug report in minutes
              </p>
            </div>

            {/* ── URL + Run row ── */}
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                <input
                  type="url"
                  placeholder="https://your-app.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                  aria-label="Website URL to test"
                  className="w-full h-11 pl-9 pr-3 rounded-lg border border-input bg-card text-sm font-mono text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>
              <BfyPrimaryBtn
                onClick={handleStart}
                disabled={isStarting || !url.trim() || isAtDailyLimit}
                disabledReason={runDisabledReason}
                className="h-11 px-5"
              >
                {isStarting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="hidden sm:inline">Starting…</span></>
                  : <><Play className="h-4 w-4" /><span className="hidden sm:inline">Run Tests</span><span className="sm:hidden">Run</span></>
                }
              </BfyPrimaryBtn>
            </div>

            {/* Usage pill */}
            {usageData && (
              <div className="flex items-center justify-end">
                <UsagePill runsToday={usageData.runsToday} dailyLimit={usageData.dailyLimit} planId={usageData.planId} onUpgrade={() => setShowUpgradeModal(true)} />
              </div>
            )}

            {/* ── Source Code Analysis ── */}
            <GithubSourcePanel onChange={setGithubSource} disabled={isStarting} initialValue={githubInitial} />

            {/* ── Test Budget ── */}
            <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Test Budget</span>
                  <Tooltip text="Controls how much of your site gets crawled and how many test cases are generated. More = more thorough but takes longer.">
                    <Info className="h-3 w-3 text-muted-foreground/25 hover:text-muted-foreground/60 cursor-help transition-colors" />
                  </Tooltip>
                </div>
                {!hasActiveSubscription && (
                  <button
                    type="button"
                    onClick={() => setShowUpgradeModal(true)}
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground/40 hover:text-primary border border-border hover:border-primary/30 rounded-full px-2 py-0.5 transition-all"
                  >
                    <Lock className="h-2.5 w-2.5" /> free plan
                  </button>
                )}
              </div>
              <div className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Pages */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-xs font-mono text-muted-foreground">pages to crawl</span>
                      </div>
                      <Tooltip text={`Your ${planLimits.label} plan allows up to ${planLimits.maxPages} pages per run.`}>
                        <span className="text-[10px] font-mono text-muted-foreground/50 bg-muted border border-border rounded px-1.5 py-0.5 cursor-help">
                          max {planLimits.maxPages}
                        </span>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button"
                        onClick={() => { setShowPagesUpgradeNudge(false); handleMaxPagesChange(maxPages - 1); }}
                        disabled={maxPages <= 1}
                        className="h-9 w-9 shrink-0 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all touch-manipulation">
                        <span className="text-base font-light">−</span>
                      </button>
                      <div className="flex-1 h-9 rounded-lg border border-border bg-background flex items-center justify-center">
                        <span className="text-sm font-mono font-bold text-foreground tabular-nums">{maxPages}</span>
                      </div>
                      <button type="button"
                        onClick={() => handleMaxPagesChange(maxPages + 1)}
                        disabled={maxPages >= ABSOLUTE_MAX_PAGES}
                        className="h-9 w-9 shrink-0 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all touch-manipulation">
                        <span className="text-base font-light">+</span>
                      </button>
                    </div>
                    {showPagesUpgradeNudge && (
                      <UpgradeNudge feature="Pages" planNeeded="Upgrade plan" onUpgrade={() => setShowUpgradeModal(true)} />
                    )}
                  </div>

                  <div className="hidden sm:flex items-center">
                    <div className="w-px h-12 bg-border" />
                  </div>
                  <div className="sm:hidden h-px bg-border" />

                  {/* Tests */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <FlaskConical className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-xs font-mono text-muted-foreground">tests to generate</span>
                      </div>
                      <Tooltip text={`Your ${planLimits.label} plan allows up to ${planLimits.maxTests} test cases per run.`}>
                        <span className="text-[10px] font-mono text-muted-foreground/50 bg-muted border border-border rounded px-1.5 py-0.5 cursor-help">
                          max {planLimits.maxTests}
                        </span>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button"
                        onClick={() => { setShowTestsUpgradeNudge(false); setMaxTests(Math.max(maxPages, maxTests - 1)); }}
                        disabled={maxTests <= maxPages}
                        className="h-9 w-9 shrink-0 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all touch-manipulation">
                        <span className="text-base font-light">−</span>
                      </button>
                      <div className="flex-1 h-9 rounded-lg border border-border bg-background flex items-center justify-center">
                        <span className="text-sm font-mono font-bold text-foreground tabular-nums">{maxTests}</span>
                      </div>
                      <button type="button"
                        onClick={() => {
                          if (maxTests + 1 > planLimits.maxTests) {
                            setShowTestsUpgradeNudge(true);
                            return;
                          }
                          setShowTestsUpgradeNudge(false);
                          setMaxTests(maxTests + 1);
                        }}
                        disabled={maxTests >= ABSOLUTE_MAX_TESTS}
                        className="h-9 w-9 shrink-0 rounded-lg border border-border bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed transition-all touch-manipulation">
                        <span className="text-base font-light">+</span>
                      </button>
                    </div>
                    {showTestsUpgradeNudge && (
                      <UpgradeNudge feature="Tests" planNeeded="Upgrade plan" onUpgrade={() => setShowUpgradeModal(true)} />
                    )}
                  </div>
                </div>

                {/* Relationship hint */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono text-primary/70 tabular-nums">{maxPages}p</span>
                    <span className="text-muted-foreground/30 text-[10px]">→</span>
                    <span className="text-[10px] font-mono text-primary tabular-nums">{maxTests}t</span>
                  </div>
                  <div className="flex-1 h-0.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-primary/40 rounded-full transition-all duration-300"
                      style={{ width: `${(maxTests / planLimits.maxTests) * 100}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-muted-foreground/40 shrink-0">
                    tests ≥ pages · more = deeper
                  </span>
                </div>
              </div>
            </div>

            {/* ── Crawl Context ── */}
            <CrawlContextInput value={crawlContext} onChange={setCrawlContext} disabled={isStarting} />

            {/* ── Advanced Settings ── */}
            <AdvancedSettingsPanel
              concurrency={concurrency} setConcurrency={setConcurrency}
              discoveryMs={discoveryMs} setDiscoveryMs={setDiscoveryMs}
              extractionMs={extractionMs} setExtractionMs={setExtractionMs}
              executeMs={executeMs} setExecuteMs={setExecuteMs}
              hasChanges={hasAdvancedChanges}
              maxConcurrency={planLimits.maxConcurrency}
              planLabel={planLimits.label}
              onUpgrade={() => setShowUpgradeModal(true)}
              onReset={() => {
                setConcurrency(Math.min(CONCURRENCY_DEFAULT, planLimits.maxConcurrency));
                setDiscoveryMs(DEFAULT_DISCOVERY_MS);
                setExtractionMs(DEFAULT_EXTRACTION_MS);
                setExecuteMs(DEFAULT_EXECUTE_MS);
              }}
            />

            {/* Categories footer */}
            <div className="flex items-center justify-center gap-3 py-1">
              {["navigation", "forms", "visual", "performance", "a11y", "security"].map((cat) => (
                <span key={cat} className="text-[9px] font-mono text-muted-foreground/25 capitalize">{cat}</span>
              ))}
            </div>
          </div>
        )}

        {/* ══ REVIEW ════════════════════════════════════════════════════════════ */}
        {isAwaitingReview && testRunId && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <PipelineStepsRow pipelineStatus="awaiting_review" percent={40} />
            </div>
            <ReviewPhase testRunId={testRunId} targetUrl={url || (run?.targetUrl ?? "")} onCancel={handleReset} />
          </div>
        )}

        {/* ══ RUNNING ═══════════════════════════════════════════════════════════ */}
        {isRunning && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
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

            {isExecutingPhase && (
              <ExecutionCounters passed={counter.passed} failed={counter.failed} running={counter.running} skipped={counter.skipped} total={counter.total} />
            )}

            {isCrawlingPhase && (
              <CrawlProgressPanel
                stage={sseState.crawlStage} stageDescription={sseState.crawlStageDescription}
                foundUrls={sseState.crawlFoundUrls} extractedPages={sseState.crawlExtractedPages} failedPages={sseState.crawlFailedPages}
              />
            )}

            {pipelineStatus === "generating" && (
              <div className="rounded-xl border border-border bg-muted/20 p-4 flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary shrink-0 animate-pulse" />
                <p className="text-xs font-mono text-muted-foreground">ai is generating test cases from crawled pages…</p>
              </div>
            )}

            {isExecutingPhase && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest flex items-center gap-1.5">
                    <FlaskConical className="h-3 w-3" />
                    {liveTestCases.length > 0 ? `${liveTestCases.length} test cases` : "executing…"}
                  </p>
                  {liveTestCases.length > 0 && (
                    <div className="flex gap-3 text-[10px] font-mono">
                      <span className="text-primary">{liveTestCases.filter(t => t.status === "passed").length}✓</span>
                      <span className="text-red-500">{liveTestCases.filter(t => t.status === "failed").length}✗</span>
                      <span className="text-secondary">{liveTestCases.filter(t => t.status === "running").length}⟳</span>
                    </div>
                  )}
                </div>
                {liveTestCases.length === 0
                  ? (
                    <div className="rounded-xl border border-border bg-muted/20 p-5 flex items-center justify-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <p className="text-xs font-mono text-muted-foreground">executing tests in parallel…</p>
                    </div>
                  )
                  : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list">
                      {liveTestCases.map((tc) => (
                        <div key={tc.id} role="listitem"><LiveTestCaseCard tc={tc} /></div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}

            {sseState.liveBugs.length > 0 && (
              <div>
                <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Bug className="h-3 w-3 text-red-500" />
                  {sseState.liveBugs.length} issue{sseState.liveBugs.length !== 1 ? "s" : ""} found
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" role="list">
                  {sseState.liveBugs.map((bug) => (
                    <div key={bug.id} role="listitem" className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-red-500/15 bg-red-500/5">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${SEVERITY_CONFIG[bug.severity as keyof typeof SEVERITY_CONFIG]?.dot ?? "bg-muted-foreground"}`} />
                      <p className="text-xs font-mono text-foreground flex-1 truncate">{bug.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ CANCELLED ═════════════════════════════════════════════════════════ */}
        {isCancelled && (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <XCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-base font-sans font-semibold text-foreground">test run cancelled</h2>
              <p className="text-muted-foreground text-xs font-mono mt-1">you stopped this run.</p>
              {(counter.passed > 0 || counter.failed > 0) && (
                <p className="text-muted-foreground/40 text-[10px] font-mono mt-1.5">{counter.passed} passed · {counter.failed} failed before stopping</p>
              )}
            </div>
            <button onClick={handleReset} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all touch-manipulation">
              <RotateCcw className="h-4 w-4" /> run new test
            </button>
          </div>
        )}

        {/* ══ FAILED ════════════════════════════════════════════════════════════ */}
        {isFailed && (
          <div className="flex flex-col items-center gap-5 py-16 text-center" role="alert">
            <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-sans font-semibold text-foreground">test run failed</h2>
              <p className="text-muted-foreground text-xs font-mono mt-1">{sseState.errorMessage ?? "something went wrong. please try again."}</p>
            </div>
            <button onClick={handleReset} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all touch-manipulation">
              <RotateCcw className="h-4 w-4" /> try again
            </button>
          </div>
        )}

        {/* ══ COMPLETE ══════════════════════════════════════════════════════════ */}
        {isComplete && report && (
          <div className="space-y-4">

            {/* Score hero */}
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-4">
                <ScoreGauge score={report.overallScore ?? 0} size={72} />
                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/50">
                    <Globe className="h-3 w-3 shrink-0" />
                    <span className="truncate flex-1">{report.targetUrl.replace(/^https?:\/\//, "")}</span>
                    <a href={report.targetUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 hover:text-foreground transition-colors">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    {[
                      { val: report.passed,     label: "passed",  cls: "text-primary"              },
                      { val: report.failed,     label: "failed",  cls: "text-red-500"               },
                      { val: report.skipped,    label: "skipped", cls: "text-muted-foreground/60"   },
                      { val: report.totalTests, label: "total",   cls: "text-foreground"            },
                    ].map(({ val, label, cls }) => (
                      <div key={label} className="rounded-lg bg-muted/50 border border-border px-2 py-1.5">
                        <p className={`text-sm font-mono font-bold tabular-nums ${cls}`}>{val ?? 0}</p>
                        <p className="text-[9px] font-mono text-muted-foreground/50 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-px h-1.5 rounded-full overflow-hidden bg-border">
                    <div className="bg-primary rounded-l-full" style={{ width: `${((report.passed ?? 0) / (report.totalTests ?? 1)) * 100}%` }} />
                    <div className="bg-red-500" style={{ width: `${((report.failed ?? 0) / (report.totalTests ?? 1)) * 100}%` }} />
                  </div>
                  <p className="text-[9px] font-mono text-muted-foreground/30 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />{report.crawlSummary.totalPages} pages crawled · {Math.round(report.crawlSummary.crawlTimeMs / 1000)}s
                  </p>
                </div>
              </div>
            </div>

            {/* Category donuts */}
            {Object.keys(report.resultsByCategory).length > 0 && (
              <div>
                <p className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Categories</p>
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

            {/* AI Summary */}
            {report.aiSummary && (
              <details className="rounded-xl border border-border bg-muted/20 overflow-hidden group">
                <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors list-none touch-manipulation">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest flex-1">AI Summary</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-4 pt-2 border-t border-border">
                  <p className="text-sm font-mono text-muted-foreground leading-relaxed">{report.aiSummary}</p>
                </div>
              </details>
            )}

            {/* Tabs */}
            <div className="flex border-b border-border overflow-x-auto" role="tablist">
              {([
                { key: "tests",       label: "tests", count: report.testCases?.length ?? 0,        icon: FlaskConical },
                { key: "bugs",        label: "bugs",  count: report.bugs?.length ?? 0,              icon: Bug         },
                { key: "performance", label: "perf",  count: report.performanceGauges?.length ?? 0, icon: Activity    },
                { key: "trend",       label: "trend", count: report.trendData?.length ?? 0,         icon: TrendingUp  },
              ] as const).map(({ key, label, count, icon: Icon }) => (
                <button key={key} role="tab" aria-selected={activeTab === key}
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[10px] sm:text-xs font-mono uppercase tracking-widest border-b-2 transition-colors -mb-px shrink-0 touch-manipulation ${
                    activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] ${activeTab === key ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/50"}`}>{count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tests tab */}
            {activeTab === "tests" && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 flex-wrap" role="group">
                  {(["all", "passed", "failed", "flaky"] as const).map((f) => (
                    <button key={f} onClick={() => setTcFilter(f)} aria-pressed={tcFilter === f}
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-md capitalize transition-all touch-manipulation border ${
                        tcFilter === f ? "bg-muted text-foreground border-border" : "text-muted-foreground hover:text-foreground border-border/50"
                      }`}>
                      {f}
                      {f !== "all" && (
                        <span className="ml-1 text-muted-foreground/40">
                          ({(report.testCases ?? []).filter((tc) => (sseState.testUpdates[tc.id]?.status ?? tc.results?.[0]?.status ?? "skipped") === f).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list">
                  {filteredTestCases.length === 0
                    ? (
                      <div className="sm:col-span-2 rounded-xl border border-border bg-muted/20 p-6 text-center">
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

            {/* Bugs tab */}
            {activeTab === "bugs" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest flex items-center gap-1.5">
                    <Bug className="h-3.5 w-3.5 text-red-500" />{filteredBugs.length} bug{filteredBugs.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-1 flex-wrap" role="group">
                    {["all", "critical", "high", "medium", "low"].map((sev) => (
                      <button key={sev} onClick={() => setFilterSeverity(sev)} aria-pressed={filterSeverity === sev}
                        className={`text-[10px] font-mono px-2 py-1 rounded-md capitalize transition-all touch-manipulation border ${
                          filterSeverity === sev ? "bg-muted text-foreground border-border" : "text-muted-foreground hover:text-foreground border-border/50"
                        }`}>{sev}</button>
                    ))}
                  </div>
                </div>
                {filteredBugs.length === 0
                  ? (
                    <div className="rounded-xl border border-border bg-muted/20 p-6 text-center">
                      <CheckCircle2 className="h-7 w-7 text-primary mx-auto mb-2" />
                      <p className="text-xs font-mono text-muted-foreground">no bugs found for this filter</p>
                    </div>
                  )
                  : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="list">
                      {filteredBugs.map((bug) => (
                        <div key={bug.id} role="listitem"><BugCard bug={bug} onClick={() => setSelectedBug(bug)} /></div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}

            {/* Performance tab */}
            {activeTab === "performance" && (
              <div className="space-y-4">
                {(!report.performanceGauges || report.performanceGauges.length === 0)
                  ? (
                    <div className="rounded-xl border border-border bg-muted/20 p-6 text-center">
                      <Activity className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-xs font-mono text-muted-foreground">no performance data available</p>
                    </div>
                  )
                  : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {report.performanceGauges.map((pg: PerformanceGauge) => (
                        <div key={pg.pageUrl} className="rounded-xl border border-border bg-muted/20 p-4">
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
                            <PerfGaugeRow label="Load" value={pg.loadEventMs}         unit="ms" status={pg.loadEventStatus ?? "unknown"}        />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}

            {/* Trend tab */}
            {activeTab === "trend" && (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
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
                          <div className={`h-full rounded-full ${(pt.score ?? 0) >= 90 ? "bg-primary" : (pt.score ?? 0) >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pt.score ?? 0}%` }} />
                        </div>
                        <span className={`w-8 text-right font-bold ${(pt.score ?? 0) >= 90 ? "text-primary" : (pt.score ?? 0) >= 70 ? "text-yellow-500" : "text-red-500"}`}>{pt.score}</span>
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
              <button
                onClick={() => { const b = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `testfish-${Date.now()}.json`; a.click(); toast.success("JSON downloaded"); }}
                className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all touch-manipulation">
                <FileText className="h-3.5 w-3.5" /> JSON
              </button>
              {report.shareableSlug && (
                <button
                  onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/report/${report.shareableSlug}`); setCopied(true); toast.success("Link copied!"); setTimeout(() => setCopied(false), 2000); }}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border text-muted-foreground text-xs font-mono hover:text-foreground hover:bg-muted transition-all touch-manipulation">
                  {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Share2 className="h-3.5 w-3.5" />}
                  {copied ? "copied!" : "share"}
                </button>
              )}
              <button onClick={handleReset} className="inline-flex items-center gap-2 h-8 px-3 rounded-lg text-muted-foreground/40 text-xs font-mono hover:text-muted-foreground transition-all ml-auto touch-manipulation">
                <RotateCcw className="h-3.5 w-3.5" /> new test
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}