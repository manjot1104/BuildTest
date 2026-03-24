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
  isRepoEmpty,
  listUserRepos,
  getRepoDetails,
  // PR service functions
  listRepoBranches,
  listPullRequests,
  getPullRequest,
  createPullRequest,
  mergePullRequest,
  type MergeMethod,
  type NormalisedPR,
} from '@/server/services/github.service'
import {
  getActiveGithubRepo,
  deactivateGithubReposForChat,
  replaceActiveGithubRepo,
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
    | 'pr_already_exists'
    | 'no_commits_between_branches'
    | 'pr_not_mergeable'
    | 'pr_not_found'

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

// camelCase shape returned to the client for the repo picker
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

// Response from the connect-existing endpoint
interface ConnectRepoResponse {
  success: boolean
  repoFullName: string
  repoUrl: string
  defaultBranch: string
  visibility: 'public' | 'private'
}

// Branch list item returned to the client
interface BranchListItem {
  name: string
  protected: boolean
}

// Merge response returned to the client
interface MergeResponse {
  success: boolean
  message: string
  sha: string
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

/**
 * Shared auth + repo resolution helper used by all PR handlers.
 * Verifies session, gets token, validates token, verifies chat ownership,
 * and returns the active repo's owner/name parsed from repoFullName.
 *
 * Returns an ErrorResponse if anything fails, or the resolved context if ok.
 */
async function resolveRepoContext(chatId: string): Promise<
  | ErrorResponse
  | {
      token: string
      repoOwner: string
      repoName: string
      repoFullName: string
      repoUrl: string
    }
> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'unauthorized', status: 401 }
  }

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

  const userChat = await getUserChat({ v0ChatId: chatId })
  if (!userChat) return { error: 'Chat not found', status: 404 }
  if (userChat.user_id !== session.user.id) return { error: 'Forbidden', status: 403 }

  const activeRepo = await getActiveGithubRepo({ chatId: userChat.id })
  if (!activeRepo) {
    return {
      error: 'No GitHub repository is linked to this chat. Push your code first.',
      status: 400,
    }
  }

  // Parse owner from the stored full name — handles org repos correctly
  const repoOwner = activeRepo.repo_full_name.split('/')[0] ?? ghUser.login

  return {
    token,
    repoOwner,
    repoName: activeRepo.repo_name,
    repoFullName: activeRepo.repo_full_name,
    repoUrl: activeRepo.repo_url,
  }
}

/** Type guard — narrows resolveRepoContext result to ErrorResponse */
function isErrorResponse(val: unknown): val is ErrorResponse {
  return typeof val === 'object' && val !== null && 'error' in val
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

    // Atomically deactivate any existing active repo and save the new one.
    // Using a single transaction prevents race conditions if two requests
    // for the same chat arrive simultaneously.
    await replaceActiveGithubRepo({
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

      // Create the branch only if it doesn't already exist AND the repo isn't
      // empty. An empty repo has no refs at all — createGithubBranch would 409
      // trying to read the default branch HEAD. pushFilesToBranch handles empty
      // repos internally via seedEmptyRepo (Contents API), so we skip branch
      // creation here and let it take care of initialising the repo too.
      if (!branchExists) {
        const empty = await isRepoEmpty(token, repoOwner, repoName)
        if (!empty) {
          await createGithubBranch(token, { owner: repoOwner, repo: repoName, branchName })
          await waitForBranch(token, repoOwner, repoName, branchName)
        }
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

      // For the replace case, deactivate the old repo now so it's done before
      // the GitHub API calls. The final createGithubRepo at the bottom is
      // wrapped in replaceActiveGithubRepo which is transactional, but since
      // we can't hold a DB transaction open across the GitHub API calls
      // (which can take several seconds), we deactivate eagerly here and rely
      // on the upsert in replaceActiveGithubRepo to handle the insert safely.
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

    // Only write to DB when a new repo record is needed (Cases 1 and 3).
    // Case 2 (follow-up) never writes — the existing record is still correct.
    // replaceActiveGithubRepo is used instead of createGithubRepo directly so
    // that the deactivation + insert is always atomic, guarding against the
    // unlikely but possible case of a duplicate first-push request.
    if (isNewRepo) {
      await replaceActiveGithubRepo({
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

// ============================================================================
// Pull Request Handlers
// ============================================================================

/**
 * GET /api/github/branches/:chatId
 *
 * Returns all branches for the active repo linked to a chat.
 * Used to populate the head/base branch selectors in the PR creation form.
 * Requires an active linked repo — returns 400 if none exists.
 */
export async function listRepoBranchesHandler({
  params,
}: {
  params: { chatId: string }
}): Promise<BranchListItem[] | ErrorResponse> {
  try {
    const ctx = await resolveRepoContext(params.chatId)
    if (isErrorResponse(ctx)) return ctx

    const branches = await listRepoBranches(ctx.token, ctx.repoOwner, ctx.repoName)

    // Map to a minimal shape — client only needs name and protected flag
    return branches.map((b) => ({
      name: b.name,
      protected: b.protected,
    }))
  } catch (err) {
    console.error('[github] listRepoBranchesHandler:', err)
    return {
      error: 'Failed to list branches',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}

/**
 * GET /api/github/prs/:chatId
 *
 * Returns all open PRs for the active repo linked to a chat.
 * Fast path — single GitHub API call, all PRs returned with
 * mergeableStatus: 'unknown'. Use GET /api/github/pr/:chatId/:prNumber
 * to get real mergeability for a specific PR.
 */
export async function listPullRequestsHandler({
  params,
}: {
  params: { chatId: string }
}): Promise<NormalisedPR[] | ErrorResponse> {
  try {
    const ctx = await resolveRepoContext(params.chatId)
    if (isErrorResponse(ctx)) return ctx

    return await listPullRequests(ctx.token, ctx.repoOwner, ctx.repoName)
  } catch (err) {
    console.error('[github] listPullRequestsHandler:', err)
    return {
      error: 'Failed to list pull requests',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}

/**
 * GET /api/github/pr/:chatId/:prNumber
 *
 * Returns a single PR with full detail including real mergeability status.
 * Called lazily when the user selects/expands a PR in the UI.
 *
 * If mergeableStatus comes back as 'unknown', GitHub is still computing —
 * the UI should show a spinner and retry after ~3 seconds.
 */
export async function getPullRequestHandler({
  params,
}: {
  params: { chatId: string; prNumber: string }
}): Promise<NormalisedPR | ErrorResponse> {
  try {
    const ctx = await resolveRepoContext(params.chatId)
    if (isErrorResponse(ctx)) return ctx

    const prNumber = parseInt(params.prNumber, 10)
    if (isNaN(prNumber)) {
      return { error: 'Invalid PR number', status: 400 }
    }

    return await getPullRequest(ctx.token, ctx.repoOwner, ctx.repoName, prNumber)
  } catch (err) {
    console.error('[github] getPullRequestHandler:', err)
    const msg = err instanceof Error ? err.message : ''
    // Surface GitHub 404 as a proper not-found response
    if (msg.includes('404')) {
      return { error: 'Pull request not found', code: 'pr_not_found', status: 404 }
    }
    return {
      error: 'Failed to get pull request',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}

/**
 * POST /api/github/pr/create
 *
 * Creates a new pull request on the active repo for a chat.
 *
 * Required: { chatId, title, head, base, body? }
 *   head → source branch (the branch with changes)
 *   base → target branch (where changes will be merged into)
 *
 * Error codes:
 *   pr_already_exists           → a PR for this head→base already exists
 *   no_commits_between_branches → head and base are identical, nothing to merge
 */
export async function createPullRequestHandler({
  body,
}: {
  body: {
    chatId: string
    title: string
    head: string
    base: string
    body?: string
  }
}): Promise<NormalisedPR | ErrorResponse> {
  try {
    const { chatId, title, head, base } = body
    const prBody = body.body ?? ''

    if (!chatId || !title || !head || !base) {
      return { error: 'chatId, title, head, and base are required', status: 400 }
    }

    if (head === base) {
      return {
        error: 'Head and base branches must be different.',
        status: 400,
      }
    }

    if (!isValidBranchName(head) || !isValidBranchName(base)) {
      return { error: 'Invalid branch name.', status: 400 }
    }

    const ctx = await resolveRepoContext(chatId)
    if (isErrorResponse(ctx)) return ctx

    return await createPullRequest(ctx.token, {
      owner: ctx.repoOwner,
      repo: ctx.repoName,
      title,
      body: prBody,
      head,
      base,
    })
  } catch (err) {
    console.error('[github] createPullRequestHandler:', err)
    const msg = err instanceof Error ? err.message : ''

    // GitHub returns 422 for these two common cases — surface them specifically
    // so the UI can show a targeted message instead of a generic error
    if (msg.includes('A pull request already exists')) {
      return {
        error: 'A pull request for this branch already exists.',
        code: 'pr_already_exists',
        status: 422,
      }
    }
    if (msg.includes('No commits between')) {
      return {
        error: 'No commits between these branches. Push some changes first.',
        code: 'no_commits_between_branches',
        status: 422,
      }
    }
    return {
      error: 'Failed to create pull request',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}

/**
 * POST /api/github/pr/merge
 *
 * Merges a pull request using the specified merge method.
 * Validates mergeability server-side before attempting — returns pr_not_mergeable
 * if the PR has conflicts or is otherwise blocked, so a stale UI can never
 * trigger a bad merge.
 *
 * Required: { chatId, prNumber, mergeMethod }
 * mergeMethod: 'merge' | 'squash' | 'rebase'
 *
 * Error codes:
 *   pr_not_mergeable → PR has conflicts or is blocked (see error message for reason)
 *   pr_not_found     → PR was closed or deleted before merge
 */
export async function mergePullRequestHandler({
  body,
}: {
  body: {
    chatId: string
    prNumber: number
    mergeMethod: MergeMethod
    commitTitle?: string
  }
}): Promise<MergeResponse | ErrorResponse> {
  try {
    const { chatId, prNumber, mergeMethod, commitTitle } = body

    if (!chatId || !prNumber || !mergeMethod) {
      return { error: 'chatId, prNumber, and mergeMethod are required', status: 400 }
    }

    const validMergeMethods: MergeMethod[] = ['merge', 'squash', 'rebase']
    if (!validMergeMethods.includes(mergeMethod)) {
      return { error: 'mergeMethod must be one of: merge, squash, rebase', status: 400 }
    }

    const ctx = await resolveRepoContext(chatId)
    if (isErrorResponse(ctx)) return ctx

    // Fetch the current PR state before attempting merge —
    // we verify mergeability server-side so a stale UI can't trigger a bad merge
    const pr = await getPullRequest(ctx.token, ctx.repoOwner, ctx.repoName, prNumber)

    if (pr.state !== 'open') {
      return {
        error: `This pull request is already ${pr.state}.`,
        code: 'pr_not_mergeable',
        status: 422,
      }
    }

    if (pr.mergeableStatus !== 'mergeable') {
      // Specific message per status so the UI can explain it clearly
      const reasons: Record<string, string> = {
        conflicting: 'This PR has merge conflicts. Resolve them on GitHub before merging.',
        blocked:     'This PR is blocked by branch protection rules (required reviews or status checks).',
        behind:      'This branch is behind the base branch. Update it on GitHub before merging.',
        unstable:    'CI checks are pending or failing. Wait for them to pass before merging.',
        draft:       'Draft PRs cannot be merged. Mark it as ready for review first.',
        unknown:     'Mergeability is still being computed. Please try again in a moment.',
      }
      return {
        error: reasons[pr.mergeableStatus] ?? 'This PR cannot be merged right now.',
        code: 'pr_not_mergeable',
        status: 422,
      }
    }

    const result = await mergePullRequest(ctx.token, {
      owner: ctx.repoOwner,
      repo: ctx.repoName,
      prNumber,
      mergeMethod,
      commitTitle,
    })

    return {
      success: result.merged,
      message: result.message,
      sha: result.sha,
    }
  } catch (err) {
    console.error('[github] mergePullRequestHandler:', err)
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('404')) {
      return {
        error: 'Pull request not found or already closed.',
        code: 'pr_not_found',
        status: 404,
      }
    }
    if (msg.includes('405')) {
      // GitHub returns 405 when the PR is not mergeable at the API level
      return {
        error: 'This PR cannot be merged. It may have conflicts or unresolved review requests.',
        code: 'pr_not_mergeable',
        status: 422,
      }
    }
    return {
      error: 'Failed to merge pull request',
      details: 'An internal error occurred',
      status: 500,
    }
  }
}