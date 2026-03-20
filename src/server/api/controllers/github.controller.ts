import { getSession } from '@/server/better-auth/server'
import {
  getGithubToken,
  getGithubConnectionStatus,
  getGithubUser,
  createGithubRepository,
  createGithubBranch,
  waitForBranch,
  pushFilesToBranch,
  checkRepoStatus,
  checkBranchExists,
  checkRepoNameTaken,
  validateGithubRepoAndBranch,
} from '@/server/services/github.service'
import {
  getActiveGithubRepo,
  deactivateGithubReposForChat,
  createGithubRepo,
  getUserChat,
} from '@/server/db/queries'

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
    | 'repo_check_failed'
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
  visibility: 'public' | 'private'
  createdAt: string
}

export interface GithubValidateResponse {
  valid:          boolean
  defaultBranch?: string
  error?:         'no_github_account' | 'repo_not_found' | 'branch_not_found' | 'error'
  message?:       string
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates a git branch name.
 * Rejects names with characters that are invalid in git refs.
 */
function isValidBranchName(name: string): boolean {
  if (!name || name.length > 255) return false
  // Git ref rules: no space, no ~, ^, :, ?, *, [, \, no double dots, no leading/trailing dot or slash
  if (/[\s~^:?*[\\\x00-\x1f\x7f]/.test(name)) return false
  if (name.includes('..')) return false
  if (name.startsWith('.') || name.startsWith('/') || name.endsWith('.') || name.endsWith('/')) return false
  if (name.endsWith('.lock')) return false
  if (name.includes('@{')) return false
  return true
}

/**
 * Validates a GitHub repository name.
 * Only allows lowercase letters, numbers, hyphens, and dots. Max 100 chars.
 */
function isValidRepoName(name: string): boolean {
  if (!name || name.length > 100) return false
  return /^[a-z0-9][a-z0-9._-]*$/.test(name)
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
  } catch {
    return {
      error: 'Failed to get GitHub status',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}

/**
 * GET /api/github/validate?owner=foo&repo=bar&branch=main
 *
 * Validates that a GitHub repo and branch are accessible with the current
 * user's token. Used by the debounced live validation in the test run form.
 *
 * Guards:
 *   - User must be authenticated
 *   - User must have a GitHub token (email-only users get no_github_account)
 *   - owner, repo, branch are all required query params
 */
export async function validateGithubSourceHandler({
  query,
}: {
  query: { owner?: string; repo?: string; branch?: string }
}): Promise<GithubValidateResponse> {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { valid: false, error: 'error', message: 'Unauthorized' }
    }

    const { owner, repo, branch } = query
    if (!owner || !repo || !branch) {
      return { valid: false, error: 'error', message: 'owner, repo, and branch are required' }
    }

    // Guard: user must have a GitHub token — email-only users never reach
    // this endpoint from the UI, but we enforce it server-side too
    const token = await getGithubToken(session.user.id)
    if (!token) {
      return {
        valid:   false,
        error:   'no_github_account',
        message: 'Your account is not connected to GitHub.',
      }
    }

    const result = await validateGithubRepoAndBranch(token, owner, repo, branch)

    if (!result.valid) {
      const messages: Record<typeof result.reason, string> = {
        repo_not_found:   `Repository "${owner}/${repo}" not found or not accessible.`,
        branch_not_found: `Branch "${branch}" does not exist in ${owner}/${repo}.`,
        error:            'Could not reach GitHub. Please try again.',
      }
      return {
        valid:   false,
        error:   result.reason,
        message: messages[result.reason],
      }
    }

    return { valid: true, defaultBranch: result.defaultBranch }
  } catch {
    return {
      valid:    false,
      error:    'error',
      message:  'An internal error occurred',
    }
  }
}

/**
 * GET /api/github/repo/:chatId
 * Returns the active GitHub repo for a chat, or null if none exists.
 * Used by the UI to determine first push vs follow-up push vs replace-repo.
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

    // Verify chat ownership — prevent data leaks across users
    if (userChat.user_id !== session.user.id) {
      return { error: 'Forbidden', status: 403 }
    }

    const repo = await getActiveGithubRepo({ chatId: userChat.id })
    if (!repo) return null

    return {
      id: repo.id,
      repoName: repo.repo_name,
      repoFullName: repo.repo_full_name,
      repoUrl: repo.repo_url,
      visibility: repo.visibility as 'public' | 'private',
      createdAt: repo.created_at.toISOString(),
    }
  } catch {
    return {
      error: 'Failed to get GitHub repo',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}

/**
 * POST /api/github/push
 *
 * Case 1 — First push (no active repo for this chat):
 *   Required: { chatId, repoName, visibility, branchName, commitMessage? }
 *   Creates the GitHub repo, pushes to specified branch, saves the repo record.
 *
 * Case 2 — Follow-up push (active repo exists):
 *   Required: { chatId, branchName, commitMessage?, confirmExistingBranch? }
 *   Pushes to specified branch on the existing active repo. No DB write.
 *
 * Case 3 — Replace repo (user explicitly confirmed):
 *   Required: { chatId, repoName, visibility, branchName, replaceRepo: true, commitMessage? }
 *   Deactivates old repo record, creates new GitHub repo, pushes, saves new record.
 *   UI must show a heavy warning before sending replaceRepo: true.
 *
 * Error codes:
 *   branch_already_exists → UI asks user to confirm or rename
 *   repo_not_found        → active repo was deleted/renamed on GitHub
 *   repo_archived         → active repo is archived on GitHub
 *   repo_name_taken       → chosen repo name already exists in their account
 *   github_not_connected  → no GitHub account linked
 *   token_expired         → token invalid/revoked
 *   no_files              → chat has no generated files yet
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
    replaceRepo?: boolean // User explicitly confirmed replacing the active repo with a new one
  }
}): Promise<PushResponse | ErrorResponse> {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { error: 'Unauthorized', code: 'unauthorized', status: 401 }

    const { chatId, branchName, commitMessage, confirmExistingBranch, replaceRepo } = body

    if (!chatId || !branchName) {
      return { error: 'chatId and branchName are required', status: 400 }
    }

    if (!isValidBranchName(branchName)) {
      return {
        error: 'Invalid branch name. Avoid spaces, special characters (~^:?*[\\), and double dots.',
        status: 400,
      }
    }

    // Auth checks
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

    const activeRepo = await getActiveGithubRepo({ chatId: userChat.id })
    const isFirstPush = !activeRepo
    const isReplace = !!activeRepo && !!replaceRepo

    let repoName: string
    let repoFullName: string
    let repoUrl: string
    let githubRepoId: string
    let visibility: 'public' | 'private'
    let isNewRepo: boolean

    if (!isFirstPush && !isReplace) {
      // ── Case 2: Follow-up push to existing active repo ──
      repoName = activeRepo.repo_name
      repoFullName = activeRepo.repo_full_name
      repoUrl = activeRepo.repo_url
      githubRepoId = activeRepo.github_repo_id
      visibility = activeRepo.visibility as 'public' | 'private'
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
      if (repoStatus === 'error') {
        return {
          error: `Could not verify repository "${repoFullName}" on GitHub. Please try again later.`,
          code: 'repo_check_failed',
          status: 502,
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

      // Create the branch only if it doesn't already exist, then wait for
      // GitHub to propagate the new ref before we attempt to push to it
      if (!branchExists) {
        await createGithubBranch(token, { owner: ghUser.login, repo: repoName, branchName })
        await waitForBranch(token, ghUser.login, repoName, branchName)
      }
    } else {
      // ── Case 1 or Case 3: Creating a new GitHub repo ──
      if (!body.repoName || !body.visibility) {
        return {
          error: 'repoName and visibility are required when creating a new repository',
          status: 400,
        }
      }

      if (!isValidRepoName(body.repoName)) {
        return {
          error: 'Invalid repository name. Use only lowercase letters, numbers, hyphens, and dots. Must start with a letter or number.',
          code: 'repo_name_taken' as const,
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

      // Deactivate old repo record before creating the new one
      if (isReplace) {
        await deactivateGithubReposForChat({ chatId: userChat.id })
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

      // Create the requested branch if it differs from the repo default, then
      // wait for GitHub to propagate the new ref before we attempt to push to it
      if (branchName !== repo.default_branch) {
        const branchExists = await checkBranchExists(token, ghUser.login, repo.name, branchName)
        if (!branchExists) {
          await createGithubBranch(token, { owner: ghUser.login, repo: repo.name, branchName })
          await waitForBranch(token, ghUser.login, repo.name, branchName)
        }
      }
    }

    // Push files to the specified branch
    const pushResult = await pushFilesToBranch(token, {
      owner: ghUser.login,
      repo: repoName,
      branchName,
      files,
      commitMessage: commitMessage ?? 'feat: build update from Buildify',
    })

    // Only write to DB when a new repo record is needed (first push or replace)
    // Follow-up pushes to the same repo don't change the DB at all
    if (isNewRepo) {
      await createGithubRepo({
        chatId: userChat.id,
        userId: session.user.id,
        githubRepoId,
        repoName,
        repoFullName,
        repoUrl,
        visibility,
      })
    }

    return {
      success: true,
      repoUrl,
      commitSha: pushResult.commitSha,
      commitUrl: pushResult.commitUrl,
      branchName,
      isNewRepo,
    }
  } catch {
    return {
      error: 'Failed to push to GitHub',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}