'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Github,
  GitBranch,
  Lock,
  Globe,
  ExternalLink,
  Loader2,
  AlertTriangle,
  TriangleAlert,
  Check,
  Info,
  XCircle,
  ArrowUpRight,
  LogOut,
  Search,
  ChevronDown,
  FolderGit2,
  Plus,
  Link,
  GitPullRequest,     // PR tab icon
  GitMerge,           // merge icon
  GitPullRequestDraft,// draft PR icon
  ChevronRight,       // expand arrow
  RefreshCw,          // retry mergeability
  X,                  // close PR detail
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useGithubStatus,
  useGithubRepoForChat,
  usePushToGithub,
  useGithubRepos,
  useConnectExistingRepo,
  useRepoBranches,
  usePullRequests,
  useDetailedPR,
  useCreatePullRequest,
  useMergePullRequest,
  type GithubRepoListItem,
  type NormalisedPR,
  type MergeMethod,
  type MergeableStatus,
} from '@/client-api/query-hooks/use-github-hooks'
import { authClient } from '@/server/better-auth/client'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface GithubPushDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: string
}

type Visibility = 'public' | 'private'

// Which top-level mode the form is in.
// 'follow-up' is the default when a repo is already linked.
// 'new-repo' and 'connect-existing' are available on first push or replace.
type PushMode = 'new-repo' | 'connect-existing' | 'follow-up'

// Top-level dialog tab: push code or manage PRs
type DialogTab = 'push' | 'prs'

type ErrorCode =
  | 'branch_already_exists'
  | 'repo_not_found'
  | 'repo_archived'
  | 'repo_name_taken'
  | 'github_not_connected'
  | 'token_expired'
  | 'no_files'
  | 'unauthorized'
  | 'pr_already_exists'
  | 'no_commits_between_branches'
  | 'pr_not_mergeable'
  | 'pr_not_found'

interface PushError {
  message: string
  code?: ErrorCode
}

// ============================================================================
// Inline alert component
// ============================================================================

function InlineAlert({
  variant,
  message,
  action,
}: {
  variant: 'warning' | 'error' | 'info'
  message: string
  action?: { label: string; onClick: () => void }
}) {
  const config = {
    warning: {
      bg: 'bg-amber-50 border-amber-200/80 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-100',
      icon: <AlertTriangle className="size-4 mt-0.5 shrink-0 text-amber-500 dark:text-amber-400" />,
      actionClass: 'text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100',
    },
    error: {
      bg: 'bg-red-50 border-red-200/80 text-red-900 dark:bg-red-950/40 dark:border-red-800/60 dark:text-red-100',
      icon: <XCircle className="size-4 mt-0.5 shrink-0 text-red-500 dark:text-red-400" />,
      actionClass: 'text-red-700 hover:text-red-900 dark:text-red-300 dark:hover:text-red-100',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200/80 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-100',
      icon: <Info className="size-4 mt-0.5 shrink-0 text-blue-500 dark:text-blue-400" />,
      actionClass: 'text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100',
    },
  }

  const c = config[variant]

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm animate-in fade-in-0 slide-in-from-top-1 duration-200',
        c.bg,
      )}
    >
      {c.icon}
      <div className="flex-1 min-w-0">
        <p className="leading-relaxed">{message}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={cn(
              'mt-1.5 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 hover:no-underline transition-colors',
              c.actionClass,
            )}
          >
            {action.label}
            <ArrowUpRight className="size-3" />
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Repo picker — inline combo input (type to filter OR type freeform)
//
// The trigger IS the text field. Typing filters the dropdown and simultaneously
// acts as freeform input for repos not in the list. Selecting from the list
// fills the field and stores the GithubRepoListItem. Clearing resets to freeform.
// ============================================================================

interface RepoPickerProps {
  repos: GithubRepoListItem[]
  isLoading: boolean
  selected: GithubRepoListItem | null
  onSelect: (repo: GithubRepoListItem | null) => void
  typedValue: string
  onTyped: (value: string) => void
}

function RepoPicker({ repos, isLoading, selected, onSelect, typedValue, onTyped }: RepoPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // What's shown in the input: selected item's fullName, otherwise raw typed value
  const inputDisplayValue = selected ? selected.fullName : typedValue

  const filtered = useMemo(() => {
    const q = (selected ? selected.fullName : typedValue).toLowerCase().trim()
    if (!q) return repos
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q),
    )
  }, [repos, typedValue, selected])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Drop the list selection when user starts typing again (freeform mode)
    if (selected) onSelect(null)
    onTyped(e.target.value)
    setOpen(true)
  }

  const handleSelect = (repo: GithubRepoListItem) => {
    onSelect(repo)
    onTyped('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className={cn(
        'flex items-center gap-2 rounded-md border bg-background/50 px-3 transition-colors',
        'focus-within:ring-2 focus-within:ring-ring',
        open && 'ring-2 ring-ring',
      )}>
        {isLoading ? (
          <Loader2 className="size-4 text-muted-foreground animate-spin shrink-0" />
        ) : selected ? (
          <FolderGit2 className="size-4 text-emerald-500 shrink-0" />
        ) : (
          <Search className="size-4 text-muted-foreground shrink-0" />
        )}
        <input
          ref={inputRef}
          value={inputDisplayValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={isLoading ? 'Loading repositories…' : 'Search or type owner/repo-name…'}
          disabled={isLoading}
          className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground min-w-0"
          autoComplete="off"
          spellCheck={false}
        />
        {/* Visibility badge when a repo is selected from the list */}
        {selected && (
          <span className={cn(
            'shrink-0 inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full',
            selected.private
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
          )}>
            {selected.private ? <Lock className="size-3" /> : <Globe className="size-3" />}
            {selected.private ? 'Private' : 'Public'}
          </span>
        )}
        <ChevronDown
          className={cn('size-4 text-muted-foreground shrink-0 transition-transform cursor-pointer', open && 'rotate-180')}
          onClick={() => { setOpen((v) => !v); inputRef.current?.focus() }}
        />
      </div>

      {/* Dropdown list */}
      {open && !isLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 duration-100 overflow-hidden">
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                {typedValue.trim()
                  ? <>No matches — <strong>Connect</strong> will try <span className="font-mono">{typedValue.trim()}</span> directly.</>
                  : 'No repositories found.'}
              </li>
            ) : (
              filtered.map((repo) => (
                <li key={repo.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()} // keep input focused
                    onClick={() => handleSelect(repo)}
                    className={cn(
                      'w-full flex items-start gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors',
                      selected?.id === repo.id && 'bg-muted',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{repo.fullName}</p>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{repo.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      {repo.private
                        ? <Lock className="size-3 text-amber-500" />
                        : <Globe className="size-3 text-emerald-500" />}
                      {selected?.id === repo.id && <Check className="size-3 text-primary" />}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
          {repos.length > 0 && (
            <div className="border-t px-3 py-2 text-xs text-muted-foreground">
              Can't find it? Type <span className="font-mono">owner/repo-name</span> directly.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Mode selector tabs (Create new / Use existing)
// Only shown on first push or when replacing a linked repo.
// ============================================================================

function ModeTabs({
  mode,
  onChange,
}: {
  mode: PushMode
  onChange: (m: PushMode) => void
}) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {([
        { value: 'new-repo' as const,         label: 'Create new',   icon: <Plus className="size-3.5" /> },
        { value: 'connect-existing' as const, label: 'Use existing', icon: <Link className="size-3.5" /> },
      ]).map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors',
            mode === tab.value
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Success screen
// ============================================================================

function SuccessScreen({
  repoUrl,
  branchName,
  isNewRepo,
  onClose,
}: {
  repoUrl: string
  branchName: string
  isNewRepo: boolean
  onClose: () => void
}) {
  // Auto-close after delay
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="flex flex-col items-center gap-5 py-6 animate-in fade-in-0 zoom-in-95 duration-300">
      <div className="relative">
        <div className="flex items-center justify-center size-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50">
          <Check className="size-8 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-0 duration-300 delay-150" />
        </div>
        <div className="absolute -bottom-1 -right-1 flex items-center justify-center size-7 rounded-full bg-background border-2 border-emerald-200 dark:border-emerald-800">
          <Github className="size-3.5 text-foreground" />
        </div>
      </div>

      <div className="text-center space-y-1.5">
        <p className="text-base font-semibold text-foreground">
          {isNewRepo ? 'Repository created!' : 'Code pushed!'}
        </p>
        <p className="text-sm text-muted-foreground">
          Successfully pushed to <span className="font-medium text-foreground">{branchName}</span>
        </p>
      </div>

      <div className="flex gap-2 w-full">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onClose}
        >
          Done
        </Button>
        <Button
          className="flex-1 gap-2"
          onClick={() => window.open(repoUrl, '_blank')}
        >
          <Github className="size-4" />
          View on GitHub
          <ExternalLink className="size-3" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Push progress indicator
// ============================================================================

function PushProgress({ isNewRepo }: { isNewRepo: boolean }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const steps = isNewRepo ? [800, 2000, 4000] : [600, 2000]
    const timers: ReturnType<typeof setTimeout>[] = []
    steps.forEach((delay, i) => {
      timers.push(setTimeout(() => setStep(i + 1), delay))
    })
    return () => timers.forEach(clearTimeout)
  }, [isNewRepo])

  const steps = isNewRepo
    ? ['Creating repository…', 'Pushing files…', 'Finalizing…']
    : ['Preparing push…', 'Pushing files…']

  return (
    <div className="flex flex-col gap-3 py-1">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center size-5 rounded-full transition-all duration-300',
            i < step
              ? 'bg-emerald-500 text-white'
              : i === step
                ? 'border-2 border-primary'
                : 'border-2 border-muted',
          )}>
            {i < step ? (
              <Check className="size-3" />
            ) : i === step ? (
              <Loader2 className="size-3 animate-spin text-primary" />
            ) : null}
          </div>
          <span className={cn(
            'text-sm transition-colors duration-200',
            i <= step ? 'text-foreground' : 'text-muted-foreground',
            i === step && 'font-medium',
          )}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// PR helpers
// ============================================================================

/** Human-readable label + colour for each mergeableStatus value */
function MergeabilityBadge({ status }: { status: MergeableStatus }) {
  const config: Record<MergeableStatus, { label: string; className: string }> = {
    mergeable:  { label: 'Ready to merge',      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
    conflicting:{ label: 'Has conflicts',        className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
    blocked:    { label: 'Blocked',              className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
    behind:     { label: 'Branch behind',        className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
    unstable:   { label: 'Checks pending/failing', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
    draft:      { label: 'Draft',                className: 'bg-muted text-muted-foreground' },
    unknown:    { label: 'Checking…',            className: 'bg-muted text-muted-foreground' },
  }
  const c = config[status]
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full', c.className)}>
      {status === 'unknown' && <Loader2 className="size-3 animate-spin" />}
      {c.label}
    </span>
  )
}

/** Small badge for PR state (open / closed / merged) */
function PRStateBadge({ state }: { state: NormalisedPR['state'] }) {
  const config = {
    open:   { label: 'Open',   className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
    closed: { label: 'Closed', className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300' },
    merged: { label: 'Merged', className: 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300' },
  }
  const c = config[state]
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full', c.className)}>
      {state === 'merged' ? <GitMerge className="size-3" /> : <GitPullRequest className="size-3" />}
      {c.label}
    </span>
  )
}

/** Relative time — "2 hours ago", "3 days ago" */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30)  return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

// ============================================================================
// Branch selector — custom dropdown styled to match the dialog design system.
// Uses the same controlled-div pattern as RepoPicker so the dropdown inherits
// bg-popover, border, and text colours rather than the browser's native grey.
// ============================================================================

interface BranchSelectProps {
  id: string
  value: string
  onChange: (v: string) => void
  branches: { name: string; protected: boolean }[]
  placeholder?: string
  className?: string
}

function BranchSelect({ id, value, onChange, branches, placeholder = 'Select branch', className }: BranchSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = branches.find((b) => b.name === value) ?? null

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (branchName: string) => {
    onChange(branchName)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger button */}
      <button
        type="button"
        id={id}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 rounded-md border bg-background/50 px-3 py-2 text-sm text-left transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          open && 'ring-2 ring-ring',
        )}
      >
        <GitBranch className="size-3.5 text-muted-foreground shrink-0" />
        <span className={cn('flex-1 truncate', !selected && 'text-muted-foreground')}>
          {selected
            ? <>{selected.name}{selected.protected ? <span className="ml-1 text-xs opacity-60">🔒</span> : null}</>
            : placeholder}
        </span>
        <ChevronDown className={cn('size-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 duration-100 overflow-hidden">
          <ul className="max-h-48 overflow-y-auto py-1">
            {branches.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No branches found.</li>
            ) : (
              branches.map((b) => (
                <li key={b.name}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(b.name)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/60 transition-colors',
                      value === b.name && 'bg-muted',
                    )}
                  >
                    <GitBranch className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{b.name}</span>
                    {b.protected && <span className="text-xs text-muted-foreground shrink-0">🔒</span>}
                    {value === b.name && <Check className="size-3.5 text-primary shrink-0" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PR Detail panel — shown when user clicks a PR card
// ============================================================================

interface PRDetailPanelProps {
  chatId: string
  pr: NormalisedPR  // initial data from the list (mergeableStatus: 'unknown')
  onBack: () => void
  onMerged: () => void
}

function PRDetailPanel({ chatId, pr, onBack, onMerged }: PRDetailPanelProps) {
  const [mergeMethod, setMergeMethod] = useState<MergeMethod>('squash')
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [mergeSuccess, setMergeSuccess] = useState(false)

  // Fetch full PR detail (real mergeability). Refetches automatically every 3s
  // while mergeableStatus is 'unknown' (GitHub lazy eval — see hook).
  const { data: detail, isLoading, refetch } = useDetailedPR(chatId, pr.number, true)
  const mergeMutation = useMergePullRequest(chatId)

  // Use fetched detail when available, fall back to list data
  const current = detail ?? pr

  const handleMerge = async () => {
    setMergeError(null)
    try {
      await mergeMutation.mutateAsync({ chatId, prNumber: pr.number, mergeMethod })
      setMergeSuccess(true)
      setTimeout(onMerged, 2000)
    } catch (err) {
      const raw = err as { message?: string }
      setMergeError(raw?.message ?? 'Failed to merge pull request')
    }
  }

  if (mergeSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="flex items-center justify-center size-14 rounded-full bg-purple-100 dark:bg-purple-950/50">
          <GitMerge className="size-7 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-semibold">Pull request merged!</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{current.headBranch}</span> → <span className="font-mono">{current.baseBranch}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-right-4 duration-200">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to PR list"
        >
          <X className="size-4" />
        </button>
        <h3 className="text-sm font-semibold flex-1 leading-tight line-clamp-2">{current.title}</h3>
        <a href={current.prUrl} target="_blank" rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open on GitHub">
          <ExternalLink className="size-4" />
        </a>
      </div>

      {/* State + mergeability badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <PRStateBadge state={current.state} />
        {current.state === 'open' && (
          isLoading
            ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" />Checking mergeability…</span>
            : <MergeabilityBadge status={current.mergeableStatus} />
        )}
        {current.draft && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            <GitPullRequestDraft className="size-3" />
            Draft
          </span>
        )}
      </div>

      {/* Branch flow */}
      <div className="flex items-center gap-2 text-sm rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[38%]">{current.headBranch}</span>
        <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[38%]">{current.baseBranch}</span>
        <span className="ml-auto text-xs text-muted-foreground shrink-0">{relativeTime(current.createdAt)}</span>
      </div>

      {/* Author */}
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <img src={current.author.avatarUrl} alt="" className="size-4 rounded-full" />
        Opened by <span className="font-medium text-foreground">@{current.author.login}</span>
      </p>

      {/* PR body */}
      {current.body && (
        <div className="text-sm text-muted-foreground rounded-lg border border-border bg-muted/20 px-3.5 py-3 max-h-28 overflow-y-auto whitespace-pre-wrap leading-relaxed">
          {current.body}
        </div>
      )}

      {/* Merge section — only for open, non-draft PRs */}
      {current.state === 'open' && !current.draft && (
        <>
          {/* Merge method selector */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">Merge method</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'merge'  as const, label: 'Merge commit',    desc: 'Preserve all commits' },
                { value: 'squash' as const, label: 'Squash & merge',  desc: 'Combine into one' },
                { value: 'rebase' as const, label: 'Rebase & merge',  desc: 'Replay onto base' },
              ]).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMergeMethod(value)}
                  className={cn(
                    'flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-all duration-150 text-xs',
                    mergeMethod === value
                      ? 'border-primary bg-muted shadow-sm'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30',
                  )}
                >
                  <span className={cn('font-medium', mergeMethod === value ? 'text-foreground' : 'text-muted-foreground')}>
                    {label}
                  </span>
                  <span className="text-muted-foreground leading-tight">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Merge-blocking explanations — only shown for the 5 blocking states.
              'mergeable' and 'unknown' are excluded by the outer condition. */}
          {!isLoading && current.mergeableStatus !== 'mergeable' && current.mergeableStatus !== 'unknown' && (
            <InlineAlert
              variant={current.mergeableStatus === 'conflicting' ? 'error' : 'warning'}
              message={({
                conflicting: 'This PR has merge conflicts. Resolve them on GitHub before merging.',
                blocked:     'Blocked by branch protection rules (required reviews or status checks).',
                behind:      'This branch is behind the base. Update it on GitHub before merging.',
                unstable:    'CI checks are pending or failing. Wait for them to pass.',
                draft:       'Draft PRs cannot be merged. Mark as ready for review first.',
              } as Record<string, string>)[current.mergeableStatus] ?? ''}
              action={{ label: 'Open on GitHub', onClick: () => window.open(current.prUrl, '_blank') }}
            />
          )}

          {/* Merge error */}
          {mergeError && <InlineAlert variant="error" message={mergeError} />}

          {/* Retry mergeability when still unknown */}
          {current.mergeableStatus === 'unknown' && !isLoading && (
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="size-3" />
              Retry mergeability check
            </button>
          )}

          {/* Merge button */}
          <Button
            className="w-full gap-2"
            disabled={
              mergeMutation.isPending ||
              isLoading ||
              current.mergeableStatus !== 'mergeable'
            }
            onClick={() => void handleMerge()}
          >
            {mergeMutation.isPending
              ? <><Loader2 className="size-4 animate-spin" /> Merging…</>
              : <><GitMerge className="size-4" /> Merge pull request</>
            }
          </Button>
        </>
      )}

      {/* Already merged / closed info */}
      {current.state !== 'open' && (
        <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3 text-sm text-muted-foreground text-center">
          This pull request is {current.state}.{' '}
          <a href={current.prUrl} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors">
            View on GitHub
          </a>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PR list + create panel — the full PRs tab content
// ============================================================================

interface PRTabProps {
  chatId: string
}

function PRTab({ chatId }: PRTabProps) {
  // 'list' | 'create' | pr number (detail view)
  const [view, setView] = useState<'list' | 'create' | number>('list')

  // PR create form state
  const [prTitle, setPrTitle]   = useState('')
  const [prHead, setPrHead]     = useState('')
  const [prBase, setPrBase]     = useState('')
  const [prBody, setPrBody]     = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  // Fetch branches + PRs — both only when the tab is mounted
  const { data: branches = [], isLoading: isLoadingBranches } = useRepoBranches(chatId, true)
  const { data: prs = [], isLoading: isLoadingPRs, refetch: refetchPRs } = usePullRequests(chatId, true)

  const createMutation = useCreatePullRequest(chatId)

  // The PR the user has clicked into (from the list data, stale-but-immediate)
  const selectedPR = typeof view === 'number' ? prs.find((p) => p.number === view) ?? null : null

  const resetCreateForm = () => {
    setPrTitle('')
    setPrHead('')
    setPrBase('')
    setPrBody('')
    setCreateError(null)
  }

  const handleCreate = async () => {
    setCreateError(null)
    if (!prTitle.trim()) { setCreateError('Title is required.'); return }
    if (!prHead)          { setCreateError('Select a source (head) branch.'); return }
    if (!prBase)          { setCreateError('Select a target (base) branch.'); return }
    if (prHead === prBase){ setCreateError('Head and base branches must be different.'); return }

    try {
      const created = await createMutation.mutateAsync({ chatId, title: prTitle.trim(), head: prHead, base: prBase, body: prBody.trim() || undefined })
      resetCreateForm()
      // Jump straight into the new PR's detail view
      setView(created.number)
    } catch (err) {
      const raw = err as { message?: string; code?: string }
      const code = raw?.code
      if (code === 'pr_already_exists') {
        setCreateError('A pull request for this branch already exists.')
      } else if (code === 'no_commits_between_branches') {
        setCreateError('No commits between these branches. Push some changes first.')
      } else {
        setCreateError(raw?.message ?? 'Failed to create pull request.')
      }
    }
  }

  // ── Detail view ──
  if (typeof view === 'number' && selectedPR) {
    return (
      <PRDetailPanel
        chatId={chatId}
        pr={selectedPR}
        onBack={() => setView('list')}
        onMerged={() => {
          void refetchPRs()
          setView('list')
        }}
      />
    )
  }

  // ── Create form ──
  if (view === 'create') {
    return (
      <div className="flex flex-col gap-4 animate-in fade-in-0 slide-in-from-right-4 duration-200">
        {/* Header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setView('list'); resetCreateForm() }}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to PR list"
          >
            <X className="size-4" />
          </button>
          <h3 className="text-sm font-semibold">Open a pull request</h3>
        </div>

        {/* Branch selectors */}
        {isLoadingBranches ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading branches…
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pr-head" className="text-xs text-muted-foreground font-medium">From (head)</Label>
              <BranchSelect
                id="pr-head"
                value={prHead}
                onChange={setPrHead}
                branches={branches}
                placeholder="Source branch"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pr-base" className="text-xs text-muted-foreground font-medium">Into (base)</Label>
              <BranchSelect
                id="pr-base"
                value={prBase}
                onChange={setPrBase}
                branches={branches}
                placeholder="Target branch"
              />
            </div>
          </div>
        )}

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pr-title" className="text-sm font-medium">Title</Label>
          <Input
            id="pr-title"
            placeholder="Add a descriptive title…"
            value={prTitle}
            onChange={(e) => setPrTitle(e.target.value)}
            className="bg-background/50"
            onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate() }}
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pr-body" className="text-sm font-medium">
            Description
            <span className="text-muted-foreground font-normal ml-1">(optional)</span>
          </Label>
          <Textarea
            id="pr-body"
            placeholder="Describe the changes in this pull request…"
            value={prBody}
            onChange={(e) => setPrBody(e.target.value)}
            className="bg-background/50 min-h-[80px] resize-none"
            rows={3}
          />
        </div>

        {/* Error */}
        {createError && <InlineAlert variant="error" message={createError} />}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={() => { setView('list'); resetCreateForm() }}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            disabled={createMutation.isPending || !prTitle.trim() || !prHead || !prBase}
            onClick={() => void handleCreate()}
          >
            {createMutation.isPending
              ? <><Loader2 className="size-4 animate-spin" /> Creating…</>
              : <><GitPullRequest className="size-4" /> Open PR</>
            }
          </Button>
        </div>
      </div>
    )
  }

  // ── PR list ──
  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {isLoadingPRs ? 'Loading…' : `${prs.length} open pull request${prs.length !== 1 ? 's' : ''}`}
        </span>
        <Button size="sm" className="gap-1.5 h-8" onClick={() => setView('create')}>
          <Plus className="size-3.5" />
          New PR
        </Button>
      </div>

      {/* Loading skeleton */}
      {isLoadingPRs && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg border border-border bg-muted/30 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoadingPRs && prs.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex items-center justify-center size-12 rounded-full bg-muted">
            <GitPullRequest className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">No open pull requests</p>
            <p className="text-xs text-muted-foreground">Push to a branch then open a PR to merge it.</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={() => setView('create')}>
            <Plus className="size-3.5" />
            Open a pull request
          </Button>
        </div>
      )}

      {/* PR cards */}
      {!isLoadingPRs && prs.length > 0 && (
        <ul className="space-y-2">
          {prs.map((pr) => (
            <li key={pr.number}>
              <button
                type="button"
                onClick={() => setView(pr.number)}
                className="w-full flex items-start gap-3 rounded-lg border border-border bg-background/50 px-3.5 py-3 text-left hover:bg-muted/40 transition-colors group"
              >
                {/* Icon */}
                <div className="shrink-0 mt-0.5">
                  {pr.draft
                    ? <GitPullRequestDraft className="size-4 text-muted-foreground" />
                    : <GitPullRequest className="size-4 text-emerald-500" />
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {pr.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground font-mono">
                      #{pr.number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pr.headBranch} → {pr.baseBranch}
                    </span>
                    <span className="text-xs text-muted-foreground">{relativeTime(pr.updatedAt)}</span>
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ============================================================================
// Top-level dialog tab bar (Push / Pull Requests)
// Only shown when a repo is already linked.
// ============================================================================

function DialogTabBar({
  activeTab,
  onChange,
  prCount,
}: {
  activeTab: DialogTab
  onChange: (t: DialogTab) => void
  prCount?: number
}) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden">
      {([
        { value: 'push' as const, label: 'Push Code',      icon: <Github className="size-3.5" /> },
        { value: 'prs'  as const, label: 'Pull Requests',  icon: <GitPullRequest className="size-3.5" />, badge: prCount },
      ]).map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors relative',
            activeTab === tab.value
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
          )}
        >
          {tab.icon}
          {tab.label}
          {/* PR count badge */}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="ml-0.5 inline-flex items-center justify-center size-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none">
              {tab.badge > 9 ? '9+' : tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Component
// ============================================================================

export function GithubPushDialog({ open, onOpenChange, chatId }: GithubPushDialogProps) {
  const { data: githubStatus, isLoading: isLoadingStatus } = useGithubStatus()
  const { data: existingRepo, isLoading: isLoadingRepo } = useGithubRepoForChat(chatId)
  const pushMutation = usePushToGithub(chatId)
  const connectMutation = useConnectExistingRepo(chatId)

  // repoLinked: true when a repo is already saved for this chat (from the query)
  // OR when one was just connected this session (justConnected flag below).
  // This is the single source of truth for "does a repo exist" — avoids the
  // async gap between connectMutation.onSuccess invalidating the query and
  // useGithubRepoForChat returning the updated data.
  const [justConnected, setJustConnected] = useState(false)
  const [connectedRepoFullName, setConnectedRepoFullName] = useState<string | null>(null)
  const repoLinked = !!existingRepo || justConnected
  const isFirstPush = !repoLinked
  // isLoading only blocks the UI on the true initial load — not on background
  // refetches triggered by query invalidation after connect/push. Once repoLinked
  // is true we have enough data to render; the refetch updates details silently.
  const isLoading = isLoadingStatus || (isLoadingRepo && !repoLinked)

  // ── Top-level tab (Push / PRs) — only relevant when a repo is linked ──
  const [activeTab, setActiveTab] = useState<DialogTab>('push')

  // Push mode
  const [pushMode, setPushMode] = useState<PushMode>('new-repo')

  // Form state
  const [repoName, setRepoName] = useState('')
  const [branchName, setBranchName] = useState('main')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [commitMessage, setCommitMessage] = useState('')

  // Connect-existing state
  const [selectedRepo, setSelectedRepo] = useState<GithubRepoListItem | null>(null)
  const [typedRepoValue, setTypedRepoValue] = useState('')

  // Replace repo flow
  const [showReplaceWarning, setShowReplaceWarning] = useState(false)
  const [replaceRepo, setReplaceRepo] = useState(false)

  // Error state
  const [pushError, setPushError] = useState<PushError | null>(null)
  const [connectError, setConnectError] = useState<PushError | null>(null)

  // Branch confirmation
  const [confirmExistingBranch, setConfirmExistingBranch] = useState(false)

  // Success state — show before closing
  const [successData, setSuccessData] = useState<{
    repoUrl: string
    branchName: string
    isNewRepo: boolean
  } | null>(null)

  // Fetch PR count for the badge — only when a repo is linked
  const { data: prs = [] } = usePullRequests(chatId, open && repoLinked)

  // Refs
  const repoNameRef = useRef<HTMLInputElement>(null)
  const branchNameRef = useRef<HTMLInputElement>(null)

  // Derived
  // inSetupMode is the single source of truth for whether we are in the
  // "first push / replace" setup flow vs the normal follow-up tabbed UI.
  // It is driven purely by pushMode so it flips atomically when setPushMode
  // is called, avoiding the async lag that isFirstPush (derived from repoLinked)
  // can introduce during the connect transition.
  const inSetupMode = pushMode !== 'follow-up'
  const showNewRepoForm = inSetupMode && pushMode === 'new-repo'
  const showConnectExistingForm = inSetupMode && pushMode === 'connect-existing'

  // Fetch repos only when connect-existing mode is active
  const { data: userRepos = [], isLoading: isLoadingRepos } = useGithubRepos(
    open && showConnectExistingForm && !!githubStatus?.connected,
  )

  // Reset everything when dialog opens
  useEffect(() => {
    if (open) {
      setJustConnected(false)
      setConnectedRepoFullName(null)
      setActiveTab('push')
      setPushMode(repoLinked ? 'follow-up' : 'new-repo')
      setRepoName('')
      const today = new Date().toISOString().slice(0, 10)
      setBranchName(repoLinked ? `update-${today}` : 'main')
      setVisibility('public')
      setCommitMessage('')
      setPushError(null)
      setConnectError(null)
      setConfirmExistingBranch(false)
      setShowReplaceWarning(false)
      setReplaceRepo(false)
      setSuccessData(null)
      setSelectedRepo(null)
      setTypedRepoValue('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Auto-focus the first relevant input after loading
  useEffect(() => {
    if (!open || isLoading) return
    const timer = setTimeout(() => {
      if (showNewRepoForm) {
        repoNameRef.current?.focus()
      } else {
        branchNameRef.current?.focus()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [open, isLoading, showNewRepoForm])

  // Clear errors when user edits the triggering field
  useEffect(() => {
    if (pushError?.code === 'branch_already_exists' || pushError?.code === 'repo_name_taken') {
      setPushError(null)
      setConfirmExistingBranch(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchName, repoName])

  // Clear connect error when user changes the repo selection
  useEffect(() => {
    setConnectError(null)
  }, [selectedRepo, typedRepoValue])

  // Handle connect-existing submit
  const handleConnect = useCallback(async () => {
    setConnectError(null)

    const repoFullName = selectedRepo?.fullName ?? typedRepoValue.trim()
    if (!repoFullName) {
      setConnectError({ message: 'Please select or type a repository name (e.g. owner/repo-name).' })
      return
    }
    if (!repoFullName.includes('/')) {
      setConnectError({ message: 'Include the owner prefix, e.g. your-username/repo-name.' })
      return
    }

    try {
      await connectMutation.mutateAsync({ chatId, repoFullName })
      // Synchronously mark the repo as linked so the tabbed UI renders
      // immediately — before useGithubRepoForChat's async refetch resolves.
      setJustConnected(true)
      setConnectedRepoFullName(repoFullName)
      setPushMode('follow-up')
      const today = new Date().toISOString().slice(0, 10)
      setBranchName(`update-${today}`)
      setActiveTab('push')
      setConnectError(null)
      setSelectedRepo(null)
      setTypedRepoValue('')
    } catch (error) {
      const raw = error as { message?: string; code?: ErrorCode }
      setConnectError({ message: raw?.message ?? 'Failed to connect repository', code: raw?.code })
    }
  }, [chatId, connectMutation, selectedRepo, typedRepoValue])

  const handlePush = useCallback(async (overrideConfirm = false) => {
    setPushError(null)

    if (!branchName.trim()) {
      setPushError({ message: 'Branch name is required.' })
      branchNameRef.current?.focus()
      return
    }
    if (showNewRepoForm && !repoName.trim()) {
      setPushError({ message: 'Repository name is required.' })
      repoNameRef.current?.focus()
      return
    }

    try {
      const result = await pushMutation.mutateAsync({
        chatId,
        branchName: branchName.trim(),
        commitMessage: commitMessage.trim() || undefined,
        confirmExistingBranch: overrideConfirm || confirmExistingBranch,
        ...(showNewRepoForm && {
          repoName: repoName.trim(),
          visibility,
          replaceRepo: replaceRepo || undefined,
        }),
      })

      // Show success state inside dialog instead of toast
      setSuccessData({
        repoUrl: result.repoUrl,
        branchName: result.branchName,
        isNewRepo: result.isNewRepo,
      })
    } catch (error) {
      const raw = error as { message?: string; code?: ErrorCode }
      const code = raw?.code
      const message = raw?.message ?? 'Failed to push to GitHub'
      setPushError({ message, code })
    }
  }, [branchName, chatId, commitMessage, confirmExistingBranch, pushMutation, repoName, replaceRepo, showNewRepoForm, visibility])

  // Handle Enter key to submit
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !pushMutation.isPending && !connectMutation.isPending) {
      // Don't submit from textarea
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      e.preventDefault()
      if (showConnectExistingForm) {
        void handleConnect()
      } else {
        void handlePush()
      }
    }
  }, [handlePush, handleConnect, pushMutation.isPending, connectMutation.isPending, showConnectExistingForm])

  // Block close during push or connect
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (pushMutation.isPending || connectMutation.isPending) return
    onOpenChange(nextOpen)
  }, [pushMutation.isPending, connectMutation.isPending, onOpenChange])

  // ── Push success state ──
  if (successData) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <SuccessScreen
            repoUrl={successData.repoUrl}
            branchName={successData.branchName}
            isNewRepo={successData.isNewRepo}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    )
  }

  // ── Not connected state ──
  if (!isLoading && (!githubStatus?.connected || !githubStatus?.hasRepoScope)) {
    const needsRepoScope = githubStatus?.connected && !githubStatus?.hasRepoScope

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="size-5" />
              Connect GitHub
            </DialogTitle>
            <DialogDescription>
              {needsRepoScope
                ? 'Your GitHub account is connected but missing repository permissions.'
                : 'Sign in with GitHub to push your generated code.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-5 text-center space-y-3">
              <div className="mx-auto flex items-center justify-center size-12 rounded-full bg-muted">
                <Github className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {needsRepoScope
                  ? 'Sign out and sign back in with GitHub to grant repository write access.'
                  : 'Connect your GitHub account to create repositories and push code directly from Buildify.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => {
                  void authClient.signOut().then(() => {
                    window.location.href = '/login'
                  })
                }}
              >
                <LogOut className="size-4" />
                {needsRepoScope ? 'Reconnect' : 'Sign in with GitHub'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Replace repo warning screen ──
  if (showReplaceWarning && existingRepo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <TriangleAlert className="size-5" />
              Replace Repository?
            </DialogTitle>
            <DialogDescription>
              This will disconnect your chat from its current repository.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/60 p-4 text-sm text-amber-900 dark:text-amber-100 space-y-3">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-amber-100/60 dark:bg-amber-900/30">
                <Github className="size-4 shrink-0 text-amber-700 dark:text-amber-300" />
                <span className="font-mono text-sm font-medium truncate">{existingRepo.repoFullName}</span>
                <a
                  href={existingRepo.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto shrink-0"
                >
                  <ExternalLink className="size-3.5 opacity-60 hover:opacity-100 transition-opacity" />
                </a>
              </div>
              <ul className="space-y-1.5 text-amber-800 dark:text-amber-200 ml-1">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 rounded-full bg-amber-500 shrink-0" />
                  Future pushes will go to the <strong>new</strong> repository.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 rounded-full bg-amber-500 shrink-0" />
                  The old repository is <strong>not deleted</strong> on GitHub.
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 rounded-full bg-amber-500 shrink-0" />
                  This chat will <strong>no longer be linked</strong> to it.
                </li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowReplaceWarning(false)}
              >
                Go back
              </Button>
              <Button
                className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => {
                  setShowReplaceWarning(false)
                  setReplaceRepo(true)
                  setRepoName('')
                  setSelectedRepo(null)
                  setTypedRepoValue('')
                  setBranchName('main')
                  setPushMode('new-repo')
                }}
              >
                Yes, replace
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Main form ──
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => { if (pushMutation.isPending || connectMutation.isPending) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="size-5" />
            {activeTab === 'prs'
              ? 'Pull Requests'
              : showConnectExistingForm
                ? 'Connect Repository'
                : showNewRepoForm && replaceRepo
                  ? 'Create New Repository'
                  : inSetupMode
                    ? 'Push to GitHub'
                    : 'Push Update'}
          </DialogTitle>
          <DialogDescription>
            {activeTab === 'prs'
              ? `Manage pull requests for ${existingRepo?.repoFullName ?? 'your repository'}.`
              : showConnectExistingForm
                ? 'Link an existing GitHub repository to this chat. You can push to it afterwards.'
                : showNewRepoForm && replaceRepo
                  ? 'Create a new repository and link it to this chat.'
                  : inSetupMode
                    ? 'Create a new repository and push your generated code.'
                    : `Push a new update to ${existingRepo?.repoFullName ?? connectedRepoFullName}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col gap-4 py-6">
            <div className="space-y-3">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-9 bg-muted animate-pulse rounded-md" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-9 bg-muted animate-pulse rounded-md" />
            </div>
            <div className="h-9 bg-muted animate-pulse rounded-md" />
          </div>
        ) : pushMutation.isPending ? (
          <div className="py-4 animate-in fade-in-0 duration-200">
            {/* Connected user */}
            {githubStatus?.login && (
              <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                <Github className="size-3.5" />
                <span>Authenticated as <span className="font-medium text-foreground">@{githubStatus.login}</span> · committing as Buildify</span>
              </div>
            )}
            <PushProgress isNewRepo={showNewRepoForm} />
          </div>
        ) : connectMutation.isPending ? (
          // Connect in progress
          <div className="py-8 flex flex-col items-center gap-3 animate-in fade-in-0 duration-200">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verifying repository access…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-1" onKeyDown={handleKeyDown}>

            {/* Top-level tab bar — only visible when not in setup mode */}
            {!inSetupMode && (
              <DialogTabBar
                activeTab={activeTab}
                onChange={setActiveTab}
                prCount={prs.length}
              />
            )}

            {/* ── PR tab content ── */}
            {activeTab === 'prs' && !inSetupMode && (
              <PRTab chatId={chatId} />
            )}

            {/* ── Push tab content ── */}
            {(activeTab === 'push' || inSetupMode) && (
              <>
                {/* Connected user indicator */}
                {githubStatus?.login && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
                    <div className="relative">
                      <Github className="size-3.5" />
                      <span className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <span>Connected as <span className="font-medium text-foreground">@{githubStatus.login}</span></span>
                  </div>
                )}

                {/* Mode tabs — shown only in setup mode */}
                {inSetupMode && (
                  <ModeTabs
                    mode={pushMode}
                    onChange={(m) => {
                      setPushMode(m)
                      setPushError(null)
                      setConnectError(null)
                      setConfirmExistingBranch(false)
                    }}
                  />
                )}

                {/* Existing repo info (follow-up push) */}
                {!inSetupMode && (existingRepo || connectedRepoFullName) && (
                  <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 transition-colors">
                    <Github className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {existingRepo?.repoFullName ?? connectedRepoFullName}
                    </span>
                    {existingRepo && (
                      <>
                        <span className={cn(
                          'ml-auto shrink-0 inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full',
                          existingRepo.visibility === 'public'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
                        )}>
                          {existingRepo.visibility === 'public' ? <Globe className="size-3" /> : <Lock className="size-3" />}
                          {existingRepo.visibility}
                        </span>
                        <a
                          href={existingRepo.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                      </>
                    )}
                  </div>
                )}


                {/* ── Connect existing form ── */}
                {showConnectExistingForm && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm font-medium">Repository</Label>
                      <RepoPicker
                        repos={userRepos}
                        isLoading={isLoadingRepos}
                        selected={selectedRepo}
                        onSelect={setSelectedRepo}
                        typedValue={typedRepoValue}
                        onTyped={setTypedRepoValue}
                      />
                      {selectedRepo ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {selectedRepo.private ? <Lock className="size-3" /> : <Globe className="size-3" />}
                          {selectedRepo.private ? 'Private' : 'Public'} · Default branch:{' '}
                          <span className="font-mono">{selectedRepo.defaultBranch}</span>
                        </p>
                      ) : typedRepoValue.trim() && !typedRepoValue.includes('/') ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="size-3" />
                          Include the owner prefix, e.g.{' '}
                          <span className="font-mono">your-username/{typedRepoValue.trim()}</span>
                        </p>
                      ) : null}
                    </div>

                    {/* Connect error */}
                    {connectError && (
                      <InlineAlert
                        variant={connectError.code === 'repo_archived' ? 'warning' : 'error'}
                        message={connectError.message}
                        action={connectError.code === 'repo_archived' ? {
                          label: 'Open on GitHub',
                          onClick: () => window.open(selectedRepo?.htmlUrl, '_blank'),
                        } : connectError.code === 'token_expired' ? {
                          label: 'Sign out & reconnect',
                          onClick: () => {
                            void authClient.signOut().then(() => { window.location.href = '/login' })
                          },
                        } : undefined}
                      />
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 gap-2"
                        onClick={() => void handleConnect()}
                        disabled={
                          connectMutation.isPending ||
                          (!selectedRepo && !typedRepoValue.trim()) ||
                          connectError?.code === 'repo_archived' ||
                          connectError?.code === 'token_expired'
                        }
                      >
                        <Link className="size-4" />
                        Connect
                      </Button>
                    </div>
                  </>
                )}

                {/* ── Push form (new repo or follow-up) ── */}
                {!showConnectExistingForm && (
                  <>
                    {/* Error alerts */}
                    {pushError?.code === 'repo_not_found' && (
                      <InlineAlert
                        variant="error"
                        message={pushError.message}
                        action={{
                          label: 'Create a new repository instead',
                          onClick: () => {
                            setPushError(null)
                            setShowReplaceWarning(false)
                            setReplaceRepo(true)
                            setRepoName('')
                            setBranchName('main')
                            setPushMode('new-repo')
                          },
                        }}
                      />
                    )}

                    {pushError?.code === 'repo_archived' && (
                      <InlineAlert
                        variant="error"
                        message={pushError.message}
                        action={{
                          label: 'Open repository on GitHub',
                          onClick: () => window.open(existingRepo?.repoUrl, '_blank'),
                        }}
                      />
                    )}

                    {pushError?.code === 'token_expired' && (
                      <InlineAlert
                        variant="error"
                        message="Your GitHub session has expired. Sign out and sign back in with GitHub."
                        action={{
                          label: 'Sign out & reconnect',
                          onClick: () => {
                            void authClient.signOut().then(() => {
                              window.location.href = '/login'
                            })
                          },
                        }}
                      />
                    )}

                    {pushError?.code === 'no_files' && (
                      <InlineAlert
                        variant="warning"
                        message="No generated files found for this chat. Build something first, then push."
                      />
                    )}

                    {pushError && !pushError.code && (
                      <InlineAlert variant="error" message={pushError.message} />
                    )}

                    {/* Repo name (new repo form only) */}
                    {showNewRepoForm && (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="repo-name" className="text-sm font-medium">
                          Repository name
                        </Label>
                        <div className="relative">
                          <Input
                            ref={repoNameRef}
                            id="repo-name"
                            placeholder="my-buildify-app"
                            value={repoName}
                            onChange={(e) =>
                              setRepoName(e.target.value.replace(/\s+/g, '-').toLowerCase())
                            }
                            className={cn(
                              'bg-background/50 pr-8',
                              pushError?.code === 'repo_name_taken' && 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20',
                            )}
                          />
                          {repoName && !pushError?.code && (
                            <Check className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-emerald-500" />
                          )}
                        </div>
                        {pushError?.code === 'repo_name_taken' ? (
                          <p className="text-xs text-red-500">{pushError.message}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Lowercase letters, numbers, and hyphens only.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Branch name */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="branch-name" className="flex items-center gap-1.5 text-sm font-medium">
                        <GitBranch className="size-3.5 text-muted-foreground" />
                        Branch
                      </Label>
                      <Input
                        ref={branchNameRef}
                        id="branch-name"
                        placeholder="main"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value.replace(/\s+/g, '-'))}
                        className={cn(
                          'bg-background/50',
                          pushError?.code === 'branch_already_exists' && 'border-amber-500 focus-visible:border-amber-500 focus-visible:ring-amber-500/20',
                        )}
                      />

                      {/* Branch already exists — inline confirm */}
                      {pushError?.code === 'branch_already_exists' && (
                        <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/60 px-3.5 py-3 text-sm text-amber-900 dark:text-amber-100 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="size-4 mt-0.5 shrink-0 text-amber-500" />
                            <div>
                              <p className="leading-relaxed">
                                Branch <strong className="font-semibold">{branchName}</strong> already exists.
                                Pushing will add a new commit.
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmExistingBranch(true)
                                    void handlePush(true)
                                  }}
                                  className="text-sm font-medium text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:no-underline transition-colors"
                                >
                                  Push anyway
                                </button>
                                <span className="text-amber-400 dark:text-amber-600 select-none">/</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPushError(null)
                                    setBranchName('')
                                    branchNameRef.current?.focus()
                                  }}
                                  className="text-sm font-medium text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:no-underline transition-colors"
                                >
                                  Rename branch
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Visibility (new repo form only) */}
                    {showNewRepoForm && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium">Visibility</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {([
                            { value: 'public' as const, icon: Globe, label: 'Public', desc: 'Anyone can see' },
                            { value: 'private' as const, icon: Lock, label: 'Private', desc: 'Only you' },
                          ] as const).map(({ value, icon: Icon, label, desc }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setVisibility(value)}
                              className={cn(
                                'flex flex-col items-start gap-0.5 rounded-lg border px-3.5 py-2.5 text-left transition-all duration-150',
                                visibility === value
                                  ? 'border-primary bg-muted shadow-sm'
                                  : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30',
                              )}
                            >
                              <span className={cn(
                                'flex items-center gap-2 text-sm font-medium',
                                visibility === value ? 'text-foreground' : 'text-muted-foreground',
                              )}>
                                <Icon className="size-3.5" />
                                {label}
                              </span>
                              <span className="text-xs text-muted-foreground">{desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Commit message */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="commit-message" className="text-sm font-medium">
                        Commit message
                        <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                      </Label>
                      <Textarea
                        id="commit-message"
                        placeholder={showNewRepoForm ? 'feat: initial build from Buildify' : 'feat: update from Buildify'}
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        className="bg-background/50 min-h-[72px] resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Actions */}
                    {pushError?.code !== 'branch_already_exists' && (
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => onOpenChange(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1 gap-2"
                          onClick={() => void handlePush()}
                          disabled={
                            pushMutation.isPending ||
                            !branchName.trim() ||
                            (showNewRepoForm && !repoName.trim()) ||
                            pushError?.code === 'repo_not_found' ||
                            pushError?.code === 'repo_archived' ||
                            pushError?.code === 'token_expired'
                          }
                        >
                          <Github className="size-4" />
                          {showNewRepoForm ? 'Create & Push' : 'Push'}
                        </Button>
                      </div>
                    )}

                    {/* Cancel only when branch_already_exists */}
                    {pushError?.code === 'branch_already_exists' && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => onOpenChange(false)}
                      >
                        Cancel
                      </Button>
                    )}

                    {/* Use a different repository link */}
                    {!inSetupMode && !replaceRepo && (
                      <button
                        type="button"
                        onClick={() => setShowReplaceWarning(true)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
                      >
                        Use a different repository
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}