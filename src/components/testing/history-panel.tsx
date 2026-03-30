// ─── History Panel ─────────────────────────────────────────────────────────────
//
//  Groups runs by target URL — each URL renders as a collapsible accordion row
//  Shows "N runs" badge per URL group
//  Shows best score and latest run date on the collapsed header
//  Clicking the header expands/collapses the individual run list
//  Each individual run card is identical to the original design
//  onSelect signature unchanged — callers need no changes
//
// Usage:
//   <HistoryPanel
//     onSelect={(id, status) => { setTestRunId(id); setActiveTab("tests"); }}
//     onClose={() => setShowHistory(false)}
//   />

import { useState, useEffect } from "react";
import {
  History, Loader2, FlaskConical, XCircle, X, ArrowRight, StopCircle,
} from "lucide-react";
import { useTestHistory, type TestHistoryItem } from "@/client-api/query-hooks/use-testing-hooks";

// ─── URL group shape ──────────────────────────────────────────────────────────

interface UrlGroup {
  /** The normalised target URL (key for the group) */
  url: string;
  /** All runs for this URL, most recent first */
  runs: TestHistoryItem[];
  /** Best overall_score across all completed runs in this group */
  bestScore: number | null;
  /** Most recent startedAt across all runs in this group */
  latestAt: string;
  /** Total number of runs in this group */
  runCount: number;
}

/** Group a flat run list by target URL, sorted by most recently tested first. */
function groupByUrl(history: TestHistoryItem[]): UrlGroup[] {
  const map = new Map<string, TestHistoryItem[]>();

  for (const run of history) {
    // Normalise: strip trailing slash so "https://foo.com" and "https://foo.com/"
    // collapse into the same group key.
    const key = run.targetUrl.replace(/\/$/, "");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(run);
  }

  const groups: UrlGroup[] = [];

  for (const [url, runs] of map) {
    // Runs are already newest-first from the server (orderBy: desc started_at),
    // but sort defensively here just in case.
    runs.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    const bestScore = runs.reduce<number | null>((best, run) => {
      if (run.status !== "complete" || run.overallScore === null) return best;
      return best === null ? run.overallScore : Math.max(best, run.overallScore);
    }, null);

    groups.push({
      url,
      runs,
      bestScore,
      latestAt: runs[0]!.startedAt,
      runCount: runs.length,
    });
  }

  // Sort groups by most recently active first
  groups.sort(
    (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime(),
  );

  return groups;
}

// ─── Score colour helper (mirrors testing.page.tsx ScoreGauge thresholds) ────

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 90) return "text-primary";
  if (score >= 70) return "text-yellow-500";
  return "text-red-500";
}

// ─── Single run row (within an expanded group) ────────────────────────────────

function RunRow({
  item,
  onSelect,
}: {
  item: TestHistoryItem;
  onSelect: (id: string, status: string) => void;
}) {
  const isCancelled = item.status === "cancelled";
  const isFailed    = item.status === "failed";
  const isComplete  = item.status === "complete";

  const scoreCls = scoreColor(item.overallScore);

  return (
    <button
      onClick={() => onSelect(item.id, item.status)}
      className={`w-full text-left px-3 py-2.5 rounded-lg border hover:bg-muted/50 transition-all group touch-manipulation ${
        isCancelled ? "border-border/30 opacity-60" : "border-border"
      } bg-muted/20`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono text-muted-foreground/40">
            {new Date(item.startedAt).toLocaleDateString(undefined, {
              month: "short", day: "numeric",
            })}{" "}
            ·{" "}
            {new Date(item.startedAt).toLocaleTimeString([], {
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {isComplete && item.overallScore !== null ? (
            <span className={`text-base font-mono font-bold tabular-nums ${scoreCls}`}>
              {item.overallScore}
            </span>
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
      {isCancelled && (
        <p className="mt-0.5 text-[9px] font-mono text-muted-foreground/40 italic">
          stopped by user
        </p>
      )}

      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
        <span className="text-[9px] font-mono text-muted-foreground/40">view details</span>
      </div>
    </button>
  );
}

// ─── URL group row (collapsed / expanded) ────────────────────────────────────

function UrlGroupRow({
  group,
  onSelect,
  defaultExpanded,
}: {
  group: UrlGroup;
  onSelect: (id: string, status: string) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);

  const displayUrl = group.url.replace(/^https?:\/\//, "");
  const scoreCls   = scoreColor(group.bestScore);

  const latestDate = new Date(group.latestAt).toLocaleDateString(undefined, {
    month: "short", day: "numeric",
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      {/* ── Collapsed header ── */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors touch-manipulation text-left"
      >
        {/* Dot: blue when has completed runs, gray otherwise */}
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${
            group.bestScore !== null ? "bg-primary" : "bg-muted-foreground/40"
          }`}
        />

        {/* URL */}
        <span className="flex-1 min-w-0 text-xs font-mono text-foreground truncate">
          {displayUrl}
        </span>

        {/* Run count badge */}
        <span
          className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full border tabular-nums ${
            group.runCount > 1
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-muted/50 text-muted-foreground border-border"
          }`}
        >
          {group.runCount} {group.runCount === 1 ? "run" : "runs"}
        </span>

        {/* Best score */}
        {group.bestScore !== null && (
          <span className={`shrink-0 text-sm font-mono font-bold tabular-nums ${scoreCls}`}>
            {group.bestScore}
          </span>
        )}

        {/* Latest date */}
        <span className="shrink-0 text-[10px] font-mono text-muted-foreground/40 hidden sm:block">
          {latestDate}
        </span>

        {/* Chevron */}
        <svg
          width="12" height="12" viewBox="0 0 12 12"
          className={`shrink-0 text-muted-foreground/40 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        >
          <path d="M4 2l4 4-4 4"/>
        </svg>
      </button>

      {/* ── Expanded run list ── */}
      {expanded && (
        <div className="border-t border-border bg-muted/10 px-3 py-3 space-y-2">
          {/* Summary line */}
          <p className="text-[9px] font-mono text-muted-foreground/40 uppercase tracking-widest px-1">
            {group.runCount} test {group.runCount === 1 ? "run" : "runs"} ·{" "}
            {group.bestScore !== null && (
              <>best score <span className={`font-bold ${scoreCls}`}>{group.bestScore}</span></>
            )}
          </p>

          {group.runs.map(run => (
            <RunRow key={run.id} item={run} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── HistoryPanel (public export — replaces the original) ─────────────────────

export function HistoryPanel({
  onSelect,
  onClose,
}: {
  onSelect: (id: string, status: string) => void;
  onClose: () => void;
}) {
  const { data: history, isLoading } = useTestHistory();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const groups = history ? groupByUrl(history) : [];

  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch sm:items-center justify-end"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div
        className="relative z-10 w-full sm:max-w-sm h-full bg-background border-l border-border flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
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
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground touch-manipulation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
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
              onSelect={(id, status) => {
                onSelect(id, status);
                onClose();
              }}
              // Auto-expand the most recently tested site
              defaultExpanded={i === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}