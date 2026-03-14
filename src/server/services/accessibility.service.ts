import { type Browser, type Page } from 'puppeteer'
import { launchBrowser } from '@/lib/browser'
import type {
  AccessibilityTestConfig,
  SSEEvent,
  TestSummary,
  PageResult,
  AxeViolation,
  ComplianceStandard,
} from '@/types/accessibility.types'

let activeTests = 0
const MAX_CONCURRENT_TESTS = 3

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^0\.0\.0\.0$/,
  /^\[::1\]$/,
  /^::1$/,
]

const SKIP_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|webp|ico|pdf|zip|tar|gz|mp3|mp4|wav|avi|mov|woff|woff2|ttf|eot|css|js|json|xml)$/i
const SKIP_PREFIXES = ['mailto:', 'tel:', 'javascript:', '#', 'data:']

function isPrivateUrl(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some((p) => p.test(hostname))
}

function normalizeUrl(raw: string, base: string): string | null {
  try {
    const url = new URL(raw, base)
    url.hash = ''
    let normalized = url.href
    if (normalized.endsWith('/') && url.pathname !== '/') {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  } catch {
    return null
  }
}

function mapAxeTags(standards: ComplianceStandard[]): string[] {
  const tagMap: Record<ComplianceStandard, string> = {
    'wcag2a': 'wcag2a',
    'wcag2aa': 'wcag2aa',
    'wcag21a': 'wcag21a',
    'wcag21aa': 'wcag21aa',
    'best-practice': 'best-practice',
  }
  return standards.map((s) => tagMap[s])
}

async function crawlPages(
  seedUrl: string,
  maxPages: number,
  maxDepth: number,
  browser: Browser,
  onEvent: (event: SSEEvent) => void,
): Promise<string[]> {
  const visited = new Set<string>()
  const queue: Array<{ url: string; depth: number }> = [{ url: seedUrl, depth: 0 }]
  const discovered: string[] = []
  const seedOrigin = new URL(seedUrl).origin

  while (queue.length > 0 && discovered.length < maxPages) {
    const item = queue.shift()!
    if (visited.has(item.url) || item.depth > maxDepth) continue
    visited.add(item.url)
    discovered.push(item.url)

    onEvent({ type: 'crawl:page_discovered', url: item.url, count: discovered.length })

    if (discovered.length >= maxPages) break

    let page: Page | null = null
    try {
      page = await browser.newPage()
      page.setDefaultNavigationTimeout(10000)
      await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 10000 })

      const links: string[] = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]'), (a) => a.getAttribute('href') ?? ''),
      )

      for (const link of links) {
        if (SKIP_PREFIXES.some((p) => link.startsWith(p))) continue
        if (SKIP_EXTENSIONS.test(link)) continue
        if (link.includes('/api/')) continue

        const normalized = normalizeUrl(link, item.url)
        if (!normalized) continue

        try {
          const linkUrl = new URL(normalized)
          if (linkUrl.origin !== seedOrigin) continue
          if (visited.has(normalized)) continue
          queue.push({ url: normalized, depth: item.depth + 1 })
        } catch {
          continue
        }
      }

      await new Promise((r) => setTimeout(r, 500))
    } catch {
      // Page failed to load — skip but continue crawling
    } finally {
      if (page) void page.close().catch(() => undefined)
    }
  }

  return discovered
}

export async function runAccessibilityTest(
  config: AccessibilityTestConfig,
  onEvent: (event: SSEEvent) => void,
): Promise<{ summary: TestSummary; pageResults: PageResult[] }> {
  if (activeTests >= MAX_CONCURRENT_TESTS) {
    throw new Error('Too many concurrent tests. Please try again later.')
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(config.url)
  } catch {
    throw new Error('Invalid URL provided.')
  }

  if (isPrivateUrl(parsedUrl.hostname)) {
    throw new Error('Testing internal/private URLs is not allowed.')
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS URLs are supported.')
  }

  const maxPages = Math.min(Math.max(config.maxPages ?? 20, 1), 50)
  const maxDepth = Math.min(Math.max(config.maxDepth ?? 3, 1), 5)
  const tags = mapAxeTags(config.standards)

  activeTests++
  let browser: Browser | null = null

  try {
    browser = await launchBrowser()

    // Phase 1: Crawl
    onEvent({ type: 'crawl:start', url: config.url, timestamp: new Date().toISOString() })

    const pages = await crawlPages(config.url, maxPages, maxDepth, browser, onEvent)

    onEvent({ type: 'crawl:complete', totalPages: pages.length })
    onEvent({ type: 'progress', phase: 'crawling', current: pages.length, total: pages.length, percentage: 100 })

    // Phase 2: Test each page
    const { AxePuppeteer } = await import('@axe-core/puppeteer')
    // Pre-load axe-core source to avoid require.resolve failures in serverless
    const { readFileSync } = await import('fs')
    const { resolve, dirname } = await import('path')
    let axeSource: string | undefined
    try {
      const axeCorePath = resolve(dirname(require.resolve('axe-core')), 'axe.min.js')
      axeSource = readFileSync(axeCorePath, 'utf-8')
    } catch {
      // Fallback: let AxePuppeteer try to resolve it itself
    }
    const pageResults: PageResult[] = []
    const summary: TestSummary = {
      totalPages: 0,
      totalViolations: 0,
      totalPasses: 0,
      totalIncomplete: 0,
      criticalCount: 0,
      seriousCount: 0,
      moderateCount: 0,
      minorCount: 0,
    }

    for (let i = 0; i < pages.length; i++) {
      const pageUrl = pages[i]!
      onEvent({
        type: 'test:start',
        url: pageUrl,
        pageIndex: i + 1,
        totalPages: pages.length,
      })
      onEvent({
        type: 'progress',
        phase: 'testing',
        current: i + 1,
        total: pages.length,
        percentage: Math.round(((i + 1) / pages.length) * 100),
      })

      let page: Page | null = null
      try {
        page = await browser.newPage()
        page.setDefaultNavigationTimeout(15000)
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 15000 })

        const results = await new AxePuppeteer(page, axeSource).withTags(tags).analyze()
        const title = await page.title()

        const violations: AxeViolation[] = results.violations.map((v) => ({
          id: v.id,
          impact: v.impact as AxeViolation['impact'],
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          tags: v.tags,
          nodes: v.nodes.map((n) => ({
            html: n.html,
            target: n.target.map(String),
            failureSummary: n.failureSummary ?? '',
          })),
        }))

        for (const v of violations) {
          onEvent({
            type: 'test:violation',
            url: pageUrl,
            ruleId: v.id,
            impact: v.impact,
            description: v.description,
            nodeCount: v.nodes.length,
          })
        }

        const pageResult: PageResult = {
          url: pageUrl,
          title,
          violations,
          passes: results.passes.map((p) => ({
            id: p.id,
            description: p.description,
            help: p.help,
            tags: p.tags,
          })),
          incomplete: results.incomplete.map((inc) => ({
            id: inc.id,
            description: inc.description,
            help: inc.help,
            impact: inc.impact ?? 'moderate',
            tags: inc.tags,
          })),
          inapplicable: results.inapplicable.map((ia) => ({
            id: ia.id,
            description: ia.description,
            tags: ia.tags,
          })),
        }

        pageResults.push(pageResult)

        summary.totalPages++
        summary.totalViolations += violations.length
        summary.totalPasses += pageResult.passes.length
        summary.totalIncomplete += pageResult.incomplete.length

        for (const v of violations) {
          switch (v.impact) {
            case 'critical': summary.criticalCount++; break
            case 'serious': summary.seriousCount++; break
            case 'moderate': summary.moderateCount++; break
            case 'minor': summary.minorCount++; break
          }
        }

        onEvent({
          type: 'test:page_complete',
          url: pageUrl,
          violationCount: violations.length,
          passCount: pageResult.passes.length,
          incompleteCount: pageResult.incomplete.length,
        })
      } catch (err) {
        onEvent({
          type: 'error',
          message: `Failed to test ${pageUrl}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          fatal: false,
        })
      } finally {
        if (page) void page.close().catch(() => undefined)
      }
    }

    onEvent({ type: 'test:complete', summary })

    return { summary, pageResults }
  } finally {
    activeTests--
    if (browser) void browser.close().catch(() => undefined)
  }
}
