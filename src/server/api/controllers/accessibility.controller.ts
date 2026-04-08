import { getSession } from '@/server/better-auth/server'
import { db } from '@/server/db'
import {
  accessibility_test_runs,
  accessibility_page_results,
} from '@/server/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { runAccessibilityTest } from '@/server/services/accessibility.service'
import { generateAccessibilityReport } from '@/server/services/accessibility-report.service'
import { uploadPdfReport } from '@/server/services/s3.service'
import type {
  AccessibilityTestConfig,
  SSEEvent,
  ComplianceStandard,
} from '@/types/accessibility.types'

// Rate limiting: 10 tests per user per 24 hours
const testRateLimitMap = new Map<string, { count: number; windowStart: number }>()

setInterval(() => {
  const now = Date.now()
  const windowMs = 24 * 60 * 60 * 1000
  for (const [key, entry] of testRateLimitMap) {
    if (now - entry.windowStart >= windowMs) {
      testRateLimitMap.delete(key)
    }
  }
}, 60 * 60 * 1000)

const MAX_TESTS_PER_DAY = 10

export async function startAccessibilityTestHandler({
  body,
}: {
  body: { url: string; standards: string[]; maxPages?: number; maxDepth?: number }
}): Promise<Response | { error: string; status: number }> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 }
  }

  const userId = session.user.id

  // Rate limiting
  const now = Date.now()
  const windowMs = 24 * 60 * 60 * 1000
  const entry = testRateLimitMap.get(userId)
  if (entry && now - entry.windowStart < windowMs) {
    if (entry.count >= MAX_TESTS_PER_DAY) {
      return {
        error: 'You have exceeded the maximum number of accessibility tests for today. Please try again later.',
        status: 429,
      }
    }
    entry.count++
  } else {
    testRateLimitMap.set(userId, { count: 1, windowStart: now })
  }

  // Validate URL
  let normalizedUrl = body.url.trim()
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  const config: AccessibilityTestConfig = {
    url: normalizedUrl,
    standards: body.standards as ComplianceStandard[],
    maxPages: body.maxPages,
    maxDepth: body.maxDepth,
  }

  const testRunId = nanoid()
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      const collectedLogs: SSEEvent[] = []

      const send = (event: SSEEvent) => {
        collectedLogs.push(event)
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // Controller closed
        }
      }

      // Heartbeat interval
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 15000)

      try {
        // Create DB record
        await db.insert(accessibility_test_runs).values({
          id: testRunId,
          user_id: userId,
          target_url: normalizedUrl,
          standards: JSON.stringify(config.standards),
          status: 'crawling',
          max_pages: config.maxPages ?? 20,
          max_depth: config.maxDepth ?? 3,
          started_at: new Date(),
        })

        // Run test
        const { summary, pageResults , browser } = await runAccessibilityTest(config, send)

        // Update status
        await db
          .update(accessibility_test_runs)
          .set({ status: 'generating_report' })
          .where(eq(accessibility_test_runs.id, testRunId))

        send({ type: 'report:generating' })

        // Save page results
        for (const page of pageResults) {
          await db.insert(accessibility_page_results).values({
            id: nanoid(),
            test_run_id: testRunId,
            page_url: page.url,
            page_title: page.title,
            violation_count: page.violations.length,
            pass_count: page.passes.length,
            incomplete_count: page.incomplete.length,
            inapplicable_count: page.inapplicable.length,
            violations: JSON.stringify(page.violations),
            passes: JSON.stringify(page.passes),
            incomplete: JSON.stringify(page.incomplete),
          })
        }

        // Generate PDF report (returns base64 string)
        const pdfBase64 = await generateAccessibilityReport({
      targetUrl: normalizedUrl,
      standards: config.standards,
      testDate: new Date().toISOString(),
      summary,
      pageResults,
      }, browser)

        // Decide storage method: if large, upload to S3 and store URL instead of base64
        // Heuristic: if base64 length > ~6MB (approx 8,000,000 chars), avoid DB bloat/limits
        const MAX_INLINE_BASE64_CHARS = 8_000_000
        let pdfStorageValue: string | null = null
        let storedAsUrl = false

        try {
          const hostname = new URL(normalizedUrl).hostname.replace(/[^a-z0-9.-]/gi, '-')
          const pdfBuffer = Buffer.from(pdfBase64, 'base64')

          if (pdfBase64.length > MAX_INLINE_BASE64_CHARS) {
            const url = await uploadPdfReport({
              buffer: pdfBuffer,
              testRunId,
              hostname,
            })
            if (url) {
              pdfStorageValue = url
              storedAsUrl = true
            } else {
              // Fallback: only store a small placeholder marker to avoid huge statements
              pdfStorageValue = '__A11Y_PDF_STORED_EXTERNALLY_BUT_UPLOAD_FAILED__'
            }
          } else {
            // Small enough — store inline (maintains backward compatibility)
            pdfStorageValue = pdfBase64
          }
        } catch (e) {
          // As a last resort, store a marker; never crash the flow here
          pdfStorageValue = '__A11Y_PDF_STORAGE_ERROR__'
        }

        // Emit completion only after storage step, so UI reflects durable success
        send({ type: 'report:complete', testRunId, storedAsUrl })

        // Update test run with results + logs
        await db
          .update(accessibility_test_runs)
          .set({
            status: 'completed',
            total_pages_tested: summary.totalPages,
            total_violations: summary.totalViolations,
            total_passes: summary.totalPasses,
            total_incomplete: summary.totalIncomplete,
            logs: JSON.stringify(collectedLogs),
            // Back-compat: same column now stores either base64 or a public https URL string
            pdf_report_base64: pdfStorageValue,
            completed_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(accessibility_test_runs.id, testRunId))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        send({ type: 'error', message, fatal: true })

        // Save logs even on failure
        await db
          .update(accessibility_test_runs)
          .set({
            status: 'failed',
            error_message: message,
            logs: JSON.stringify(collectedLogs),
            completed_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(accessibility_test_runs.id, testRunId))
          .catch(() => undefined)
      } finally {
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {
          // Already closed
        }
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function getTestHistoryHandler(): Promise<
  | Array<{
      id: string
      targetUrl: string
      standards: string[]
      status: string
      totalPagesTested: number | null
      totalViolations: number | null
      totalPasses: number | null
      createdAt: string
      completedAt: string | null
    }>
  | { error: string; status: number }
> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 }
  }

  const runs = await db
    .select({
      id: accessibility_test_runs.id,
      target_url: accessibility_test_runs.target_url,
      standards: accessibility_test_runs.standards,
      status: accessibility_test_runs.status,
      total_pages_tested: accessibility_test_runs.total_pages_tested,
      total_violations: accessibility_test_runs.total_violations,
      total_passes: accessibility_test_runs.total_passes,
      created_at: accessibility_test_runs.created_at,
      completed_at: accessibility_test_runs.completed_at,
    })
    .from(accessibility_test_runs)
    .where(eq(accessibility_test_runs.user_id, session.user.id))
    .orderBy(desc(accessibility_test_runs.created_at))
    .limit(50)

  return runs.map((r) => ({
    id: r.id,
    targetUrl: r.target_url,
    standards: JSON.parse(r.standards) as string[],
    status: r.status,
    totalPagesTested: r.total_pages_tested,
    totalViolations: r.total_violations,
    totalPasses: r.total_passes,
    createdAt: r.created_at.toISOString(),
    completedAt: r.completed_at?.toISOString() ?? null,
  }))
}

export async function getTestResultsHandler({
  params,
}: {
  params: { id: string }
}): Promise<
  | {
      testRun: {
        id: string
        targetUrl: string
        standards: string[]
        status: string
        totalPagesTested: number | null
        totalViolations: number | null
        totalPasses: number | null
        totalIncomplete: number | null
        createdAt: string
        completedAt: string | null
        errorMessage: string | null
        logs: unknown[]
      }
      pageResults: Array<{
        id: string
        pageUrl: string
        pageTitle: string | null
        violationCount: number
        passCount: number
        incompleteCount: number
        inapplicableCount: number
        violations: unknown[]
        passes: unknown[]
        incomplete: unknown[]
        testedAt: string
      }>
    }
  | { error: string; status: number }
> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 }
  }

  const [testRun] = await db
    .select({
      id: accessibility_test_runs.id,
      target_url: accessibility_test_runs.target_url,
      standards: accessibility_test_runs.standards,
      status: accessibility_test_runs.status,
      total_pages_tested: accessibility_test_runs.total_pages_tested,
      total_violations: accessibility_test_runs.total_violations,
      total_passes: accessibility_test_runs.total_passes,
      total_incomplete: accessibility_test_runs.total_incomplete,
      created_at: accessibility_test_runs.created_at,
      completed_at: accessibility_test_runs.completed_at,
      error_message: accessibility_test_runs.error_message,
      logs: accessibility_test_runs.logs,
      user_id: accessibility_test_runs.user_id,
    })
    .from(accessibility_test_runs)
    .where(
      and(
        eq(accessibility_test_runs.id, params.id),
        eq(accessibility_test_runs.user_id, session.user.id),
      ),
    )
    .limit(1)

  if (!testRun) {
    return { error: 'Test run not found', status: 404 }
  }

  const pageResults = await db
    .select()
    .from(accessibility_page_results)
    .where(eq(accessibility_page_results.test_run_id, params.id))

  return {
    testRun: {
      id: testRun.id,
      targetUrl: testRun.target_url,
      standards: JSON.parse(testRun.standards) as string[],
      status: testRun.status,
      totalPagesTested: testRun.total_pages_tested,
      totalViolations: testRun.total_violations,
      totalPasses: testRun.total_passes,
      totalIncomplete: testRun.total_incomplete,
      createdAt: testRun.created_at.toISOString(),
      completedAt: testRun.completed_at?.toISOString() ?? null,
      errorMessage: testRun.error_message,
      logs: testRun.logs ? (JSON.parse(testRun.logs) as unknown[]) : [],
    },
    pageResults: pageResults.map((p) => ({
      id: p.id,
      pageUrl: p.page_url,
      pageTitle: p.page_title,
      violationCount: p.violation_count,
      passCount: p.pass_count,
      incompleteCount: p.incomplete_count,
      inapplicableCount: p.inapplicable_count,
      violations: JSON.parse(p.violations) as unknown[],
      passes: JSON.parse(p.passes) as unknown[],
      incomplete: JSON.parse(p.incomplete) as unknown[],
      testedAt: p.tested_at.toISOString(),
    })),
  }
}

export async function downloadReportHandler({
  params,
}: {
  params: { id: string }
}): Promise<Response | { error: string; status: number }> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 }
  }

  const [testRun] = await db
    .select({
      pdf_report_base64: accessibility_test_runs.pdf_report_base64,
      user_id: accessibility_test_runs.user_id,
      target_url: accessibility_test_runs.target_url,
    })
    .from(accessibility_test_runs)
    .where(
      and(
        eq(accessibility_test_runs.id, params.id),
        eq(accessibility_test_runs.user_id, session.user.id),
      ),
    )
    .limit(1)

  if (!testRun) {
    return { error: 'Test run not found', status: 404 }
  }

  if (!testRun.pdf_report_base64) {
    return { error: 'Report not yet generated', status: 404 }
  }

  const hostname = new URL(testRun.target_url).hostname.replace(/[^a-z0-9]/gi, '-')

  // If the stored value looks like a public URL, redirect/stream from S3
  if (/^https?:\/\//i.test(testRun.pdf_report_base64)) {
    // 302 redirect allows browser to download directly from S3
    return new Response(null, {
      status: 302,
      headers: {
        Location: testRun.pdf_report_base64,
        'Content-Disposition': `attachment; filename="a11y-report-${hostname}.pdf"`,
      },
    })
  }

  // Backward compatibility: value is inline base64
  try {
    const pdfBuffer = Buffer.from(testRun.pdf_report_base64, 'base64')
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="a11y-report-${hostname}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch {
    return { error: 'Stored report is not available', status: 404 }
  }
}

export async function deleteTestRunHandler({
  params,
}: {
  params: { id: string }
}): Promise<{ success: boolean } | { error: string; status: number }> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 }
  }

  const [testRun] = await db
    .select({ id: accessibility_test_runs.id })
    .from(accessibility_test_runs)
    .where(
      and(
        eq(accessibility_test_runs.id, params.id),
        eq(accessibility_test_runs.user_id, session.user.id),
      ),
    )
    .limit(1)

  if (!testRun) {
    return { error: 'Test run not found', status: 404 }
  }

  await db
    .delete(accessibility_test_runs)
    .where(eq(accessibility_test_runs.id, params.id))

  return { success: true }
}
