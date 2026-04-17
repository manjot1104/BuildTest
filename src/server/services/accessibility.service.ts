import type { Page } from 'puppeteer-core'
import { launchBrowser } from '@/lib/browser'
import type { Browser } from 'puppeteer-core'
import type {
  AccessibilityTestConfig,
  SSEEvent,
  TestSummary,
  PageResult,
  AxeViolation,
  ComplianceStandard,
} from '@/types/accessibility.types'
import path from 'path'
import path from 'path'

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

/** Normalize URL: strip hash, strip trailing slash, always produce canonical form */
function normalizeUrl(raw: string, base: string): string | null {
  try {
    const url = new URL(raw, base)
    url.hash = ''
    // url.search = '' // strip query params to avoid duplicates like ?ref=...
    // Always strip trailing slash for dedup (including root "/")
    let normalized = url.href
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  } catch {
    return null
  }
}

function mapAxeTags(standards: ComplianceStandard[]): string[] {
  const tags = new Set<string>()

  for (const standard of standards) {
    switch (standard) {
      case 'wcag2a':
        tags.add('wcag2a')
        break
      case 'wcag2aa':
        // wcag2aa builds on top of wcag2a — need both
        tags.add('wcag2a')
        tags.add('wcag2aa')
        break
      case 'wcag21a':
        tags.add('wcag2a')
        tags.add('wcag21a')
        break
      case 'wcag21aa':
        // wcag21aa builds on top of all previous levels
        tags.add('wcag2a')
        tags.add('wcag2aa')
        tags.add('wcag21a')
        tags.add('wcag21aa')
        break
      case 'best-practice':
        tags.add('best-practice')
        break
    }
  }

  return Array.from(tags)
  const tags = new Set<string>()

  for (const standard of standards) {
    switch (standard) {
      case 'wcag2a':
        tags.add('wcag2a')
        break
      case 'wcag2aa':
        // wcag2aa builds on top of wcag2a — need both
        tags.add('wcag2a')
        tags.add('wcag2aa')
        break
      case 'wcag21a':
        tags.add('wcag2a')
        tags.add('wcag21a')
        break
      case 'wcag21aa':
        // wcag21aa builds on top of all previous levels
        tags.add('wcag2a')
        tags.add('wcag2aa')
        tags.add('wcag21a')
        tags.add('wcag21aa')
        break
      case 'best-practice':
        tags.add('best-practice')
        break
    }
  }

  return Array.from(tags)
}

async function crawlPages(
  seedUrl: string,
  maxPages: number,
  maxDepth: number,
  browser: Browser,
  onEvent: (event: SSEEvent) => void,
): Promise<string[]> {
  const normalizedSeed = normalizeUrl(seedUrl, seedUrl)!
  const visited = new Set<string>()
  const queue: Array<{ url: string; depth: number }> = [{ url: normalizedSeed, depth: 0 }]
  const discovered: string[] = []
  const seedOrigin = new URL(seedUrl).origin

  while (queue.length > 0 && discovered.length < maxPages) {
    const item = queue.shift()!
    if (visited.has(item.url) || item.depth > maxDepth) continue
    visited.add(item.url)
    discovered.push(item.url)
    console.log(`🔍 [A11Y] Crawled (${discovered.length}/${maxPages}): ${item.url}`)

    onEvent({ type: 'crawl:page_discovered', url: item.url, count: discovered.length })

    if (discovered.length >= maxPages) break

    let page: Page | null = null
    try {
      page = await browser.newPage()
      page.setDefaultNavigationTimeout(20000)

      await page.setRequestInterception(true)
      page.on('request', (req) => {
        if (['image', 'font', 'media'].includes(req.resourceType())) {
          req.abort()
        } else {
          req.continue()
        }
      })

      await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 30000 })
      // Universal bot-check detector — wait for it to resolve
      const isBotCheck = await page.evaluate(() => {
        const bodyText = document.body?.innerText?.toLowerCase() ?? ''
        const indicators = [
          'are you a human',
          'confirming',
          'captcha',
          'verify you are human',
          'checking your browser',
          'please wait',
          'just a moment',
          'enable javascript',
          'ddos protection',
          'ray id',
          'cloudflare',
        ]
        return indicators.some((i) => bodyText.includes(i))
      })

      if (isBotCheck) {
        console.warn(`   ⚠️ [CRAWL] Bot check detected on ${item.url}, waiting for resolve...`)
        await page.waitForFunction(
          () => {
            const text = document.body?.innerText?.toLowerCase() ?? ''
            const indicators = [
              'are you a human',
              'confirming',
              'captcha',
              'verify you are human',
              'checking your browser',
              'please wait',
              'just a moment',
              'enable javascript',
              'ddos protection',
              'cloudflare',
            ]
            return !indicators.some((i) => text.includes(i))
          },
          { timeout: 20000, polling: 1000 }
        ).catch(() => console.warn(`   ❌ [CRAWL] Bot check did not resolve for ${item.url}`))
      }

      await new Promise((r) => setTimeout(r, 3000))

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
    } catch (err) {
      console.error(`❌ [CRAWL] Failed to load ${item.url}:`, err instanceof Error ? err.message : err)
    } finally {
      if (page) void page.close().catch(() => undefined)
    }
  }

  return discovered
}

export async function runAccessibilityTest(
  config: AccessibilityTestConfig,
  onEvent: (event: SSEEvent) => void,
): Promise<{ summary: TestSummary; pageResults: PageResult[]; browser: Browser }> {
): Promise<{ summary: TestSummary; pageResults: PageResult[]; browser: Browser }> {
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
  console.log('\n========================================')
  console.log('🚀 [A11Y] Test started')
  console.log('   URL      :', config.url)
  console.log('   Standards:', config.standards)
  console.log('   Max Pages:', maxPages, '| Max Depth:', maxDepth)
  console.log('   Active Tests Running:', activeTests)
  console.log('========================================\n')
  console.log('\n========================================')
  console.log('🚀 [A11Y] Test started')
  console.log('   URL      :', config.url)
  console.log('   Standards:', config.standards)
  console.log('   Max Pages:', maxPages, '| Max Depth:', maxDepth)
  console.log('   Active Tests Running:', activeTests)
  console.log('========================================\n')
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
    const { readFileSync } = await import('fs')
    //const { resolve, dirname } = await import('path')
    let axeSource: string | undefined
    try {
      const axeCorePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js')
      const axeCorePath = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js')
      axeSource = readFileSync(axeCorePath, 'utf-8')
    } catch {
      try {
        const axePackageDir = path.dirname(require.resolve('axe-core/package.json'))
        axeSource = readFileSync(path.join(axePackageDir, 'axe.min.js'), 'utf-8')
      } catch (err) {
        console.error('❌ [A11Y] All axe-core load attempts failed:', err)
      }
    }

    if (!axeSource) {
      console.error('❌ [A11Y] axe-core failed to load — tests will return empty results')
    } else {
      console.log('✅ [A11Y] axe-core loaded successfully, size:', Math.round(axeSource.length / 1024), 'KB')
      // ADD THESE TWO LINES
      console.log('   axeSource type:', typeof axeSource)
      console.log('   axeSource preview:', axeSource?.slice(0, 80))
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
        page.setDefaultNavigationTimeout(30000)
        console.log(`\n🧪 [A11Y] Testing page ${i + 1}/${pages.length}: ${pageUrl}`)

        // Step 1: Navigate
        try {
          await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 })
        } catch {
          // networkidle2 can timeout on pages with websockets/long-polling
          // fall back to domcontentloaded + longer wait
          await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
          await new Promise((r) => setTimeout(r, 5000))
        }

        // Step 2: Wait for page to be fully stable
        await new Promise((r) => setTimeout(r, 3000))

        // Step 3: Verify page is actually ready before handing to axe
       const isReady = await page.evaluate(() => {
  return document.body !== null && document.body.children.length > 0
}).catch(() => false)

console.log(`   Page ready state: ${isReady ? '✅ ready' : '❌ not ready'}`)

if (!isReady) {
  console.warn(`   ⚠️ Page not ready, skipping: ${pageUrl}`)
  onEvent({
    type: 'error',
    message: `Skipping ${pageUrl}: page not ready for analysis`,
    fatal: false,
  })
  continue
}
        console.log(`   Running axe-core analysis...`)
        const pageInfo = await page.evaluate(() => ({
          elementCount: document.querySelectorAll('*').length,
          bodyText: document.body?.innerText?.slice(0, 200) ?? '',
          title: document.title,
        }))
        console.log(`   DOM elements : ${pageInfo.elementCount}`)
        console.log(`   Body preview : ${pageInfo.bodyText.replace(/\n/g, ' ').slice(0, 150)}`)

        let results
let retries = 0
const maxRetries = 2

while (retries <= maxRetries) {
  try {
    console.log(`   Running axe-core analysis... (attempt ${retries + 1})`)
    results = await Promise.race([
      new AxePuppeteer(page as any, axeSource).withTags(tags).analyze(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('axe-core timed out after 30s')), 30_000)
      ),
    ])
    break // success — exit retry loop
  } catch (axeErr) {
    const message = axeErr instanceof Error ? axeErr.message : 'axe analysis failed'
    if (message.includes('Page/Frame is not ready') && retries < maxRetries) {
      retries++
      console.warn(`   ⚠️ Page/Frame not ready, waiting and retrying (${retries}/${maxRetries})...`)
      await new Promise((r) => setTimeout(r, 3000 * retries)) // wait longer each retry
      continue
    }
    // not retryable or max retries reached
    console.error(`   ❌ axe-core failed: ${message}`)
    onEvent({
      type: 'error',
      message: `Skipping ${pageUrl}: ${message}`,
      fatal: false,
    })
    break
  }
}

if (!results) continue // skip this page if all retries failed

        console.log(`   ✅ axe-core analysis complete`)
        console.log(`   Rules that ran:`, results.passes.map(p => p.id))
        console.log(`   Violations found:`, results.violations.map(v => v.id))
        const title = await page.title()
        console.log(`   Title     : "${title}"`)
        console.log(`   Violations: ${results.violations.length}`)
        console.log(`   Passes    : ${results.passes.length}`)
        console.log(`   Incomplete: ${results.incomplete.length}`)
        console.log(`   Title     : "${title}"`)
        console.log(`   Violations: ${results.violations.length}`)
        console.log(`   Passes    : ${results.passes.length}`)
        console.log(`   Incomplete: ${results.incomplete.length}`)

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
          console.log(`   ⚠️  [${(v.impact ?? 'unknown').toUpperCase()}] ${v.id}: ${v.help}`)
          console.log(`   ⚠️  [${(v.impact ?? 'unknown').toUpperCase()}] ${v.id}: ${v.help}`)
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
        /*onEvent({
        /*onEvent({
          type: 'error',
          message: `Failed to test ${pageUrl}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          fatal: false,
        })*/
        console.error(`❌ [A11Y] Page failed: ${pageUrl}`)
        console.error(`   Reason:`, err instanceof Error ? err.message : err)
        })*/
        console.error(`❌ [A11Y] Page failed: ${pageUrl}`)
        console.error(`   Reason:`, err instanceof Error ? err.message : err)
      } finally {
        if (page) void page.close().catch(() => undefined)
      }
    }

    onEvent({ type: 'test:complete', summary })
    console.log('\n========================================')
    console.log('🏁 [A11Y] Test complete')
    console.log('   Pages tested :', summary.totalPages)
    console.log('   Total violations:', summary.totalViolations)
    console.log('   Total passes    :', summary.totalPasses)
    console.log('   Critical :', summary.criticalCount)
    console.log('   Serious  :', summary.seriousCount)
    console.log('   Moderate :', summary.moderateCount)
    console.log('   Minor    :', summary.minorCount)
    console.log('========================================\n')
    return { summary, pageResults, browser }
    console.log('\n========================================')
    console.log('🏁 [A11Y] Test complete')
    console.log('   Pages tested :', summary.totalPages)
    console.log('   Total violations:', summary.totalViolations)
    console.log('   Total passes    :', summary.totalPasses)
    console.log('   Critical :', summary.criticalCount)
    console.log('   Serious  :', summary.seriousCount)
    console.log('   Moderate :', summary.moderateCount)
    console.log('   Minor    :', summary.minorCount)
    console.log('========================================\n')
    return { summary, pageResults, browser }
  } finally {
    activeTests--

    //if (browser) void browser.close().catch(() => undefined)
     // browser is NOT closed here anymore
  // it is passed to generateAccessibilityReport and closed there
  }
}
