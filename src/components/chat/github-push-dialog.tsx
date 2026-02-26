'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Github, GitBranch, Lock, Globe, ExternalLink, Loader2 } from 'lucide-react'
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

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setRepoName('')
      setBranchName(isFirstPush ? 'main' : `update-${Date.now()}`)
      setVisibility('public')
      setCommitMessage('')
    }
  }, [open, isFirstPush])

  const handlePush = async () => {
    if (!branchName.trim()) {
      toast.error('Branch name is required')
      return
    }

    if (isFirstPush && !repoName.trim()) {
      toast.error('Repository name is required')
      return
    }

    try {
      const result = await pushMutation.mutateAsync({
        chatId,
        branchName: branchName.trim(),
        commitMessage: commitMessage.trim() || undefined,
        ...(isFirstPush && {
          repoName: repoName.trim(),
          visibility,
        }),
      })

      toast.success(
        result.isNewRepo
          ? `Repository created and code pushed to ${result.branchName}!`
          : `Code pushed to ${result.branchName}!`,
        {
          action: {
            label: 'View on GitHub',
            onClick: () => window.open(result.repoUrl, '_blank'),
          },
        },
      )

      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to push to GitHub')
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
            <p className="text-sm text-muted-foreground">
              Sign out and sign back in using GitHub to enable repository access.
            </p>
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
              : `Pushing a new branch to ${existingRepo?.repoFullName}`}
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

            {/* Repo name (first push only) */}
            {isFirstPush && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="repo-name">Repository name</Label>
                <Input
                  id="repo-name"
                  placeholder="my-buildify-app"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                  className="bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                  Only lowercase letters, numbers, and hyphens.
                </p>
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
                className="bg-background/50"
              />
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

            {/* Actions */}
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
                onClick={handlePush}
                disabled={
                  pushMutation.isPending ||
                  !branchName.trim() ||
                  (isFirstPush && !repoName.trim())
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}