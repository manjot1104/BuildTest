'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

type ErrorCode =
  | 'branch_already_exists'
  | 'repo_not_found'
  | 'repo_archived'
  | 'repo_name_taken'
  | 'github_not_connected'
  | 'token_expired'
  | 'no_files'
  | 'unauthorized'

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
// Component
// ============================================================================

export function GithubPushDialog({ open, onOpenChange, chatId }: GithubPushDialogProps) {
  const { data: githubStatus, isLoading: isLoadingStatus } = useGithubStatus()
  const { data: existingRepo, isLoading: isLoadingRepo } = useGithubRepoForChat(chatId)
  const pushMutation = usePushToGithub(chatId)

  const isFirstPush = !existingRepo
  const isLoading = isLoadingStatus || isLoadingRepo

  // Form state
  const [repoName, setRepoName] = useState('')
  const [branchName, setBranchName] = useState('main')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [commitMessage, setCommitMessage] = useState('')

  // Replace repo flow
  const [showReplaceWarning, setShowReplaceWarning] = useState(false)
  const [replaceRepo, setReplaceRepo] = useState(false)

  // Error state
  const [pushError, setPushError] = useState<PushError | null>(null)

  // Branch confirmation
  const [confirmExistingBranch, setConfirmExistingBranch] = useState(false)

  // Success state — show before closing
  const [successData, setSuccessData] = useState<{
    repoUrl: string
    branchName: string
    isNewRepo: boolean
  } | null>(null)

  // Refs
  const repoNameRef = useRef<HTMLInputElement>(null)
  const branchNameRef = useRef<HTMLInputElement>(null)

  // Derived
  const showNewRepoForm = isFirstPush || replaceRepo

  // Reset everything when dialog opens
  useEffect(() => {
    if (open) {
      setRepoName('')
      const today = new Date().toISOString().slice(0, 10)
      setBranchName(isFirstPush ? 'main' : `update-${today}`)
      setVisibility('public')
      setCommitMessage('')
      setPushError(null)
      setConfirmExistingBranch(false)
      setShowReplaceWarning(false)
      setReplaceRepo(false)
      setSuccessData(null)
    }
  }, [open, isFirstPush])

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
    if (e.key === 'Enter' && !e.shiftKey && !pushMutation.isPending) {
      // Don't submit from textarea
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
      e.preventDefault()
      void handlePush()
    }
  }, [handlePush, pushMutation.isPending])

  // Block close during push
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (pushMutation.isPending) return
    onOpenChange(nextOpen)
  }, [pushMutation.isPending, onOpenChange])

  // ── Success state ──
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
                  setBranchName('main')
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
        onInteractOutside={(e) => { if (pushMutation.isPending) e.preventDefault() }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="size-5" />
            {showNewRepoForm && replaceRepo
              ? 'Create New Repository'
              : isFirstPush
                ? 'Push to GitHub'
                : 'Push Update'}
          </DialogTitle>
          <DialogDescription>
            {showNewRepoForm && replaceRepo
              ? 'Create a new repository and link it to this chat.'
              : isFirstPush
                ? 'Create a new repository and push your generated code.'
                : `Push a new update to ${existingRepo?.repoFullName}`}
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
                <span>Pushing as <span className="font-medium text-foreground">@{githubStatus.login}</span></span>
              </div>
            )}
            <PushProgress isNewRepo={showNewRepoForm} />
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-1" onKeyDown={handleKeyDown}>

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

            {/* Existing repo info (follow-up push) */}
            {!isFirstPush && !replaceRepo && existingRepo && (
              <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 transition-colors">
                <Github className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{existingRepo.repoFullName}</span>
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
              </div>
            )}

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
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20 shadow-sm'
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
            {!isFirstPush && !replaceRepo && (
              <button
                type="button"
                onClick={() => setShowReplaceWarning(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Use a different repository
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
