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
  } catch (error) {
    console.error('Failed to get GitHub token:', error)
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

    const hasRepoScope = githubAcc.scope?.includes('repo') ?? false

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
  } catch (error) {
    console.error('Failed to check GitHub connection status:', error)
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

export type RepoStatus = 'ok' | 'not_found' | 'archived'

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
    return 'ok' // unknown error — let the real operation surface it
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

// ============================================================================
// GitHub API Operations
// ============================================================================

/**
 * Gets the authenticated GitHub user's profile
 */
export async function getGithubUser(token: string): Promise<GithubUser | null> {
  try {
    return await githubFetch<GithubUser>(token, '/user')
  } catch (error) {
    console.error('Failed to get GitHub user:', error)
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
  // First get the SHA of the default branch HEAD
  const refData = await githubFetch<{ object: { sha: string } }>(
    token,
    `/repos/${params.owner}/${params.repo}/git/refs/heads`,
  )

  // refData is an array — get the first ref's SHA (default branch)
  const refs = refData as unknown as Array<{ object: { sha: string }; ref: string }>
  const defaultRef = refs[0]

  if (!defaultRef) {
    throw new Error('No refs found in repository')
  }

  const sha = defaultRef.object.sha

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
 * Pushes multiple files to a branch in a single commit using the Git Tree API.
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

  // Step 1: Get the latest commit SHA on the branch
  const branchData = await githubFetch<{ object: { sha: string } }>(
    token,
    `/repos/${owner}/${repo}/git/refs/heads/${branchName}`,
  )
  const latestCommitSha = branchData.object.sha

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

  // Step 4: Create a new tree with all the blobs
  const newTree = await githubFetch<{ sha: string }>(
    token,
    `/repos/${owner}/${repo}/git/trees`,
    {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: blobs,
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