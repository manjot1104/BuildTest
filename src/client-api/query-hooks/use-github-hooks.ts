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
  branchName: string
  visibility: string
  lastCommitSha: string | null
  createdAt: string
}

export interface PushToGithubRequest {
  chatId: string
  branchName: string
  commitMessage?: string
  confirmExistingBranch?: boolean
  // Only required on first push:
  repoName?: string
  visibility?: 'public' | 'private'
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
// Query Hooks
// ============================================================================

/**
 * Returns whether the current user has GitHub connected with repo scope.
 */
export function useGithubStatus() {
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Returns the latest github repo record for a chat (null if never pushed).
 */
export function useGithubRepoForChat(chatId: string | undefined) {
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
    enabled: !!chatId,
    staleTime: 1000 * 30, // 30 seconds
  })
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Mutation hook for pushing code to GitHub.
 * Handles both first push (creates repo) and follow-up pushes (new branch).
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