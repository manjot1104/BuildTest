'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Github,
  GitBranch,
  Lock,
  Globe,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Info,
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
import {
  useGithubStatus,
  useGithubRepoForChat,
  usePushToGithub,
} from '@/client-api/query-hooks/use-github-hooks'

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
  const styles = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-200',
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200',
  }

  return (
    <div className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm ${styles[variant]}`}>
      <AlertTriangle className="size-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p>{message}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-1 font-medium underline underline-offset-2 hover:no-underline"
          >
            {action.label}
          </button>
        )}
      </div>
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

  // Error state — structured so UI can react to specific codes
  const [pushError, setPushError] = useState<PushError | null>(null)
  // When true, user confirmed they want to push to an existing branch
  const [confirmExistingBranch, setConfirmExistingBranch] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setRepoName('')
      setBranchName(isFirstPush ? 'main' : `update-${Date.now()}`)
      setVisibility('public')
      setCommitMessage('')
      setPushError(null)
      setConfirmExistingBranch(false)
    }
  }, [open, isFirstPush])

  // Clear error when branch name changes
  useEffect(() => {
    if (pushError?.code === 'branch_already_exists' || pushError?.code === 'repo_name_taken') {
      setPushError(null)
      setConfirmExistingBranch(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchName, repoName])

  const handlePush = async (overrideConfirm = false) => {
    setPushError(null)

    if (!branchName.trim()) {
      setPushError({ message: 'Branch name is required.' })
      return
    }
    if (isFirstPush && !repoName.trim()) {
      setPushError({ message: 'Repository name is required.' })
      return
    }

    try {
      const result = await pushMutation.mutateAsync({
        chatId,
        branchName: branchName.trim(),
        commitMessage: commitMessage.trim() || undefined,
        confirmExistingBranch: overrideConfirm || confirmExistingBranch,
        ...(isFirstPush && {
          repoName: repoName.trim(),
          visibility,
        }),
      })

      toast.success(
        result.isNewRepo
          ? `Repository created and code pushed to "${result.branchName}"!`
          : `Code pushed to "${result.branchName}"!`,
        {
          action: {
            label: 'View on GitHub',
            onClick: () => window.open(result.repoUrl, '_blank'),
          },
        },
      )

      onOpenChange(false)
    } catch (error) {
      const raw = error as { message?: string; code?: ErrorCode }
      const code = raw?.code
      const message = raw?.message ?? 'Failed to push to GitHub'

      setPushError({ message, code })
    }
  }

  // ── Not connected state ──
  if (!isLoading && (!githubStatus?.connected || !githubStatus?.hasRepoScope)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="size-5" />
              Connect GitHub
            </DialogTitle>
            <DialogDescription>
              You need to sign in with GitHub to push your code.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <InlineAlert
              variant="info"
              message="Sign out and sign back in using the GitHub option to enable repository access."
            />
            <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="size-5" />
            {isFirstPush ? 'Push to GitHub' : 'Push Update to GitHub'}
          </DialogTitle>
          <DialogDescription>
            {isFirstPush
              ? 'Create a new repository and push your generated code.'
              : `Push a new branch to ${existingRepo?.repoFullName}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-2">

            {/* Existing repo info (follow-up push) */}
            {!isFirstPush && existingRepo && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                <Github className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{existingRepo.repoFullName}</span>
                <a
                  href={existingRepo.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto shrink-0"
                >
                  <ExternalLink className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                </a>
              </div>
            )}

            {/* Repo not found error — repo was deleted */}
            {pushError?.code === 'repo_not_found' && (
              <InlineAlert variant="error" message={pushError.message} />
            )}

            {/* Repo archived */}
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

            {/* Token expired */}
            {pushError?.code === 'token_expired' && (
              <InlineAlert
                variant="error"
                message="Your GitHub session has expired. Please sign out and sign back in with GitHub."
              />
            )}

            {/* No files */}
            {pushError?.code === 'no_files' && (
              <InlineAlert
                variant="warning"
                message="No generated files found for this chat. Build something first, then push."
              />
            )}

            {/* Generic error (not one of the specific codes) */}
            {pushError && !pushError.code && (
              <InlineAlert variant="error" message={pushError.message} />
            )}

            {/* Repo name (first push only) */}
            {isFirstPush && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="repo-name">Repository name</Label>
                <Input
                  id="repo-name"
                  placeholder="my-buildify-app"
                  value={repoName}
                  onChange={(e) =>
                    setRepoName(e.target.value.replace(/\s+/g, '-').toLowerCase())
                  }
                  className={`bg-background/50 ${pushError?.code === 'repo_name_taken' ? 'border-red-500' : ''}`}
                />
                {pushError?.code === 'repo_name_taken' ? (
                  <p className="text-xs text-red-500">{pushError.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Only lowercase letters, numbers, and hyphens.
                  </p>
                )}
              </div>
            )}

            {/* Branch name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="branch-name" className="flex items-center gap-1.5">
                <GitBranch className="size-3.5" />
                Branch name
              </Label>
              <Input
                id="branch-name"
                placeholder="main"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value.replace(/\s+/g, '-'))}
                className={`bg-background/50 ${pushError?.code === 'branch_already_exists' ? 'border-yellow-500' : ''}`}
              />

              {/* Branch already exists — inline confirm */}
              {pushError?.code === 'branch_already_exists' && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-800 px-3 py-2.5 text-sm text-yellow-800 dark:text-yellow-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="size-4 mt-0.5 shrink-0" />
                    <div>
                      <p>
                        Branch <strong>{branchName}</strong> already exists. Pushing will add a new
                        commit to it.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmExistingBranch(true)
                            void handlePush(true)
                          }}
                          className="font-medium underline underline-offset-2 hover:no-underline"
                        >
                          Push anyway
                        </button>
                        <span className="text-yellow-600 dark:text-yellow-400">·</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPushError(null)
                            setBranchName('')
                          }}
                          className="font-medium underline underline-offset-2 hover:no-underline"
                        >
                          Use a different branch
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Visibility (first push only) */}
            {isFirstPush && (
              <div className="flex flex-col gap-1.5">
                <Label>Visibility</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      visibility === 'public'
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Globe className="size-4" />
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                      visibility === 'private'
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Lock className="size-4" />
                    Private
                  </button>
                </div>
              </div>
            )}

            {/* Commit message */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commit-message">
                Commit message{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="commit-message"
                placeholder="feat: initial build from Buildify"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="bg-background/50"
              />
            </div>

            {/* Actions — hide push button when branch_already_exists (inline confirm handles it) */}
            {pushError?.code !== 'branch_already_exists' && (
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={pushMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => void handlePush()}
                  disabled={
                    pushMutation.isPending ||
                    !branchName.trim() ||
                    (isFirstPush && !repoName.trim()) ||
                    pushError?.code === 'repo_not_found' ||
                    pushError?.code === 'repo_archived' ||
                    pushError?.code === 'token_expired'
                  }
                >
                  {pushMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Pushing…
                    </>
                  ) : (
                    <>
                      <Github className="size-4" />
                      {isFirstPush ? 'Create & Push' : 'Push to Branch'}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Cancel only when branch_already_exists */}
            {pushError?.code === 'branch_already_exists' && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onOpenChange(false)}
                disabled={pushMutation.isPending}
              >
                Cancel
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}