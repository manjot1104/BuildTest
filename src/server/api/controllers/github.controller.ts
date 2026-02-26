'use server'

import { getSession } from '@/server/better-auth/server'
import {
  getGithubToken,
  getGithubConnectionStatus,
  getGithubUser,
  createGithubRepository,
  createGithubBranch,
  pushFilesToBranch,
} from '@/server/services/github.service'
import {
  createGithubRepo,
  getGithubRepoByChatId,
} from '@/server/db/queries'
import { getUserChat } from '@/server/db/queries'

// ============================================================================
// Types
// ============================================================================

interface ErrorResponse {
  error: string
  details?: string
  status?: number
}

interface GithubStatusResponse {
  connected: boolean
  hasRepoScope: boolean
  login?: string
}

interface PushResponse {
  success: boolean
  repoUrl: string
  commitSha: string
  commitUrl: string
  branchName: string
  isNewRepo: boolean
}

interface GithubRepoInfo {
  id: string
  repoName: string
  repoFullName: string
  repoUrl: string
  branchName: string
  visibility: string
  lastCommitSha: string | null
  createdAt: string
}

// ============================================================================
// Helpers
// ============================================================================

async function getFilesForChat(chatId: string) {
  const { getV0Client } = await import('@/lib/v0-client')
  const v0 = await getV0Client()
  const chatDetails = await v0.chats.getById({ chatId })

  if (chatDetails instanceof ReadableStream) {
    throw new Error('Unexpected streaming response')
  }

  const files = chatDetails.latestVersion?.files?.map((f) => ({
    name: f.name,
    content: f.content,
  }))

  if (!files || files.length === 0) {
    throw new Error('No files found in this chat to push.')
  }

  return files
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET /api/github/status
 * Returns whether the current user has GitHub connected and repo scope.
 */
export async function getGithubStatusHandler(): Promise<
  GithubStatusResponse | ErrorResponse
> {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

    return await getGithubConnectionStatus(session.user.id)
  } catch (error) {
    console.error('Error getting GitHub status:', error)
    return {
      error: 'Failed to get GitHub status',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }
  }
}

/**
 * GET /api/github/repo/:chatId
 * Returns the latest saved github repo record for a chat (if any).
 * Used by the UI to determine if this is a first push or a follow-up.
 */
export async function getGithubRepoForChatHandler({
  params,
}: {
  params: { chatId: string }
}): Promise<GithubRepoInfo | null | ErrorResponse> {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

    const userChat = await getUserChat({ v0ChatId: params.chatId })
    if (!userChat) return null

    const repo = await getGithubRepoByChatId({ chatId: userChat.id })
    if (!repo) return null

    return {
      id: repo.id,
      repoName: repo.repo_name,
      repoFullName: repo.repo_full_name,
      repoUrl: repo.repo_url,
      branchName: repo.branch_name,
      visibility: repo.visibility,
      lastCommitSha: repo.last_commit_sha,
      createdAt: repo.created_at.toISOString(),
    }
  } catch (error) {
    console.error('Error getting GitHub repo for chat:', error)
    return {
      error: 'Failed to get GitHub repo',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }
  }
}

/**
 * POST /api/github/push
 *
 * Handles both cases:
 *
 * Case 1 — First push (no existing repo for this chat):
 *   Body: { chatId, repoName, branchName, visibility, commitMessage? }
 *   → Creates repo, creates branch (if different from default), pushes files
 *
 * Case 2 — Follow-up push (repo already exists for this chat):
 *   Body: { chatId, branchName, commitMessage? }
 *   → Skips repo creation, creates new branch in existing repo, pushes files
 */
export async function pushToGithubHandler({
  body,
}: {
  body: {
    chatId: string
    branchName: string
    commitMessage?: string
    // Only required on first push:
    repoName?: string
    visibility?: 'public' | 'private'
  }
}): Promise<PushResponse | ErrorResponse> {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { error: 'Unauthorized', status: 401 }

    const { chatId, branchName, commitMessage } = body

    if (!chatId || !branchName) {
      return { error: 'chatId and branchName are required', status: 400 }
    }

    // Get GitHub token
    const token = await getGithubToken(session.user.id)
    if (!token) {
      return {
        error: 'GitHub account not connected. Please sign in with GitHub.',
        status: 403,
      }
    }

    // Get GitHub username
    const ghUser = await getGithubUser(token)
    if (!ghUser) {
      return {
        error: 'Failed to fetch GitHub user. Your token may have expired.',
        status: 403,
      }
    }

    // Verify chat ownership
    const userChat = await getUserChat({ v0ChatId: chatId })
    if (!userChat) return { error: 'Chat not found', status: 404 }
    if (userChat.user_id !== session.user.id) return { error: 'Forbidden', status: 403 }

    // Get generated files from v0
    let files: { name: string; content: string }[]
    try {
      files = await getFilesForChat(chatId)
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get files',
        status: 400,
      }
    }

    // Check if repo already exists for this chat
    const existingRepo = await getGithubRepoByChatId({ chatId: userChat.id })

    let repoName: string
    let repoFullName: string
    let repoUrl: string
    let githubRepoId: string
    let visibility: string
    let isNewRepo: boolean

    if (existingRepo) {
      // ── Case 2: Follow-up push — use existing repo, new branch ──
      repoName = existingRepo.repo_name
      repoFullName = existingRepo.repo_full_name
      repoUrl = existingRepo.repo_url
      githubRepoId = existingRepo.github_repo_id
      visibility = existingRepo.visibility
      isNewRepo = false

      // Create the new branch in the existing repo
      await createGithubBranch(token, {
        owner: ghUser.login,
        repo: repoName,
        branchName,
      })
    } else {
      // ── Case 1: First push — create repo + branch ──
      if (!body.repoName || !body.visibility) {
        return {
          error: 'repoName and visibility are required for the first push',
          status: 400,
        }
      }

      const repo = await createGithubRepository(token, {
        name: body.repoName,
        isPrivate: body.visibility === 'private',
        description: 'Built with Buildify',
      })

      repoName = repo.name
      repoFullName = repo.full_name
      repoUrl = repo.html_url
      githubRepoId = String(repo.id)
      visibility = body.visibility
      isNewRepo = true

      // Only create a separate branch if it differs from the default branch
      if (branchName !== repo.default_branch) {
        await createGithubBranch(token, {
          owner: ghUser.login,
          repo: repo.name,
          branchName,
        })
      }
    }

    // Push files to the branch
    const pushResult = await pushFilesToBranch(token, {
      owner: ghUser.login,
      repo: repoName,
      branchName,
      files,
      commitMessage: commitMessage ?? 'feat: build update from Buildify',
    })

    // Save push record to DB (one record per push)
    await createGithubRepo({
      chatId: userChat.id,
      userId: session.user.id,
      githubRepoId,
      repoName,
      repoFullName,
      repoUrl,
      branchName,
      visibility,
      lastCommitSha: pushResult.commitSha,
    })

    return {
      success: true,
      repoUrl,
      commitSha: pushResult.commitSha,
      commitUrl: pushResult.commitUrl,
      branchName,
      isNewRepo,
    }
  } catch (error) {
    console.error('Error in pushToGithubHandler:', error)
    return {
      error: 'Failed to push to GitHub',
      details: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }
  }
}