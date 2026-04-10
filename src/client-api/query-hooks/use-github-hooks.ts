import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ============================================================================
// Types
// ============================================================================

export interface GithubStatusResponse {
  connected: boolean
  hasRepoScope: boolean
  login?: string
}

export interface GithubRepoInfo {
  id: string
  repoName: string
  repoFullName: string
  repoUrl: string
  visibility: 'public' | 'private'
  createdAt: string
}

export interface PushToGithubRequest {
  chatId: string
  branchName: string
  commitMessage?: string
  confirmExistingBranch?: boolean // User explicitly confirmed pushing to an existing branch
  repoName?: string // Required on first push or when replaceRepo is true
  visibility?: 'public' | 'private'
  replaceRepo?: boolean // User explicitly confirmed replacing the active repo with a new one
}

export interface PushToGithubResponse {
  success: boolean
  repoUrl: string
  commitSha: string
  commitUrl: string
  branchName: string
  isNewRepo: boolean
}

interface ApiErrorResponse {
  error: string
  code?: string
  details?: string
}

// Error class that carries the structured code from the API
export class GithubPushError extends Error {
  code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'GithubPushError'
    this.code = code
  }
}

// ============================================================================
// Source Validation Types
// ============================================================================

/**
 * Typed state for the live repo+branch validation hook.
 *
 *   idle        — nothing to validate yet (inputs empty)
 *   validating  — debounce has fired, request in flight
 *   valid       — repo and branch both confirmed accessible
 *   invalid     — validation failed with a specific reason code
 */
export type GithubSourceValidationState =
  | { status: 'idle' }
  | { status: 'validating' }
  | { status: 'valid';   defaultBranch: string }
  | { status: 'invalid'; error: string; code: 'repo_not_found' | 'branch_not_found' | 'no_github_account' | 'error' }

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Returns whether the current user has GitHub connected with repo scope.
 * Only fetches when enabled (dialog is open). Retries disabled since
 * connection status is user-action-dependent, not transient.
 */
export function useGithubStatus(enabled = true) {
  return useQuery({
    queryKey: ['github-status'],
    queryFn: async (): Promise<GithubStatusResponse> => {
      const response = await fetch('/api/github/status')
      const result = (await response.json()) as GithubStatusResponse | ApiErrorResponse

      if (!response.ok || 'error' in result) {
        throw new Error('error' in result ? result.error : 'Failed to get GitHub status')
      }

      return result
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  })
}

/**
 * Returns the active GitHub repo for a chat, or null if none exists.
 * Invalidated after every successful push.
 */
export function useGithubRepoForChat(chatId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['github-repo', chatId],
    queryFn: async (): Promise<GithubRepoInfo | null> => {
      const response = await fetch(`/api/github/repo/${chatId}`)

      if (response.status === 404) return null

      const result = (await response.json()) as GithubRepoInfo | ApiErrorResponse | null

      if (!response.ok || (result && 'error' in result)) {
        throw new Error(result && 'error' in result ? result.error : 'Failed to get repo info')
      }

      return result as GithubRepoInfo | null
    },
    enabled: enabled && !!chatId,
    staleTime: 1000 * 30, // 30 seconds
    retry: false,
  })
}

/**
 * Debounced live validation of a GitHub repo + branch combination.
 * Used by GithubSourcePanel in the test run form.
 *
 * Guards applied before any API call fires:
 *   1. githubConnected must be true — email-only users never trigger a request
 *   2. owner + repo must be non-empty (typed as "owner/repo" in the UI)
 *   3. branch must be non-empty
 *   4. 600ms debounce — no request while the user is still typing
 *
 * Returns GithubSourceValidationState so the UI can show per-field errors.
 */
export function useGithubSourceValidation({
  owner,
  repo,
  branch,
  githubConnected,
  enabled,
}: {
  owner:           string
  repo:            string
  branch:          string
  githubConnected: boolean  // from useGithubStatus()
  enabled:         boolean  // panel is expanded and user has entered something
}): GithubSourceValidationState {
  const [state, setState] = useState<GithubSourceValidationState>({ status: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear any pending debounce / in-flight request
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()

    // Guard: panel not enabled or inputs empty
    if (!enabled || !owner.trim() || !repo.trim() || !branch.trim()) {
      setState({ status: 'idle' })
      return
    }

    // Guard: no GitHub account — skip the request, return a clear error immediately
    if (!githubConnected) {
      setState({
        status: 'invalid',
        error:  'Your account is not connected to GitHub.',
        code:   'no_github_account',
      })
      return
    }

    setState({ status: 'validating' })

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const params = new URLSearchParams({ owner, repo, branch })
        const res = await fetch(`/api/github/validate?${params.toString()}`, {
          signal: controller.signal,
        })

        if (controller.signal.aborted) return

        const data = (await res.json()) as {
          valid:           boolean
          defaultBranch?:  string
          error?:          'repo_not_found' | 'branch_not_found' | 'no_github_account' | 'error'
          message?:        string
        }

        if (data.valid) {
          setState({ status: 'valid', defaultBranch: data.defaultBranch ?? branch })
        } else {
          setState({
            status: 'invalid',
            error:  data.message ?? 'Validation failed',
            code:   data.error   ?? 'error',
          })
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setState({ status: 'invalid', error: 'Could not reach GitHub.', code: 'error' })
      }
    }, 600) // 600ms debounce — consistent with the push dialog UX

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      abortRef.current?.abort()
    }
  }, [owner, repo, branch, githubConnected, enabled])

  return state
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Mutation hook for pushing code to GitHub.
 *
 * Handles three cases (all via the same endpoint):
 *   - First push: pass repoName + visibility
 *   - Follow-up push to active repo: just chatId + branchName
 *   - Replace active repo: pass repoName + visibility + replaceRepo: true
 *
 * Throws GithubPushError with a `code` field so the UI can react to specific cases.
 */
export function usePushToGithub(chatId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: PushToGithubRequest): Promise<PushToGithubResponse> => {
      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = (await response.json()) as PushToGithubResponse | ApiErrorResponse

      if (!response.ok || 'error' in result) {
        const err = result as ApiErrorResponse
        throw new GithubPushError(
          err.error ?? 'Failed to push to GitHub',
          err.code,
        )
      }

      return result as PushToGithubResponse
    },
    onSuccess: async () => {
      // Refresh the repo info for this chat
      await queryClient.invalidateQueries({ queryKey: ['github-repo', chatId] })
    },
  })
}
