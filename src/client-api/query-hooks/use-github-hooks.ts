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

// NEW: Represents one repo from the user's GitHub account (for the picker)
export interface GithubRepoListItem {
  id: number
  name: string
  fullName: string
  htmlUrl: string
  private: boolean
  description: string | null
  defaultBranch: string
  updatedAt: string
}

// NEW: Response from POST /api/github/connect
export interface ConnectRepoResponse {
  success: boolean
  repoFullName: string
  repoUrl: string
  defaultBranch: string
  visibility: 'public' | 'private'
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
// PR Types
// ============================================================================

export type MergeableStatus =
  | 'mergeable'
  | 'conflicting'
  | 'blocked'
  | 'behind'
  | 'unstable'
  | 'draft'
  | 'unknown'

export type MergeMethod = 'merge' | 'squash' | 'rebase'

export interface NormalisedPR {
  number: number
  nodeId: string
  title: string
  body: string | null
  state: 'open' | 'closed' | 'merged'
  draft: boolean
  mergeableStatus: MergeableStatus
  prUrl: string
  headBranch: string
  baseBranch: string
  createdAt: string
  updatedAt: string
  author: { login: string; avatarUrl: string }
}

export interface BranchListItem {
  name: string
  protected: boolean
}

export interface CreatePRRequest {
  chatId: string
  title: string
  head: string
  base: string
  body?: string
}

export interface MergePRRequest {
  chatId: string
  prNumber: number
  mergeMethod: MergeMethod
  commitTitle?: string
}

export interface MergeResponse {
  success: boolean
  message: string
  sha: string
}

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
 * Invalidated after every successful push or connect.
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
 * NEW: Returns all GitHub repos the current user has access to.
 * Only fetches when enabled — triggered when the user opens the "Use existing" tab.
 * Includes own repos, collaborator repos, and org repos (affiliation set server-side).
 */
export function useGithubRepos(enabled = false) {
  return useQuery({
    queryKey: ['github-repos'],
    queryFn: async (): Promise<GithubRepoListItem[]> => {
      const response = await fetch('/api/github/repos')
      const result = (await response.json()) as GithubRepoListItem[] | ApiErrorResponse

      if (!response.ok || ('error' in (result as ApiErrorResponse))) {
        throw new Error(
          'error' in (result as ApiErrorResponse)
            ? (result as ApiErrorResponse).error
            : 'Failed to list repos',
        )
      }

      return result as GithubRepoListItem[]
    },
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: false,
  })
}

// ============================================================================
// PR Query Hooks
// ============================================================================

/**
 * Returns all branches for the active repo linked to a chat.
 * Used to populate head/base branch selectors in the PR creation form.
 * Only fetches when the PR creation panel is open.
 */
export function useRepoBranches(chatId: string | undefined, enabled = false) {
  return useQuery({
    queryKey: ['github-branches', chatId],
    queryFn: async (): Promise<BranchListItem[]> => {
      const response = await fetch(`/api/github/branches/${chatId}`)
      const result = (await response.json()) as BranchListItem[] | ApiErrorResponse

      if (!response.ok || (!Array.isArray(result) && 'error' in result)) {
        throw new Error(
          !Array.isArray(result) && 'error' in result ? result.error : 'Failed to list branches',
        )
      }

      return result as BranchListItem[]
    },
    enabled: enabled && !!chatId,
    staleTime: 1000 * 60, // 1 minute — branches change less frequently
    retry: false,
  })
}

/**
 * Returns all open PRs for the active repo linked to a chat.
 * Fast path — all PRs have mergeableStatus: 'unknown'.
 * Use useDetailedPR for real mergeability of a specific PR.
 */
export function usePullRequests(chatId: string | undefined, enabled = false) {
  return useQuery({
    queryKey: ['github-prs', chatId],
    queryFn: async (): Promise<NormalisedPR[]> => {
      const response = await fetch(`/api/github/prs/${chatId}`)
      const result = (await response.json()) as NormalisedPR[] | ApiErrorResponse

      if (!response.ok || (!Array.isArray(result) && 'error' in result)) {
        throw new Error(
          !Array.isArray(result) && 'error' in result ? result.error : 'Failed to list pull requests',
        )
      }

      return result as NormalisedPR[]
    },
    enabled: enabled && !!chatId,
    staleTime: 1000 * 30, // 30 seconds
    retry: false,
  })
}

/**
 * Returns a single PR with full detail including real mergeability status.
 * Called lazily when the user expands/selects a PR.
 *
 * GitHub computes mergeability lazily — if mergeableStatus comes back as
 * 'unknown', the UI should show a spinner and retry after ~3 seconds.
 */
export function useDetailedPR(
  chatId: string | undefined,
  prNumber: number | null,
  enabled = false,
) {
  return useQuery({
    queryKey: ['github-pr', chatId, prNumber],
    queryFn: async (): Promise<NormalisedPR> => {
      const response = await fetch(`/api/github/pr/${chatId}/${prNumber}`)
      const result = (await response.json()) as NormalisedPR | ApiErrorResponse

      if (!response.ok || 'error' in result) {
        throw new Error('error' in result ? result.error : 'Failed to get pull request')
      }

      return result as NormalisedPR
    },
    enabled: enabled && !!chatId && prNumber !== null,
    staleTime: 0, // Always refetch — mergeability is ephemeral
    retry: false,
    // Retry automatically when mergeableStatus is still 'unknown' (GitHub lazy eval)
    refetchInterval: (query) => {
      const data = query.state.data
      if (data && data.mergeableStatus === 'unknown' && data.state === 'open') return 3000
      return false
    },
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * NEW: Mutation hook for Step 1 of the connect-existing-repo flow.
 *
 * Validates the repo is accessible, saves it as the active repo for the chat,
 * and invalidates the repo cache. Does NOT push any files.
 *
 * After this succeeds the dialog closes, and the user uses the normal Push
 * button to push — which now runs as a follow-up push against the connected repo.
 */
export function useConnectExistingRepo(chatId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      chatId: string
      repoFullName: string
    }): Promise<ConnectRepoResponse> => {
      const response = await fetch('/api/github/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = (await response.json()) as ConnectRepoResponse | ApiErrorResponse

      if (!response.ok || 'error' in result) {
        const err = result as ApiErrorResponse
        throw new GithubPushError(
          err.error ?? 'Failed to connect repository',
          err.code,
        )
      }

      return result as ConnectRepoResponse
    },
    onSuccess: async () => {
      // Refresh the active repo info for this chat
      await queryClient.invalidateQueries({ queryKey: ['github-repo', chatId] })
    },
  })
}

/**
 * Mutation hook for pushing code to GitHub.
 *
 * Handles three cases (all via the same endpoint):
 *   - First push: pass repoName + visibility
 *   - Follow-up push to active repo: just chatId + branchName
 *     (this now also covers repos connected via useConnectExistingRepo)
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

// ============================================================================
// PR Mutation Hooks
// ============================================================================

/**
 * Mutation hook for creating a new pull request.
 * Invalidates the PR list on success so the new PR appears immediately.
 */
export function useCreatePullRequest(chatId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePRRequest): Promise<NormalisedPR> => {
      const response = await fetch('/api/github/pr/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = (await response.json()) as NormalisedPR | ApiErrorResponse

      if (!response.ok || 'error' in result) {
        const err = result as ApiErrorResponse
        throw new GithubPushError(err.error ?? 'Failed to create pull request', err.code)
      }

      return result as NormalisedPR
    },
    onSuccess: async () => {
      // Refresh the PR list so the new PR appears immediately
      await queryClient.invalidateQueries({ queryKey: ['github-prs', chatId] })
    },
  })
}

/**
 * Mutation hook for merging a pull request.
 * Invalidates both the PR list and the specific PR detail on success.
 */
export function useMergePullRequest(chatId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: MergePRRequest): Promise<MergeResponse> => {
      const response = await fetch('/api/github/pr/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = (await response.json()) as MergeResponse | ApiErrorResponse

      if (!response.ok || 'error' in result) {
        const err = result as ApiErrorResponse
        throw new GithubPushError(err.error ?? 'Failed to merge pull request', err.code)
      }

      return result as MergeResponse
    },
    onSuccess: async (_data, variables) => {
      // Refresh both the list and the specific PR detail
      await queryClient.invalidateQueries({ queryKey: ['github-prs', chatId] })
      await queryClient.invalidateQueries({
        queryKey: ['github-pr', chatId, variables.prNumber],
      })
    },
  })
}