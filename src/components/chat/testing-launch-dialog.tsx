'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FlaskConical,
  Github,
  Globe,
  GitBranch,
  ExternalLink,
  Loader2,
  ArrowRight,
  LogOut,
  Info,
  CheckCircle2,
  Link2,
  Link2Off,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  useGithubStatus,
  useGithubRepoForChat,
} from '@/client-api/query-hooks/use-github-hooks'
import { authClient } from '@/server/better-auth/client'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

// ============================================================================
// Types
// ============================================================================

interface TestingLaunchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: string
  /** The live demo URL of the project (used as the test target URL) */
  demoUrl?: string
}

// ============================================================================
// StepRow — visual "you are here" indicator, same design language as the
// push-progress stepper in GithubPushDialog
// ============================================================================

function StepRow({
  number,
  label,
  description,
  status,
}: {
  number: number
  label: string
  description: React.ReactNode
  status: 'done' | 'active' | 'upcoming'
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'flex items-center justify-center size-5 rounded-full shrink-0 text-[10px] font-bold mt-0.5 transition-colors',
          status === 'done'    && 'bg-emerald-500 text-white',
          status === 'active'  && 'bg-primary text-primary-foreground',
          status === 'upcoming' && 'border-2 border-muted-foreground/30 text-muted-foreground',
        )}
      >
        {status === 'done' ? <CheckCircle2 className="size-3" /> : number}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium leading-none mb-1', status === 'upcoming' ? 'text-muted-foreground' : 'text-foreground')}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Main component
// ============================================================================

export function TestingLaunchDialog({
  open,
  onOpenChange,
  chatId,
  demoUrl,
}: TestingLaunchDialogProps) {
  const router = useRouter()
  const { data: githubStatus, isLoading: isLoadingStatus } = useGithubStatus()
  const { data: existingRepo, isLoading: isLoadingRepo } = useGithubRepoForChat(chatId)

  const isLoading = isLoadingStatus || isLoadingRepo
  const isGithubConnected =
    githubStatus?.connected === true && githubStatus?.hasRepoScope === true
  const needsRepoScope = githubStatus?.connected && !githubStatus?.hasRepoScope
  const hasRepo = !!existingRepo?.repoFullName

  // Whether to pass repo params to the testing page.
  // Defaults to true when a repo is available, false otherwise.
  const [includeSource, setIncludeSource] = useState(false)

  // Re-evaluate the default whenever the dialog opens or the repo state changes
  useEffect(() => {
    if (open) {
      setIncludeSource(isGithubConnected && hasRepo)
    }
  }, [open, isGithubConnected, hasRepo])

  const handleLaunch = useCallback(() => {
    const params = new URLSearchParams()

    if (demoUrl) params.set('url', demoUrl)

    // Only pass repo params if the user opted in AND the data is present
    if (includeSource && isGithubConnected && hasRepo && existingRepo) {
      const [owner, repo] = existingRepo.repoFullName.split('/')
      if (owner) params.set('owner', owner)
      if (repo)  params.set('repo', repo)
      // Branch: default to "main" — extend if existingRepo gains a branch field
      params.set('branch', 'main')
    }

    onOpenChange(false)
    router.push(`/testing?${params.toString()}`)
  }, [demoUrl, includeSource, isGithubConnected, hasRepo, existingRepo, onOpenChange, router])

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="size-5" />
              Run Tests
            </DialogTitle>
            <DialogDescription>Setting up your test run…</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-6">
            <div className="space-y-3">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-10 bg-muted animate-pulse rounded-lg" />
            </div>
            <div className="h-9 bg-muted animate-pulse rounded-md" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Not connected to GitHub (or missing repo scope) ──
  // Exact same pattern as GithubPushDialog's "Connect GitHub" screen.
  // User can still run URL-only tests without connecting.
  if (!isGithubConnected) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="size-5" />
              Run Tests
            </DialogTitle>
            <DialogDescription>
              Launch automated tests on your app.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">

            {/* Step overview */}
            <div className="space-y-3 py-1">
              <StepRow
                number={1}
                label="Test target"
                description={
                  demoUrl
                    ? `Will crawl ${demoUrl.replace(/^https?:\/\//, '')}`
                    : 'No demo URL yet — you can enter one on the testing page.'
                }
                status="done"
              />
              <StepRow
                number={2}
                label="Source code analysis"
                description="Connect GitHub to include route and schema analysis for more precise tests."
                status="upcoming"
              />
            </div>

            {/* GitHub connect nudge — mirrors GithubPushDialog's dashed card */}
            <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-5 text-center space-y-3">
              <div className="mx-auto flex items-center justify-center size-12 rounded-full bg-muted">
                <Github className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {needsRepoScope
                  ? 'Sign out and sign back in with GitHub to grant repository write access.'
                  : 'Connect your GitHub account so the AI can read your source code for richer test cases.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  void authClient.signOut().then(() => {
                    window.location.href = '/login'
                  })
                }}
              >
                <LogOut className="size-3.5" />
                {needsRepoScope ? 'Reconnect GitHub' : 'Sign in with GitHub'}
              </Button>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {/* Still let them run URL-only tests */}
              <Button
                className="flex-1 gap-2"
                onClick={handleLaunch}
                disabled={!demoUrl}
              >
                <FlaskConical className="size-4" />
                Run without source
                <ArrowRight className="size-3" />
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── GitHub connected but no repo linked yet ──
  // Same pattern as the "no files" warning in GithubPushDialog.
  // Points the user to the GitHub push button without blocking them.
  if (isGithubConnected && !hasRepo) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical className="size-5" />
              Run Tests
            </DialogTitle>
            <DialogDescription>
              Launch automated tests on your app.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">

            {/* Connected user — same pill as GithubPushDialog */}
            {githubStatus?.login && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
                <div className="relative">
                  <Github className="size-3.5" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full bg-emerald-500" />
                </div>
                <span>Connected as <span className="font-medium text-foreground">@{githubStatus.login}</span></span>
              </div>
            )}

            {/* Step overview */}
            <div className="space-y-3 py-1">
              <StepRow
                number={1}
                label="Test target"
                description={
                  demoUrl
                    ? `Will crawl ${demoUrl.replace(/^https?:\/\//, '')}`
                    : 'No demo URL yet — you can enter one on the testing page.'
                }
                status="done"
              />
              <StepRow
                number={2}
                label="Source code analysis"
                description={
                  <>Push your code to GitHub first using the{' '}
                  <span className="inline-flex items-center gap-0.5 font-medium"><Github className="size-3" /> GitHub</span>{' '}
                  button, then come back here.</>
                }
                status="upcoming"
              />
            </div>

            {/* Info nudge pointing to GitHub push button */}
            <div className="flex items-start gap-2.5 rounded-lg border border-blue-200/80 bg-blue-50/80 dark:bg-blue-950/30 dark:border-blue-800/60 px-3.5 py-3 text-sm text-blue-900 dark:text-blue-100 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <Info className="size-4 mt-0.5 shrink-0 text-blue-500 dark:text-blue-400" />
              <p className="leading-relaxed">
                No repository linked yet. Use the{' '}
                <span className="inline-flex items-center gap-1 font-medium">
                  <Github className="size-3" /> GitHub
                </span>{' '}
                button to push your code first, then source analysis will be available.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleLaunch}
                disabled={!demoUrl}
              >
                <FlaskConical className="size-4" />
                Run without source
                <ArrowRight className="size-3" />
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // ── Full experience: GitHub connected + repo linked ──
  // Shows both URL and repo, with a toggleable source inclusion card.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-5" />
            Run Tests
          </DialogTitle>
          <DialogDescription>
            Review what will be tested, then launch.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-1">

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

          {/* Step 1 — Target URL */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span className="flex items-center justify-center size-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold shrink-0">1</span>
              Test target
            </p>
            {demoUrl ? (
              <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
                <Globe className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-mono truncate flex-1">{demoUrl.replace(/^https?:\/\//, '')}</span>
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-muted-foreground/30 px-3.5 py-2.5">
                <Globe className="size-4 text-muted-foreground/50 shrink-0" />
                <span className="text-sm text-muted-foreground">No demo URL yet — you can enter one on the testing page.</span>
              </div>
            )}
          </div>

          {/* Step 2 — Source code (user-toggleable) */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span className={cn(
                'flex items-center justify-center size-4 rounded-full text-[9px] font-bold shrink-0 transition-colors',
                includeSource
                  ? 'bg-emerald-500 text-white'
                  : 'border-2 border-muted-foreground/30 text-muted-foreground',
              )}>
                {includeSource ? <CheckCircle2 className="size-3" /> : 2}
              </span>
              Source code analysis
              <span className="normal-case text-[10px] font-normal text-muted-foreground/60 ml-0.5">optional</span>
            </p>

            {/* Repo card — click to toggle inclusion */}
            <button
              type="button"
              onClick={() => setIncludeSource(v => !v)}
              className={cn(
                'w-full flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left transition-all duration-150',
                includeSource
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                  : 'border-border bg-muted/20 hover:bg-muted/40',
              )}
            >
              <Github className={cn('size-4 shrink-0 transition-colors', includeSource ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')} />
              <div className="flex-1 min-w-0">
                <span className={cn('text-sm font-medium truncate block', includeSource ? 'text-foreground' : 'text-muted-foreground')}>
                  {existingRepo!.repoFullName}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <GitBranch className="size-3 shrink-0" />
                  main
                  {existingRepo?.repoUrl && (
                    <>
                      <span className="text-muted-foreground/40 mx-1">·</span>
                      <a
                        href={existingRepo.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors inline-flex items-center gap-0.5"
                        onClick={e => e.stopPropagation()}
                      >
                        View <ExternalLink className="size-2.5" />
                      </a>
                    </>
                  )}
                </span>
              </div>
              {/* Included / Excluded badge */}
              <div className={cn(
                'shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-all',
                includeSource
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground',
              )}>
                {includeSource
                  ? <><Link2 className="size-3" /> Included</>
                  : <><Link2Off className="size-3" /> Excluded</>
                }
              </div>
            </button>

            <p className="text-[11px] text-muted-foreground/70 px-0.5">
              {includeSource
                ? 'AI will read your routes, schemas, and validation rules to write more precise test cases.'
                : 'Toggle the card above to include source code analysis in this run.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleLaunch}
              disabled={!demoUrl}
            >
              <FlaskConical className="size-4" />
              {includeSource ? 'Run with source' : 'Run tests'}
              <ArrowRight className="size-3" />
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}