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
  listUserRepos,      // NEW
  getRepoDetails,     // NEW
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

// NEW: camelCase shape returned to the client for the repo picker
interface GithubRepoListItemResponse {
  id: number
  name: string
  fullName: string
  htmlUrl: string
  private: boolean
  description: string | null
  defaultBranch: string
  updatedAt: string
}

// NEW: response from the connect-existing endpoint
interface ConnectRepoResponse {
  success: boolean
  repoFullName: string
  repoUrl: string
  defaultBranch: string
  visibility: 'public' | 'private'
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
  } catch (err) {
    console.error('[github] getGithubStatusHandler:', err)
    return {
      error: 'Failed to get GitHub status',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}

/**
 * GET /api/github/repos
 * Returns all GitHub repos the user has access to, for the "connect existing repo" picker.
 * Includes repos they own, collaborate on, or are an org member of.
 * Actual write permissions are enforced by GitHub at push time.
 */
export async function getGithubReposHandler(): Promise<
  GithubRepoListItemResponse[] | ErrorResponse
> {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { error: 'Unauthorized', code: 'unauthorized', status: 401 }

    const token = await getGithubToken(session.user.id)
    if (!token) {
      return { error: 'GitHub account not connected.', code: 'github_not_connected', status: 403 }
    }

    const ghUser = await getGithubUser(token)
    if (!ghUser) {
      return { error: 'GitHub token expired or revoked.', code: 'token_expired', status: 403 }
    }

    const repos = await listUserRepos(token)

    // Map snake_case GitHub API fields to camelCase for the client
    return repos.map((r) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      htmlUrl: r.html_url,
      private: r.private,
      description: r.description,
      defaultBranch: r.default_branch,
      updatedAt: r.updated_at,
    }))
  } catch (err) {
    console.error('[github] getGithubReposHandler:', err)
    return {
      error: 'Failed to list GitHub repositories',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}

/**
 * POST /api/github/connect
 *
 * Step 1 of the "connect existing repo" flow — separate from push.
 *
 * Validates the repo is accessible with the user's token, then saves it as
 * the active repo for the chat (deactivating any previous one).
 * Does NOT push any files. The user then uses the normal push flow.
 *
 * Required: { chatId, repoFullName }
 * repoFullName format: "owner/repo-name"
 */
export async function connectExistingRepoHandler({
  body,
}: {
  body: {
    chatId: string
    repoFullName: string
  }
}): Promise<ConnectRepoResponse | ErrorResponse> {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { error: 'Unauthorized', code: 'unauthorized', status: 401 }

    const { chatId, repoFullName } = body

    if (!chatId || !repoFullName) {
      return { error: 'chatId and repoFullName are required', status: 400 }
    }

    // Parse owner/repo
    const parts = repoFullName.split('/')
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return {
        error: 'Invalid repository name. Expected format: owner/repo-name',
        status: 400,
      }
    }
    const [repoOwner, repoName] = parts as [string, string]

    // Auth checks
    const token = await getGithubToken(session.user.id)
    if (!token) {
      return {
        error: 'GitHub account not connected. Please sign in with GitHub.',
        code: 'github_not_connected',
        status: 403,
      }
    }

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

    // Verify the repo exists and is accessible
    const repoStatus = await checkRepoStatus(token, repoOwner, repoName)
    if (repoStatus === 'not_found') {
      return {
        error: `Repository "${repoFullName}" could not be found. Check the name or your access permissions.`,
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
        error: `Could not verify repository "${repoFullName}". Please try again later.`,
        code: 'repo_check_failed',
        status: 502,
      }
    }

    // Fetch full repo details (id, visibility, default branch)
    const repoDetails = await getRepoDetails(token, repoOwner, repoName)

    // Deactivate any existing active repo for this chat, then save the new one
    await deactivateGithubReposForChat({ chatId: userChat.id })
    await createGithubRepo({
      chatId: userChat.id,
      userId: session.user.id,
      githubRepoId: String(repoDetails.id),
      repoName: repoDetails.name,
      repoFullName: repoDetails.full_name,
      repoUrl: repoDetails.html_url,
      visibility: repoDetails.private ? 'private' : 'public',
    })

    return {
      success: true,
      repoFullName: repoDetails.full_name,
      repoUrl: repoDetails.html_url,
      defaultBranch: repoDetails.default_branch,
      visibility: repoDetails.private ? 'private' : 'public',
    }
  } catch (err) {
    console.error('[github] connectExistingRepoHandler:', err)
    return {
      error: 'Failed to connect repository',
      details: 'An internal error occurred',
      status: 500,
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
  } catch (err) {
    console.error('[github] getGithubRepoForChatHandler:', err)
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
 *   This case now also handles repos connected via POST /api/github/connect.
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
 *   repo_name_taken       → chosen repo name already exists (new repo creation only)
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
      // This includes repos that were connected via POST /api/github/connect.
      // The push owner is derived from repoFullName, not ghUser.login, so org
      // repos and externally-connected repos work correctly.
      repoName = activeRepo.repo_name
      repoFullName = activeRepo.repo_full_name
      repoUrl = activeRepo.repo_url
      githubRepoId = activeRepo.github_repo_id
      visibility = activeRepo.visibility as 'public' | 'private'
      isNewRepo = false

      // Parse the owner from the stored full name (handles org repos correctly)
      const repoOwner = repoFullName.split('/')[0] ?? ghUser.login

      // Check the repo still exists and is not archived
      const repoStatus = await checkRepoStatus(token, repoOwner, repoName)
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
      const branchExists = await checkBranchExists(token, repoOwner, repoName, branchName)
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
        await createGithubBranch(token, { owner: repoOwner, repo: repoName, branchName })
        await waitForBranch(token, repoOwner, repoName, branchName)
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

    // Derive push owner from repoFullName (handles org repos correctly)
    const pushOwner = repoFullName.split('/')[0] ?? ghUser.login

    // Push files to the specified branch
    const pushResult = await pushFilesToBranch(token, {
      owner: pushOwner,
      repo: repoName,
      branchName,
      files,
      commitMessage: commitMessage ?? 'feat: build update from Buildify',
    })

    // Only write to DB when a new repo record is needed (first push or replace).
    // Follow-up pushes to the same repo — including connected existing repos — don't change the DB.
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
  } catch (err) {
    console.error('[github] pushToGithubHandler:', err)
    return {
      error: 'Failed to push to GitHub',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}