'use server'

import { eq } from 'drizzle-orm'
import { account } from '@/server/db/schema'
import { db } from '@/server/db'

const GITHUB_API = 'https://api.github.com'

// ============================================================================
// Types
// ============================================================================

export interface GithubUser {
  login: string
  id: number
  avatar_url: string
  name: string | null
}

export interface GithubRepoCreated {
  id: number
  name: string
  full_name: string
  html_url: string
  private: boolean
  default_branch: string
}

export interface GithubBranchCreated {
  ref: string
  sha: string
}

export interface PushFilesResult {
  commitSha: string
  commitUrl: string
}

export interface GithubFile {
  name: string
  content: string
}

// shape of one repo returned by the /user/repos listing endpoint
export interface GithubRepoListItem {
  id: number
  name: string
  full_name: string
  html_url: string
  private: boolean
  description: string | null
  default_branch: string
  updated_at: string
}

// ============================================================================
// Token Retrieval
// ============================================================================

/**
 * Gets the GitHub OAuth token for a user from the account table.
 * Returns null if user has not connected GitHub.
 */
export async function getGithubToken(userId: string): Promise<string | null> {
  try {
    const accounts = await db
      .select({ accessToken: account.accessToken, scope: account.scope, providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, userId))

    const githubAcc = accounts.find((a) => a.providerId === 'github')

    if (!githubAcc?.accessToken) return null

    return githubAcc.accessToken
  } catch {
    return null
  }
}

/**
 * Checks if the user has a GitHub account connected with repo scope.
 */
export async function getGithubConnectionStatus(userId: string): Promise<{
  connected: boolean
  hasRepoScope: boolean
  login?: string
}> {
  try {
    const accounts = await db
      .select({
        accessToken: account.accessToken,
        scope: account.scope,
        providerId: account.providerId,
      })
      .from(account)
      .where(eq(account.userId, userId))

    const githubAcc = accounts.find((a) => a.providerId === 'github')

    if (!githubAcc?.accessToken) {
      return { connected: false, hasRepoScope: false }
    }

    // Split on commas/spaces and match the exact 'repo' token — not 'public_repo',
    // which also contains the string 'repo' and would cause .includes() to return true.
    const scopes = githubAcc.scope?.split(/[,\s]+/) ?? []
    const hasRepoScope = scopes.includes('repo')

    // Verify token is still valid by fetching user
    const ghUser = await getGithubUser(githubAcc.accessToken)
    if (!ghUser) {
      return { connected: false, hasRepoScope: false }
    }

    return {
      connected: true,
      hasRepoScope,
      login: ghUser.login,
    }
  } catch {
    return { connected: false, hasRepoScope: false }
  }
}

// ============================================================================
// GitHub API Helpers
// ============================================================================

async function githubFetch<T>(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`GitHub API error ${res.status}: ${error}`)
  }

  return res.json() as Promise<T>
}

// ============================================================================
// Existence Checks
// ============================================================================

export type RepoStatus = 'ok' | 'not_found' | 'archived' | 'error'

/**
 * Checks if a repository exists, is accessible, and is not archived.
 */
export async function checkRepoStatus(
  token: string,
  owner: string,
  repo: string,
): Promise<RepoStatus> {
  try {
    const data = await githubFetch<{ archived: boolean }>(token, `/repos/${owner}/${repo}`)
    if (data.archived) return 'archived'
    return 'ok'
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('404') || msg.includes('Not Found')) return 'not_found'
    return 'error'
  }
}

/**
 * Checks if a branch exists in a repository.
 * Returns false if the branch does not exist.
 */
export async function checkBranchExists(
  token: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<boolean> {
  try {
    await githubFetch(token, `/repos/${owner}/${repo}/branches/${branch}`)
    return true
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('404') || msg.includes('Not Found')) return false
    return false
  }
}

/**
 * Checks if a repo name is already taken in the authenticated user's account.
 */
export async function checkRepoNameTaken(
  token: string,
  owner: string,
  repoName: string,
): Promise<boolean> {
  try {
    await githubFetch(token, `/repos/${owner}/${repoName}`)
    return true // repo exists = name is taken
  } catch (error) {
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('404') || msg.includes('Not Found')) return false
    return false
  }
}

/**
 * Returns true if a repository has no commits yet (is empty).
 * Uses the repo branches list — an empty repo has no branches, so the
 * endpoint returns an empty array. Combined with size=0 as a cross-check.
 */
export async function isRepoEmpty(
  token: string,
  owner: string,
  repo: string,
): Promise<boolean> {
  try {
    const [repoData, branches] = await Promise.all([
      githubFetch<{ size: number }>(token, `/repos/${owner}/${repo}`),
      githubFetch<unknown[]>(token, `/repos/${owner}/${repo}/branches?per_page=1`),
    ])
    return repoData.size === 0 && branches.length === 0
  } catch {
    return false
  }
}

/**
 * Polls until a newly created branch is readable on GitHub's API.
 * GitHub can take a moment to propagate a new ref after creation — attempting
 * to push immediately after createGithubBranch can result in a 404 on Step 1
 * of pushFilesToBranch (GET /git/refs/heads/:branch) even though the branch
 * was successfully created. Retrying with a short delay resolves this.
 *
 * Only called right after createGithubBranch — never for pre-existing branches
 * so there is zero added delay on follow-up pushes.
 */
export async function waitForBranch(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  maxAttempts = 5,
  delayMs = 1000,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const exists = await checkBranchExists(token, owner, repo, branch)
    if (exists) return
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
  throw new Error(
    `Branch "${branch}" was not available after ${maxAttempts} attempts. Please try again.`,
  )
}

// ============================================================================
// GitHub API Operations
// ============================================================================

/**
 * Gets the authenticated GitHub user's profile
 */
export async function getGithubUser(token: string): Promise<GithubUser | null> {
  try {
    return await githubFetch<GithubUser>(token, '/user')
  } catch {
    return null
  }
}

/**
 * Creates a new GitHub repository in the authenticated user's account
 */
export async function createGithubRepository(
  token: string,
  params: {
    name: string
    isPrivate: boolean
    description?: string
  },
): Promise<GithubRepoCreated> {
  return githubFetch<GithubRepoCreated>(token, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name: params.name,
      description: params.description ?? 'Created with Buildify',
      private: params.isPrivate,
      auto_init: true, // creates initial commit so we can branch from it
    }),
  })
}

/**
 * Creates a new branch in a repository from the default branch HEAD.
 */
export async function createGithubBranch(
  token: string,
  params: {
    owner: string
    repo: string
    branchName: string
  },
): Promise<GithubBranchCreated> {
  // Get the repo's actual default branch name (e.g. "main" or "master")
  const repoData = await githubFetch<{ default_branch: string }>(
    token,
    `/repos/${params.owner}/${params.repo}`,
  )

  // Get the SHA of the default branch HEAD
  const refData = await githubFetch<{ object: { sha: string } }>(
    token,
    `/repos/${params.owner}/${params.repo}/git/refs/heads/${repoData.default_branch}`,
  )

  const sha = refData.object.sha

  // Create new branch from that SHA
  return githubFetch<GithubBranchCreated>(
    token,
    `/repos/${params.owner}/${params.repo}/git/refs`,
    {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${params.branchName}`,
        sha,
      }),
    },
  )
}

/**
 * Seeds an empty repository by pushing a temporary .gitkeep file via the
 * Contents API (the only API that works on a zero-commit repo), then
 * immediately deletes it in the same tree as the real files so it never
 * appears in the final commit. The seeding commit will show the token
 * owner as author — that's unavoidable — but the real Buildify commit
 * follows immediately on top, so the repo history is clean from commit 2.
 *
 * Returns the SHA of the seed commit so the caller can build on top of it.
 */
async function seedEmptyRepo(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
): Promise<string> {
  const response = await githubFetch<{ commit: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/contents/.gitkeep`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: 'chore: initialise repository',
        // base64 of a single newline — smallest valid file
        content: 'Cg==',
        branch: branchName,
      }),
    },
  )
  return response.commit.sha
}

/**
 * Pushes multiple files to a branch in a single commit using the Git Tree API.
 *
 * Handles empty repos transparently: if the repo has no commits, the Git Data
 * API is entirely unavailable (GitHub returns 409 on everything). We detect
 * this by catching the 409 from step 1, seed the repo with a throwaway
 * .gitkeep via the Contents API, then build the real Buildify commit on top.
 * The .gitkeep is excluded from the tree so it never appears in the final
 * state of the repo — only the initial seed commit (authored by the token
 * owner) and the real Buildify commit (authored by Buildify) will exist.
 */
export async function pushFilesToBranch(
  token: string,
  params: {
    owner: string
    repo: string
    branchName: string
    files: GithubFile[]
    commitMessage: string
  },
): Promise<PushFilesResult> {
  const { owner, repo, branchName, files, commitMessage } = params

  const authorInfo = {
    name: 'Buildify',
    email: 'notifications@technotribes.org',
    date: new Date().toISOString(),
  }

  // Step 1: Get the latest commit SHA on the branch.
  // If this 409s, the repo is empty — seed it first then retry.
  let latestCommitSha: string
  try {
    const branchData = await githubFetch<{ object: { sha: string } }>(
      token,
      `/repos/${owner}/${repo}/git/refs/heads/${branchName}`,
    )
    latestCommitSha = branchData.object.sha
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (!msg.includes('409')) throw err
    // Repo is empty — seed it with a .gitkeep, then re-fetch the branch SHA
    latestCommitSha = await seedEmptyRepo(token, owner, repo, branchName)
  }

  // Step 2: Get the tree SHA of the latest commit
  const commitData = await githubFetch<{ tree: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
  )
  const baseTreeSha = commitData.tree.sha

  // Step 3: Create blobs for each file
  const blobs = await Promise.all(
    files.map(async (file) => {
      const blob = await githubFetch<{ sha: string }>(
        token,
        `/repos/${owner}/${repo}/git/blobs`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: file.content,
            encoding: 'utf-8',
          }),
        },
      )
      return {
        path: file.name,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blob.sha,
      }
    }),
  )

  // Step 4: Create a new tree with all the blobs.
  // base_tree is the seed commit's tree — the .gitkeep will be absent from
  // the final tree because we're not including it in the blobs list, and
  // we're not passing base_tree here so only our files end up in the tree.
  const newTree = await githubFetch<{ sha: string }>(
    token,
    `/repos/${owner}/${repo}/git/trees`,
    {
      method: 'POST',
      body: JSON.stringify({
        tree: blobs, // no base_tree — clean slate, only our files
      }),
    },
  )

  // Step 5: Create a commit pointing to the new tree
  const newCommit = await githubFetch<{ sha: string; html_url: string }>(
    token,
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: commitMessage,
        tree: newTree.sha,
        parents: [latestCommitSha],
        author: authorInfo,
        committer: authorInfo,
      }),
    },
  )

  // Step 6: Update the branch ref to point to the new commit
  await githubFetch(
    token,
    `/repos/${owner}/${repo}/git/refs/heads/${branchName}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
        force: false,
      }),
    },
  )

  return {
    commitSha: newCommit.sha,
    commitUrl: newCommit.html_url,
  }
}


// ============================================================================
// Repo listing (for the "connect existing repo" picker)
// ============================================================================

/**
 * Lists GitHub repositories the authenticated user has access to, sorted by
 * most recently updated. Fetches up to 3 pages (300 repos) to cover most
 * accounts without hammering the API.
 *
 * affiliation=owner,collaborator,organization_member includes org repos the
 * user has write access to — the token enforces actual permissions at push time.
 */
export async function listUserRepos(token: string): Promise<GithubRepoListItem[]> {
  const allRepos: GithubRepoListItem[] = []
  const perPage = 100
  const maxPages = 3

  for (let page = 1; page <= maxPages; page++) {
    try {
      const repos = await githubFetch<GithubRepoListItem[]>(
        token,
        `/user/repos?sort=updated&direction=desc&per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member`,
      )
      allRepos.push(...repos)
      // Fewer results than requested means we've hit the last page
      if (repos.length < perPage) break
    } catch {
      break
    }
  }

  return allRepos
}

/**
 * Fetches full details for a single repo by owner/name.
 * Used during the connect flow to get id, visibility, and default branch.
 */
export async function getRepoDetails(
  token: string,
  owner: string,
  repo: string,
): Promise<{
  id: number
  name: string
  full_name: string
  html_url: string
  private: boolean
  default_branch: string
}> {
  return githubFetch(token, `/repos/${owner}/${repo}`)
}

// ============================================================================
// NEW: PR-related types
// ============================================================================

export type MergeMethod = 'merge' | 'squash' | 'rebase'

// Granular mergeable status — maps GitHub's mergeable_state to our own type
// so the UI can show specific reasons instead of a generic "unknown"
export type MergeableStatus =
  | 'mergeable'   // clean, ready to merge
  | 'conflicting' // has merge conflicts, must resolve on GitHub
  | 'blocked'     // branch protection rule / required review / CI required
  | 'behind'      // head branch is behind base, needs update but no conflicts
  | 'unstable'    // CI checks pending or failing
  | 'draft'       // PR is a draft
  | 'unknown'     // GitHub still computing, or detail not yet fetched

// Shape of one branch returned by /repos/:owner/:repo/branches
export interface GithubBranch {
  name: string
  commit: { sha: string }
  protected: boolean
}

// Raw PR shape from GitHub API
// mergeable is null when GitHub hasn't computed it yet
export interface GithubPullRequest {
  number: number
  node_id: string
  title: string
  body: string | null
  state: 'open' | 'closed'
  draft: boolean
  merged: boolean
  mergeable: boolean | null
  mergeable_state: string  // 'clean' | 'dirty' | 'blocked' | 'behind' | 'unstable' | 'unknown' etc.
  html_url: string
  head: { ref: string; sha: string }
  base: { ref: string; sha: string }
  created_at: string
  updated_at: string
  user: { login: string; avatar_url: string }
}

// Normalised PR shape exposed to the controller and UI.
// mergeableStatus is 'unknown' when returned from the list endpoint —
// call getPullRequest() to get the real status for a specific PR.
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

// ============================================================================
// NEW: Pull Request Helpers
// ============================================================================

/**
 * Maps GitHub's raw mergeable + mergeable_state fields to our MergeableStatus.
 *
 * GitHub's mergeable_state values:
 *   'clean'    → no conflicts, all checks pass, ready to merge
 *   'dirty'    → has merge conflicts
 *   'blocked'  → blocked by branch protection (required reviews, status checks etc.)
 *   'behind'   → head branch is behind base but no conflicts — needs update/rebase
 *   'unstable' → CI checks are pending or failing
 *   'draft'    → PR is in draft state (also checked via pr.draft directly)
 *   'unknown'  → GitHub is still computing mergeability
 *
 * We only return 'mergeable' when BOTH mergeable === true AND state === 'clean'
 * to avoid enabling the merge button in any ambiguous state.
 */
function normaliseMergeableState(
  mergeable: boolean | null,
  mergeableState: string,
  draft: boolean,
): MergeableStatus {
  // Draft check first — GitHub may return 'blocked' for drafts too,
  // but we want to show the more specific 'draft' reason
  if (draft) return 'draft'

  // GitHub hasn't computed mergeability yet (lazy evaluation)
  if (mergeable === null) return 'unknown'

  switch (mergeableState) {
    case 'clean':    return 'mergeable'
    case 'dirty':    return 'conflicting'
    case 'blocked':  return 'blocked'
    case 'behind':   return 'behind'
    case 'unstable': return 'unstable'
    default:         return 'unknown'
  }
}

/**
 * Normalises a raw GitHub PR object into our cleaner NormalisedPR shape.
 * When called from listPullRequests (list endpoint), mergeable is always null
 * so mergeableStatus will always be 'unknown' — call getPullRequest() for real status.
 */
function normalisePR(pr: GithubPullRequest): NormalisedPR {
  let state: NormalisedPR['state'] = 'open'
  if (pr.merged) state = 'merged'
  else if (pr.state === 'closed') state = 'closed'

  return {
    number: pr.number,
    nodeId: pr.node_id,
    title: pr.title,
    body: pr.body,
    state,
    draft: pr.draft,
    mergeableStatus: normaliseMergeableState(pr.mergeable, pr.mergeable_state, pr.draft),
    prUrl: pr.html_url,
    headBranch: pr.head.ref,
    baseBranch: pr.base.ref,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
    author: { login: pr.user.login, avatarUrl: pr.user.avatar_url },
  }
}

// ============================================================================
// NEW: Pull Request Operations
// ============================================================================

/**
 * Lists all branches for a repository.
 * Used to populate the head/base branch selectors in the PR creation form.
 * Fetches up to 100 branches — enough for almost all repos.
 */
export async function listRepoBranches(
  token: string,
  owner: string,
  repo: string,
): Promise<GithubBranch[]> {
  try {
    return await githubFetch<GithubBranch[]>(
      token,
      `/repos/${owner}/${repo}/branches?per_page=100`,
    )
  } catch {
    return []
  }
}

/**
 * Lists open PRs for a repository — fast path, single API call.
 * All returned PRs have mergeableStatus: 'unknown' because GitHub does not
 * include mergeable in list responses. Call getPullRequest() for a specific
 * PR to get its real mergeability status.
 */
export async function listPullRequests(
  token: string,
  owner: string,
  repo: string,
): Promise<NormalisedPR[]> {
  const rawList = await githubFetch<GithubPullRequest[]>(
    token,
    `/repos/${owner}/${repo}/pulls?state=open&per_page=30&sort=updated&direction=desc`,
  )
  // normalisePR will produce mergeableStatus: 'unknown' for all items here
  // because the list endpoint always returns mergeable: null
  return rawList.map(normalisePR)
}

/**
 * Fetches a single PR with full detail including real mergeability status.
 * Called lazily when the user expands/selects a PR in the UI — never on list load.
 *
 * GitHub computes mergeability lazily on first request. If mergeableStatus comes
 * back as 'unknown' it means GitHub is still computing — the UI should retry
 * after a short delay (3-5 seconds is usually enough).
 */
export async function getPullRequest(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<NormalisedPR> {
  const raw = await githubFetch<GithubPullRequest>(
    token,
    `/repos/${owner}/${repo}/pulls/${prNumber}`,
  )
  return normalisePR(raw)
}

/**
 * Creates a new pull request.
 * Returns the normalised PR on success.
 *
 * Common GitHub 422 errors we surface to the controller:
 *   "A pull request already exists for {head}...{base}"
 *   "No commits between {base} and {head}"
 */
export async function createPullRequest(
  token: string,
  params: {
    owner: string
    repo: string
    title: string
    body: string
    head: string  // source branch
    base: string  // target branch
  },
): Promise<NormalisedPR> {
  const raw = await githubFetch<GithubPullRequest>(
    token,
    `/repos/${params.owner}/${params.repo}/pulls`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: params.title,
        body: params.body,
        head: params.head,
        base: params.base,
      }),
    },
  )
  return normalisePR(raw)
}

/**
 * Merges a pull request using the specified merge method.
 * Only call this after confirming mergeableStatus === 'mergeable'.
 *
 * merge_method:
 *   'merge'  → standard merge commit (preserves all commits, adds a merge commit)
 *   'squash' → squash and merge (combines all commits into one clean commit)
 *   'rebase' → rebase and merge (replays commits onto base, no merge commit)
 */
export async function mergePullRequest(
  token: string,
  params: {
    owner: string
    repo: string
    prNumber: number
    mergeMethod: MergeMethod
    commitTitle?: string  // optional custom merge commit title (used for merge + squash)
  },
): Promise<{ merged: boolean; message: string; sha: string }> {
  return githubFetch(
    token,
    `/repos/${params.owner}/${params.repo}/pulls/${params.prNumber}/merge`,
    {
      method: 'PUT',
      body: JSON.stringify({
        merge_method: params.mergeMethod,
        ...(params.commitTitle ? { commit_title: params.commitTitle } : {}),
      }),
    },
  )
}