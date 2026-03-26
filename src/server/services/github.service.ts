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
// Source Context Types
// ============================================================================

export interface GithubSourceContext {
  /** detected framework / language signals, e.g. ["nextjs", "typescript", "prisma"] */
  techStack:       string[]
  /** page/app route paths derived from file tree, e.g. ["/dashboard", "/api/auth/[...nextauth]"] */
  routes:          string[]
  /** API route paths only */
  apiRoutes:       string[]
  /** form field names found in source, e.g. ["email", "password", "username"] */
  formFields:      string[]
  /** validation rule snippets, e.g. ["email required", "password min 8 chars"] */
  validationRules: string[]
  /** key component names, e.g. ["LoginForm", "CheckoutModal", "ProductCard"] */
  componentNames:  string[]
  /** raw summary lines injected verbatim into the AI prompt */
  rawSummaryLines: string[]
}

export type GithubSourceValidationResult =
  | { valid: true;  defaultBranch: string }
  | { valid: false; reason: 'repo_not_found' | 'branch_not_found' | 'error' }

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

/**
 * Like githubFetch but returns null instead of throwing on any error.
 * Used by source context fetching where failures must be non-fatal.
 */
async function githubFetchSafe<T>(
  token: string,
  path: string,
  timeoutMs = 15_000,
): Promise<T | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${GITHUB_API}${path}`, {
      headers: {
        Authorization:          `Bearer ${token}`,
        Accept:                 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: controller.signal,
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
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
// Source Context — Validation
// ============================================================================

/**
 * Validates that both the repo and branch exist and are accessible with the
 * given token. Returns a typed result so the controller can return specific
 * error messages to the UI without catching exceptions.
 *
 * Used by validateGithubSourceHandler (GET /api/github/validate) for
 * debounced live validation in the test run form.
 */
export async function validateGithubRepoAndBranch(
  token:  string,
  owner:  string,
  repo:   string,
  branch: string,
): Promise<GithubSourceValidationResult> {
  try {
    const repoData = await githubFetchSafe<{ default_branch: string; archived: boolean }>(
      token, `/repos/${owner}/${repo}`,
    )
    if (!repoData) return { valid: false, reason: 'repo_not_found' }

    const branchData = await githubFetchSafe<{ name: string }>(
      token, `/repos/${owner}/${repo}/branches/${branch}`,
    )
    if (!branchData) return { valid: false, reason: 'branch_not_found' }

    return { valid: true, defaultBranch: repoData.default_branch }
  } catch {
    return { valid: false, reason: 'error' }
  }
}

// ============================================================================
// Source Context — File Scoring
// ============================================================================

// Hard caps to avoid blowing the AI prompt budget
const MAX_FILES        = 40
const MAX_TOTAL_BYTES  = 80_000  // 80 KB decoded across all files
const MAX_FILE_BYTES   = 12_000  // 12 KB per file — skip giant generated files

const SCORE_RULES: [RegExp, number][] = [
  // API routes (highest value)
  [/\/(api|app\/api)\//i,                            10],
  // Next.js app router pages
  [/app\/.*\/(page|layout|route)\.(tsx?|jsx?)$/i,    9],
  // Next.js pages router
  [/pages\/(?!_app|_document)[^/]+\.(tsx?|jsx?)$/i,  8],
  // Form components
  [/(form|modal|dialog|checkout|login|signup|register|auth)/i, 7],
  // Schema / validation
  [/(schema|validation|zod|yup|validate)\.(tsx?|jsx?|ts?)$/i,  7],
  // General components
  [/components?\//i,                                 5],
  // Hooks
  [/hooks?\//i,                                      4],
  // Config / env (framework signals)
  [/(next\.config|package\.json|tsconfig)/i,         3],
  // Everything else
  [/.*/,                                             1],
]

function scoreFile(path: string): number {
  for (const [re, score] of SCORE_RULES) {
    if (re.test(path)) return score
  }
  return 1
}

const SKIP_PATTERNS = [
  /node_modules/,
  /\.next\//,
  /\.git\//,
  /dist\//,
  /build\//,
  /\.cache\//,
  /coverage\//,
  /\.(png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|pdf|zip|lock)$/i,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
  /bun\.lockb$/,
]

function shouldSkip(path: string): boolean {
  return SKIP_PATTERNS.some((re) => re.test(path))
}

// ============================================================================
// Source Context — Content Parsers
// ============================================================================

function extractRoutes(files: { path: string }[]): { routes: string[]; apiRoutes: string[] } {
  const routes: string[] = []
  const apiRoutes: string[] = []

  for (const { path } of files) {
    // Next.js app router: app/**/page.tsx → /segment/[param]
    const appPage = path.match(/^(?:src\/)?app(\/.*?)\/page\.(tsx?|jsx?)$/)
    if (appPage) {
      const route = (appPage[1] ?? '').replace(/\(.*?\)\//g, '') || '/'
      if (route.startsWith('/api')) apiRoutes.push(route)
      else routes.push(route || '/')
      continue
    }

    // Next.js app router: app/**/route.tsx → API
    const appRoute = path.match(/^(?:src\/)?app(\/.*?)\/route\.(tsx?|jsx?)$/)
    if (appRoute) {
      const route = (appRoute[1] ?? '').replace(/\(.*?\)\//g, '')
      apiRoutes.push(route)
      continue
    }

    // Next.js pages router: pages/foo/bar.tsx → /foo/bar
    const pagesRoute = path.match(/^(?:src\/)?pages(\/.*?)\.(tsx?|jsx?)$/)
    if (pagesRoute) {
      const route = (pagesRoute[1] ?? '').replace(/\/index$/, '') || '/'
      if (route.startsWith('/api')) apiRoutes.push(route)
      else routes.push(route)
    }
  }

  return {
    routes:    [...new Set(routes)].sort(),
    apiRoutes: [...new Set(apiRoutes)].sort(),
  }
}

function extractTechStack(files: { path: string; content: string }[]): string[] {
  const signals = new Set<string>()

  for (const { path, content } of files) {
    if (path === 'package.json') {
      try {
        const pkg = JSON.parse(content) as {
          dependencies?: Record<string, string>
          devDependencies?: Record<string, string>
        }
        const deps = { ...pkg.dependencies, ...pkg.devDependencies }
        if (deps['next'])        signals.add('nextjs')
        if (deps['react'])       signals.add('react')
        if (deps['vue'])         signals.add('vue')
        if (deps['nuxt'])        signals.add('nuxt')
        if (deps['svelte'])      signals.add('svelte')
        if (deps['prisma'])      signals.add('prisma')
        if (deps['drizzle-orm']) signals.add('drizzle')
        if (deps['mongoose'])    signals.add('mongodb')
        if (deps['typeorm'])     signals.add('typeorm')
        if (deps['zod'])         signals.add('zod')
        if (deps['yup'])         signals.add('yup')
        if (deps['stripe'])      signals.add('stripe')
        if (deps['@auth/core'] || deps['next-auth'] || deps['better-auth']) signals.add('auth')
        if (deps['tailwindcss']) signals.add('tailwind')
        if (deps['@tanstack/react-query']) signals.add('react-query')
      } catch { /* malformed package.json */ }
    }
    if (path.endsWith('.ts') || path.endsWith('.tsx')) signals.add('typescript')
    if (path.match(/\.test\.|\.spec\./)) signals.add('tests')
  }

  return [...signals].sort()
}

function extractFormFields(content: string): string[] {
  const fields = new Set<string>()
  // name="field" or name='field'
  for (const m of content.matchAll(/name=["']([a-zA-Z_][\w.]*?)["']/g)) fields.add(m[1]!)
  // register("field") — react-hook-form
  for (const m of content.matchAll(/register\(["']([a-zA-Z_][\w.]*?)["']/g)) fields.add(m[1]!)
  // z.object({ field: ... }) — zod
  for (const m of content.matchAll(/(\w+)\s*:\s*z\./g)) fields.add(m[1]!)
  return [...fields].filter((f) => f.length > 1 && f.length < 40)
}

function extractValidationRules(content: string): string[] {
  const rules: string[] = []
  // Zod chains: z.string().min(8).max(100) etc.
  for (const m of content.matchAll(/(\w+)\s*:\s*z\.\w+\(\)([^,\n}]+)/g)) {
    const field = m[1]!
    const chain = m[2]!
    const parts: string[] = []
    if (chain.includes('.min('))      parts.push('min length')
    if (chain.includes('.max('))      parts.push('max length')
    if (chain.includes('.email()'))   parts.push('email format')
    if (chain.includes('.url()'))     parts.push('URL format')
    if (chain.includes('.regex('))    parts.push('regex pattern')
    if (chain.includes('.optional()')) parts.push('optional')
    if (parts.length > 0) rules.push(`${field}: ${parts.join(', ')}`)
  }
  return rules.slice(0, 20) // cap to avoid prompt bloat
}

function extractComponentNames(content: string, path: string): string[] {
  const names: string[] = []
  // export default function Foo / export function Foo / const Foo = ...
  for (const m of content.matchAll(
    /export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z][a-zA-Z0-9]+)/g,
  )) {
    names.push(m[1]!)
  }
  // Fallback: derive from filename
  if (names.length === 0) {
    const base = path.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '')
    if (base && /^[A-Z]/.test(base)) names.push(base)
  }
  return names
}

// ============================================================================
// Source Context — Main Fetch
// ============================================================================

/**
 * Fetches source code context from a GitHub repo to enrich AI test generation.
 *
 * Returns null (non-fatal) when:
 *   - token is missing / invalid (user logged in with email, not GitHub)
 *   - repo or branch does not exist
 *   - any network / timeout error occurs
 *
 * The pipeline must always check for null and skip enrichment gracefully.
 * Never throws — all errors are caught internally.
 */
export async function fetchGithubSourceContext(
  userId: string,
  owner:  string,
  repo:   string,
  branch: string,
): Promise<GithubSourceContext | null> {
  // Guard: user must have a GitHub token — email-only users return null immediately
  const token = await getGithubToken(userId)
  if (!token) {
    console.log(`[GithubSource] No token for user ${userId} — skipping source context`)
    return null
  }

  console.log(`[GithubSource] Fetching source context: ${owner}/${repo}@${branch}`)

  // ── Step 1: Recursive file tree ────────────────────────────────────────────
  const treeData = await githubFetchSafe<{
    tree: { path: string; type: string; size?: number }[]
    truncated: boolean
  }>(token, `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`)

  if (!treeData) {
    console.warn(`[GithubSource] Could not fetch tree for ${owner}/${repo}@${branch}`)
    return null
  }

  if (treeData.truncated) {
    console.warn(`[GithubSource] Tree truncated for ${owner}/${repo} — large repo`)
  }

  // ── Step 2: Score + select files ───────────────────────────────────────────
  const blobs = treeData.tree
    .filter((item) => item.type === 'blob' && !shouldSkip(item.path))
    .map((item) => ({ path: item.path, score: scoreFile(item.path), size: item.size ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_FILES)

  // ── Step 3: Fetch file contents in parallel (cap total bytes) ──────────────
  let totalBytes = 0
  const fetchedFiles: { path: string; content: string }[] = []

  const contentResults = await Promise.allSettled(
    blobs.map(async ({ path, size }) => {
      if (size > MAX_FILE_BYTES) return null
      const data = await githubFetchSafe<{ content?: string; encoding?: string }>(
        token,
        `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      )
      if (!data?.content || data.encoding !== 'base64') return null
      const decoded = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf-8')
      return { path, content: decoded }
    }),
  )

  for (const result of contentResults) {
    if (result.status !== 'fulfilled' || !result.value) continue
    const { path, content } = result.value
    const bytes = Buffer.byteLength(content, 'utf-8')
    if (totalBytes + bytes > MAX_TOTAL_BYTES) break
    totalBytes += bytes
    fetchedFiles.push({ path, content })
  }

  console.log(
    `[GithubSource] Fetched ${fetchedFiles.length} files, ${(totalBytes / 1000).toFixed(1)} KB`,
  )

  // ── Step 4: Parse ──────────────────────────────────────────────────────────
  const { routes, apiRoutes } = extractRoutes([...blobs, ...fetchedFiles])
  const techStack = extractTechStack(fetchedFiles)

  const formFields:      string[] = []
  const validationRules: string[] = []
  const componentNames:  string[] = []

  for (const { path, content } of fetchedFiles) {
    formFields.push(...extractFormFields(content))
    validationRules.push(...extractValidationRules(content))
    componentNames.push(...extractComponentNames(content, path))
  }

  const uniqueFormFields   = [...new Set(formFields)].slice(0, 30)
  const uniqueValidation   = [...new Set(validationRules)].slice(0, 20)
  const uniqueComponents   = [...new Set(componentNames)].slice(0, 40)

  // ── Step 5: Raw summary lines for the AI prompt ────────────────────────────
  const rawSummaryLines: string[] = [
    `Repository: ${owner}/${repo} @ ${branch}`,
    `Tech stack: ${techStack.join(', ') || 'unknown'}`,
    routes.length > 0    ? `Page routes (${routes.length}): ${routes.slice(0, 20).join(', ')}` : '',
    apiRoutes.length > 0 ? `API routes (${apiRoutes.length}): ${apiRoutes.slice(0, 20).join(', ')}` : '',
    uniqueFormFields.length > 0  ? `Form fields found: ${uniqueFormFields.join(', ')}` : '',
    uniqueValidation.length > 0  ? `Validation rules: ${uniqueValidation.join(' | ')}` : '',
    uniqueComponents.length > 0  ? `Key components: ${uniqueComponents.slice(0, 20).join(', ')}` : '',
  ].filter(Boolean)

  return {
    techStack,
    routes,
    apiRoutes,
    formFields:      uniqueFormFields,
    validationRules: uniqueValidation,
    componentNames:  uniqueComponents,
    rawSummaryLines,
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
        author: {
          name: 'Buildify',
          email: 'notifications@technotribes.org',
          date: new Date().toISOString(),
        },
        committer: {
          name: 'Buildify',
          email: 'notifications@technotribes.org',
          date: new Date().toISOString(),
        },
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