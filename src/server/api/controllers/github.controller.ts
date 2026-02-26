'use server'

import { getSession } from '@/server/better-auth/server'
import {
  getGithubToken,
  getGithubConnectionStatus,
  getGithubUser,
  createGithubRepository,
  createGithubBranch,
  pushFilesToBranch,
  checkRepoStatus,
  checkBranchExists,
  checkRepoNameTaken,
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
  // Structured error codes the UI can react to specifically
  code?:
    | 'branch_already_exists'
    | 'repo_not_found'
    | 'repo_archived'
    | 'repo_name_taken'
    | 'github_not_connected'
    | 'token_expired'
    | 'no_files'
    | 'unauthorized'
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
    if (!session?.user?.id) return { error: 'Unauthorized', code: 'unauthorized', status: 401 }
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
    if (!session?.user?.id) return { error: 'Unauthorized', code: 'unauthorized', status: 401 }

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
 * Case 1 — First push: { chatId, repoName, branchName, visibility, commitMessage? }
 * Case 2 — Follow-up push: { chatId, branchName, commitMessage?, confirmExistingBranch? }
 *
 * Error codes returned to UI:
 * - branch_already_exists  → UI asks user to confirm or rename
 * - repo_not_found         → existing repo was deleted on GitHub
 * - repo_name_taken        → chosen repo name already exists in their account
 * - github_not_connected   → no GitHub account linked
 * - token_expired          → token invalid/revoked
 * - no_files               → chat has no generated files yet
 */
export async function pushToGithubHandler({
  body,
}: {
  body: {
    chatId: string
    branchName: string
    commitMessage?: string
    confirmExistingBranch?: boolean // user confirmed they want to push to existing branch
    repoName?: string
    visibility?: 'public' | 'private'
  }
}): Promise<PushResponse | ErrorResponse> {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { error: 'Unauthorized', code: 'unauthorized', status: 401 }

    const { chatId, branchName, commitMessage, confirmExistingBranch } = body

    if (!chatId || !branchName) {
      return { error: 'chatId and branchName are required', status: 400 }
    }

    // Get GitHub token
    const token = await getGithubToken(session.user.id)
    if (!token) {
      return {
        error: 'GitHub account not connected. Please sign in with GitHub.',
        code: 'github_not_connected',
        status: 403,
      }
    }

    // Verify token is still valid
    const ghUser = await getGithubUser(token)
    if (!ghUser) {
      return {
        error: 'Your GitHub token has expired or been revoked. Please sign out and sign back in with GitHub.',
        code: 'token_expired',
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
        error: error instanceof Error ? error.message : 'No generated files found for this chat.',
        code: 'no_files',
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
      // ── Case 2: Follow-up push ──
      repoName = existingRepo.repo_name
      repoFullName = existingRepo.repo_full_name
      repoUrl = existingRepo.repo_url
      githubRepoId = existingRepo.github_repo_id
      visibility = existingRepo.visibility
      isNewRepo = false

      // Check the repo still exists and is not archived
      const repoStatus = await checkRepoStatus(token, ghUser.login, repoName)
      if (repoStatus === 'not_found') {
        return {
          error: `Repository "${repoFullName}" could not be found on GitHub. It may have been deleted or renamed.`,
          code: 'repo_not_found',
          status: 404,
        }
      }
      if (repoStatus === 'archived') {
        return {
          error: `Repository "${repoFullName}" is archived and cannot be pushed to. Unarchive it on GitHub first.`,
          code: 'repo_archived',
          status: 403,
        }
      }

      // Check if the branch already exists
      const branchExists = await checkBranchExists(token, ghUser.login, repoName, branchName)
      if (branchExists && !confirmExistingBranch) {
        // Return a specific code — UI will ask user to confirm
        return {
          error: `Branch "${branchName}" already exists in ${repoFullName}.`,
          code: 'branch_already_exists',
          status: 409,
        }
      }

      // Create the branch only if it doesn't already exist
      if (!branchExists) {
        await createGithubBranch(token, {
          owner: ghUser.login,
          repo: repoName,
          branchName,
        })
      }
      // If branchExists && confirmExistingBranch → skip creation, push to existing branch HEAD
    } else {
      // ── Case 1: First push ──
      if (!body.repoName || !body.visibility) {
        return {
          error: 'repoName and visibility are required for the first push',
          status: 400,
        }
      }

      // Check repo name isn't already taken
      const nameTaken = await checkRepoNameTaken(token, ghUser.login, body.repoName)
      if (nameTaken) {
        return {
          error: `A repository named "${body.repoName}" already exists in your GitHub account. Please choose a different name.`,
          code: 'repo_name_taken',
          status: 409,
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

      // Create branch if it differs from default
      if (branchName !== repo.default_branch) {
        const branchExists = await checkBranchExists(token, ghUser.login, repo.name, branchName)
        if (!branchExists) {
          await createGithubBranch(token, {
            owner: ghUser.login,
            repo: repo.name,
            branchName,
          })
        }
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