// ─── History Panel ─────────────────────────────────────────────────────────────
//
//  Tab 1 "Runs"  — existing behaviour, groups runs by URL
//  Tab 2 "Cases" — lists test cases from previous runs; user can select
//                  up to maxTests cases then click "Run selected" which
//                  calls onRunCases({ targetUrl, cases })
//
// Usage:
//   <HistoryPanel
//     onSelect={(id, status) => { setTestRunId(id); setActiveTab("tests"); }}
//     onClose={() => setShowHistory(false)}
//     maxTests={planLimits.maxTests}
//     onRunCases={({ targetUrl, cases }) => handleRunFromCases(targetUrl, cases)}
//     onUpgrade={() => setShowUpgradeModal(true)}
//   />

import { useState, useEffect } from "react";
import {
  History, Loader2, FlaskConical, XCircle, X, ArrowRight, StopCircle,
  CheckSquare, Square, Play, ChevronDown, ChevronRight, Lock,
} from "lucide-react";
import { useTestHistory, useTestUsage, type TestHistoryItem } from "@/client-api/query-hooks/use-testing-hooks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UrlGroup {
  url: string;
  runs: TestHistoryItem[];
  bestScore: number | null;
  latestAt: string;
  runCount: number;
}

export interface SelectedCase {
  title: string;
  category: string;
  steps: string[];
  expected_result: string;
  priority: "P0" | "P1" | "P2";
  description?: string | null;
  tags?: string[] | null;
  estimated_duration?: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByUrl(history: TestHistoryItem[]): UrlGroup[] {
  const map = new Map<string, TestHistoryItem[]>();
  for (const run of history) {
    const key = run.targetUrl.replace(/\/$/, "");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(run);
  }
  const groups: UrlGroup[] = [];
  for (const [url, runs] of map) {
    runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    const bestScore = runs.reduce<number | null>((best, run) => {
      if (run.status !== "complete" || run.overallScore === null) return best;
      return best === null ? run.overallScore : Math.max(best, run.overallScore);
    }, null);
    groups.push({ url, runs, bestScore, latestAt: runs[0]!.startedAt, runCount: runs.length });
  }
  groups.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
  return groups;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 90) return "text-primary";
  if (score >= 70) return "text-yellow-500";
  return "text-red-500";
}

// ─── Usage Pill ────────────────────────────────────────────────────────────────

function UsagePill({
  runsToday, dailyLimit, planId, onUpgrade,
}: {
  runsToday: number; dailyLimit: number; planId: string; onUpgrade?: () => void;
}) {
  const remaining = dailyLimit - runsToday;
  const pct = runsToday / dailyLimit;
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
      {(isAtLimit || isNearLimit) && onUpgrade && (
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

// ─── RunRow (runs tab) ────────────────────────────────────────────────────────

function RunRow({ item, onSelect }: { item: TestHistoryItem; onSelect: (id: string, status: string) => void }) {
  const isCancelled = item.status === "cancelled";
  const isFailed    = item.status === "failed";
  const isComplete  = item.status === "complete";
  return (
    <button
      onClick={() => onSelect(item.id, item.status)}
      className={`w-full text-left px-3 py-2.5 rounded-lg border hover:bg-muted/50 transition-all group touch-manipulation ${isCancelled ? "border-border/30 opacity-60" : "border-border"} bg-muted/20`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono text-muted-foreground/40">
            {new Date(item.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            {" · "}
            {new Date(item.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {isComplete && item.overallScore !== null ? (
            <span className={`text-base font-mono font-bold tabular-nums ${scoreColor(item.overallScore)}`}>{item.overallScore}</span>
          ) : isCancelled ? (
            <StopCircle className="h-4 w-4 text-muted-foreground" />
          ) : isFailed ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>
      {isComplete && (
        <div className="flex gap-3 mt-1 text-[10px] font-mono">
          <span className="text-primary">{item.passed ?? 0}✓</span>
          <span className="text-red-500">{item.failed ?? 0}✗</span>
          <span className="text-muted-foreground/40">{item.skipped ?? 0} skip</span>
        </div>
      )}
      {isCancelled && <p className="mt-0.5 text-[9px] font-mono text-muted-foreground/40 italic">stopped by user</p>}
      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
        <span className="text-[9px] font-mono text-muted-foreground/40">view details</span>
      </div>
    </button>
  );
}

// ─── UrlGroupRow (runs tab) ───────────────────────────────────────────────────

function UrlGroupRow({ group, onSelect, defaultExpanded }: { group: UrlGroup; onSelect: (id: string, status: string) => void; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const displayUrl = group.url.replace(/^https?:\/\//, "");
  const latestDate = new Date(group.latestAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors touch-manipulation text-left">
        <span className={`h-2 w-2 rounded-full shrink-0 ${group.bestScore !== null ? "bg-primary" : "bg-muted-foreground/40"}`} />
        <span className="flex-1 min-w-0 text-xs font-mono text-foreground truncate">{displayUrl}</span>
        <span className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full border tabular-nums ${group.runCount > 1 ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/50 text-muted-foreground border-border"}`}>
          {group.runCount} {group.runCount === 1 ? "run" : "runs"}
        </span>
        {group.bestScore !== null && <span className={`shrink-0 text-sm font-mono font-bold tabular-nums ${scoreColor(group.bestScore)}`}>{group.bestScore}</span>}
        <span className="shrink-0 text-[10px] font-mono text-muted-foreground/40 hidden sm:block">{latestDate}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" className={`shrink-0 text-muted-foreground/40 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M4 2l4 4-4 4"/>
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-border bg-muted/10 px-3 py-3 space-y-2">
          <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest px-1">
            {group.runCount} test {group.runCount === 1 ? "run" : "runs"} ·{" "}
            {group.bestScore !== null && <>best score <span className={`font-bold ${scoreColor(group.bestScore)}`}>{group.bestScore}</span></>}
          </p>
          {group.runs.map(run => <RunRow key={run.id} item={run} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  );
}

// ─── TestCasePicker (cases tab) ───────────────────────────────────────────────
// Fetches full test case list per run via GET /api/test/run/:id/cases
// and presents them with checkboxes. Selection is capped at maxTests.

interface CasePickerRun {
  runId: string;
  targetUrl: string;
  startedAt: string;
  overallScore: number | null;
}

interface FetchedCase {
  id: string;
  title: string | null;
  category: string | null;
  steps: string[] | null;
  expected_result: string | null;
  priority: "P0" | "P1" | "P2" | null;
  description: string | null;
  tags: string[] | null;
  estimated_duration: number | null;
}

// Maps runId → fetched cases (null = loading, [] = empty/failed)
const caseCache = new Map<string, FetchedCase[] | null>();

function useRunCases(runId: string | null) {
  const [cases, setCases] = useState<FetchedCase[] | null>(
    runId ? (caseCache.get(runId) ?? null) : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!runId) return;
    if (caseCache.has(runId)) { setCases(caseCache.get(runId) ?? null); return; }
    setLoading(true);
    fetch(`/api/test/run/${runId}/cases`)
      .then(r => r.json())
      .then((data: { testCases?: FetchedCase[] }) => {
        const result = data.testCases ?? [];
        caseCache.set(runId, result);
        setCases(result);
      })
      .catch(() => { caseCache.set(runId, []); setCases([]); })
      .finally(() => setLoading(false));
  }, [runId]);

  return { cases, loading };
}

// Individual expandable run row in the Cases tab
function CasePickerRunRow({
  run,
  selectedIds,
  onToggle,
  maxTests,
  totalSelected,
}: {
  run: CasePickerRun;
  selectedIds: Set<string>;
  onToggle: (c: FetchedCase, selected: boolean) => void;
  maxTests: number;
  totalSelected: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const { cases, loading } = useRunCases(expanded ? run.runId : null);
  const displayUrl = run.targetUrl.replace(/^https?:\/\//, "");
  const date = new Date(run.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const PRIORITY_COLORS: Record<string, string> = {
    P0: "text-red-400 border-red-400/30 bg-red-400/10",
    P1: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
    P2: "text-muted-foreground border-border bg-muted/30",
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors touch-manipulation text-left">
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        }
        <span className="flex-1 min-w-0 text-xs font-mono text-foreground truncate">{displayUrl}</span>
        {run.overallScore !== null && (
          <span className={`shrink-0 text-sm font-mono font-bold tabular-nums ${scoreColor(run.overallScore)}`}>{run.overallScore}</span>
        )}
        <span className="shrink-0 text-[10px] font-mono text-muted-foreground/40">{date}</span>
      </button>

      {expanded && (
        <div className="border-t border-border bg-muted/10 px-3 py-3 space-y-1.5">
          {loading && (
            <div className="flex items-center justify-center py-5">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
          {!loading && (!cases || cases.length === 0) && (
            <p className="text-[10px] font-mono text-muted-foreground/40 text-center py-4">no test cases found</p>
          )}
          {!loading && cases && cases.map(c => {
            const isSelected = selectedIds.has(`${run.runId}::${c.id}`);
            const atLimit = !isSelected && totalSelected >= maxTests;
            const pCls = PRIORITY_COLORS[(c.priority ?? "P2")] ?? PRIORITY_COLORS["P2"]!;
            return (
              <button
                key={c.id}
                type="button"
                disabled={atLimit}
                onClick={() => onToggle(c, !isSelected)}
                className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-all touch-manipulation ${
                  isSelected
                    ? "border-primary/40 bg-primary/8"
                    : atLimit
                      ? "border-border/40 opacity-40 cursor-not-allowed bg-muted/10"
                      : "border-border hover:border-primary/30 hover:bg-muted/30 bg-muted/20"
                }`}
              >
                <span className={`shrink-0 mt-0.5 ${isSelected ? "text-primary" : "text-muted-foreground/30"}`}>
                  {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-mono text-foreground truncate">{c.title ?? "Untitled"}</span>
                  <span className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${pCls}`}>{c.priority ?? "P2"}</span>
                    {c.category && <span className="text-[9px] font-mono text-muted-foreground/40 capitalize">{c.category}</span>}
                    {c.steps && c.steps.length > 0 && <span className="text-[9px] font-mono text-muted-foreground/30">{c.steps.length} step{c.steps.length !== 1 ? "s" : ""}</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CasePickerUrlGroup (cases tab) ──────────────────────────────────────────
// Collapsible URL section wrapping all runs for that URL, mirroring UrlGroupRow.

function CasePickerUrlGroup({
  url,
  runs,
  bestScore,
  runCount,
  selectedIds,
  onToggle,
  maxTests,
  totalSelected,
  defaultExpanded,
}: {
  url: string;
  runs: CasePickerRun[];
  bestScore: number | null;
  runCount: number;
  selectedIds: Set<string>;
  onToggle: (run: CasePickerRun, c: FetchedCase, selected: boolean) => void;
  maxTests: number;
  totalSelected: number;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const displayUrl = url.replace(/^https?:\/\//, "");
  const latestDate = new Date(runs[0]!.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors touch-manipulation text-left">
        <span className={`h-2 w-2 rounded-full shrink-0 ${bestScore !== null ? "bg-primary" : "bg-muted-foreground/40"}`} />
        <span className="flex-1 min-w-0 text-xs font-mono text-foreground truncate">{displayUrl}</span>
        <span className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full border tabular-nums ${runCount > 1 ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/50 text-muted-foreground border-border"}`}>
          {runCount} {runCount === 1 ? "run" : "runs"}
        </span>
        {bestScore !== null && <span className={`shrink-0 text-sm font-mono font-bold tabular-nums ${scoreColor(bestScore)}`}>{bestScore}</span>}
        <span className="shrink-0 text-[10px] font-mono text-muted-foreground/40 hidden sm:block">{latestDate}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" className={`shrink-0 text-muted-foreground/40 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M4 2l4 4-4 4"/>
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-border bg-muted/10 px-3 py-3 space-y-2">
          <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest px-1">
            {runCount} test {runCount === 1 ? "run" : "runs"} ·{" "}
            {bestScore !== null && <>best score <span className={`font-bold ${scoreColor(bestScore)}`}>{bestScore}</span></>}
          </p>
          {runs.map(run => (
            <CasePickerRunRow
              key={run.runId}
              run={run}
              selectedIds={selectedIds}
              onToggle={(c, sel) => onToggle(run, c, sel)}
              maxTests={maxTests}
              totalSelected={totalSelected}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Groups completed runs by URL, shows one row per run (most recent per URL)
function TestCasePicker({
  history,
  maxTests,
  onRunCases,
  usageData,
  onUpgrade,
}: {
  history: TestHistoryItem[];
  maxTests: number;
  onRunCases: (payload: { targetUrl: string; cases: SelectedCase[] }) => void;
  usageData?: { runsToday: number; dailyLimit: number; planId: string } | null;
  onUpgrade?: () => void;
}) {
  // Selection key: "runId::caseId"
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Store full case data for selected keys
  const [selectedData, setSelectedData] = useState<Map<string, { case: FetchedCase; targetUrl: string }>>(new Map());

  // Only show completed runs that likely have cases
  const completedRuns: CasePickerRun[] = history
    .filter(r => r.status === "complete" && (r.totalTests ?? 0) > 0)
    .map(r => ({
      runId: r.id,
      targetUrl: r.targetUrl.replace(/\/$/, ""),
      startedAt: r.startedAt,
      overallScore: r.overallScore,
    }));

  const handleToggle = (run: CasePickerRun, c: FetchedCase, selected: boolean) => {
    const key = `${run.runId}::${c.id}`;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) next.add(key); else next.delete(key);
      return next;
    });
    setSelectedData(prev => {
      const next = new Map(prev);
      if (selected) {
        next.set(key, { case: c, targetUrl: run.targetUrl });
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const totalSelected = selectedIds.size;

  // Determine target URL: all selected must share same URL
  const urls = new Set(Array.from(selectedData.values()).map(v => v.targetUrl));
  const targetUrl = urls.size === 1 ? Array.from(urls)[0]! : null;

  const isAtDailyLimit = usageData ? usageData.runsToday >= usageData.dailyLimit : false;

  const handleRun = () => {
    if (totalSelected === 0 || !targetUrl) return;
    const cases: SelectedCase[] = Array.from(selectedData.values()).map(({ case: c }) => ({
      title: c.title ?? "Untitled",
      category: c.category ?? "navigation",
      steps: c.steps ?? [],
      expected_result: c.expected_result ?? "",
      priority: c.priority ?? "P1",
      description: c.description,
      tags: c.tags,
      estimated_duration: c.estimated_duration,
    }));
    onRunCases({ targetUrl, cases });
  };

  if (completedRuns.length === 0) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-xs font-mono text-muted-foreground">no completed runs with test cases</p>
      </div>
    );
  }

  // Group by URL, mirroring groupByUrl logic for the runs tab
  const byUrl = new Map<string, { runs: CasePickerRun[]; bestScore: number | null }>();
  for (const run of completedRuns) {
    if (!byUrl.has(run.targetUrl)) byUrl.set(run.targetUrl, { runs: [], bestScore: null });
    const entry = byUrl.get(run.targetUrl)!;
    entry.runs.push(run);
    if (run.overallScore !== null) {
      entry.bestScore = entry.bestScore === null ? run.overallScore : Math.max(entry.bestScore, run.overallScore);
    }
  }
  // Sort URL groups by most recent run (runs are already sorted newest-first from completedRuns)
  const urlGroups = Array.from(byUrl.entries()).sort(
    (a, b) => new Date(b[1].runs[0]!.startedAt).getTime() - new Date(a[1].runs[0]!.startedAt).getTime()
  );

  return (
    <div className="flex flex-col h-full">
      {/* Selection status bar */}
      <div className={`mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
        totalSelected > 0 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
      }`}>
        <FlaskConical className={`h-3.5 w-3.5 shrink-0 ${totalSelected > 0 ? "text-primary" : "text-muted-foreground/40"}`} />
        <span className="flex-1 text-[10px] font-mono text-muted-foreground">
          {totalSelected === 0
            ? `select up to ${maxTests} test cases`
            : `${totalSelected} / ${maxTests} selected`
          }
          {urls.size > 1 && totalSelected > 0 && (
            <span className="ml-1.5 text-yellow-500">· mix of URLs — select from one site only</span>
          )}
        </span>
        {totalSelected > 0 && (
          <button
            type="button"
            onClick={() => { setSelectedIds(new Set()); setSelectedData(new Map()); }}
            className="text-[9px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            clear
          </button>
        )}
      </div>

      {/* URL group list */}
      <div className="flex-1 overflow-y-auto px-3 space-y-2">
        {urlGroups.map(([url, { runs, bestScore }], i) => (
          <CasePickerUrlGroup
            key={url}
            url={url}
            runs={runs}
            bestScore={bestScore}
            runCount={runs.length}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            maxTests={maxTests}
            totalSelected={totalSelected}
            defaultExpanded={i === 0}
          />
        ))}
      </div>

      {/* Sticky footer CTA */}
      {totalSelected > 0 && (
        <div className="shrink-0 border-t border-border px-4 py-4 bg-background space-y-3">
          {urls.size > 1 ? (
            <p className="text-[10px] font-mono text-yellow-500 text-center">
              All selected cases must be from the same site to run together.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-[9px] font-mono text-muted-foreground/50 text-center">
                Will run on: <span className="text-foreground">{targetUrl?.replace(/^https?:\/\//, "")}</span>
              </p>
              <button
                type="button"
                onClick={handleRun}
                disabled={isAtDailyLimit}
                title={isAtDailyLimit ? `Daily limit reached. Upgrade to run more tests today.` : undefined}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-sans font-bold hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation"
              >
                {isAtDailyLimit
                  ? <><Lock className="h-4 w-4" /> Daily limit reached</>
                  : <><Play className="h-4 w-4" /> Run {totalSelected} selected case{totalSelected !== 1 ? "s" : ""}</>
                }
              </button>
            </div>
          )}
          {/* Usage pill — mirrors the one on the main testing page */}
          {usageData && (
            <UsagePill
              runsToday={usageData.runsToday}
              dailyLimit={usageData.dailyLimit}
              planId={usageData.planId}
              onUpgrade={onUpgrade}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── HistoryPanel (public export) ─────────────────────────────────────────────

export function HistoryPanel({
  onSelect,
  onClose,
  maxTests = 10,
  onRunCases,
  onUpgrade,
}: {
  onSelect: (id: string, status: string) => void;
  onClose: () => void;
  maxTests?: number;
  onRunCases?: (payload: { targetUrl: string; cases: SelectedCase[] }) => void;
  onUpgrade?: () => void;
}) {
  const { data: history, isLoading } = useTestHistory();
  const { data: usageData } = useTestUsage();
  const [activeTab, setActiveTab] = useState<"runs" | "cases">("runs");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const groups = history ? groupByUrl(history) : [];

  return (
    <div className="fixed inset-0 z-40 flex items-stretch sm:items-center justify-end" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
      <div className="relative z-10 w-full sm:max-w-sm h-full bg-background border-l border-border flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-mono font-medium text-foreground">history</h2>
            {groups.length > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground/40 bg-muted border border-border rounded-full px-1.5 py-0.5">
                {groups.length} {groups.length === 1 ? "site" : "sites"}
              </span>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-lg hover:bg-muted text-muted-foreground touch-manipulation">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border shrink-0">
          {([
            { key: "runs" as const, label: "Runs", icon: History },
            { key: "cases" as const, label: "Test Cases", icon: FlaskConical },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest border-b-2 transition-colors -mb-px flex-1 justify-center touch-manipulation ${
                activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        {activeTab === "runs" ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            )}
            {!isLoading && groups.length === 0 && (
              <div className="text-center py-12">
                <FlaskConical className="h-7 w-7 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs font-mono text-muted-foreground">no previous runs</p>
              </div>
            )}
            {groups.map((group, i) => (
              <UrlGroupRow
                key={group.url}
                group={group}
                onSelect={(id, status) => { onSelect(id, status); onClose(); }}
                defaultExpanded={i === 0}
              />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden pt-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <TestCasePicker
                history={history ?? []}
                maxTests={maxTests}
                usageData={usageData}
                onUpgrade={onUpgrade}
                onRunCases={(payload) => {
                  onRunCases?.(payload);
                  onClose();
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}