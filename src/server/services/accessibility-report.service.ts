import type { TestSummary, PageResult, ComplianceStandard } from '@/types/accessibility.types'

interface ReportData {
  targetUrl: string
  standards: ComplianceStandard[]
  testDate: string
  summary: TestSummary
  pageResults: PageResult[]
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function impactColor(impact: string): string {
  switch (impact) {
    case 'critical': return '#dc2626'
    case 'serious': return '#ea580c'
    case 'moderate': return '#ca8a04'
    case 'minor': return '#6b7280'
    default: return '#6b7280'
  }
}

function impactBgColor(impact: string): string {
  switch (impact) {
    case 'critical': return '#fef2f2'
    case 'serious': return '#fff7ed'
    case 'moderate': return '#fefce8'
    case 'minor': return '#f9fafb'
    default: return '#f9fafb'
  }
}

function standardLabel(s: ComplianceStandard): string {
  const map: Record<ComplianceStandard, string> = {
    'wcag2a': 'WCAG 2.0 Level A',
    'wcag2aa': 'WCAG 2.0 Level AA',
    'wcag21a': 'WCAG 2.1 Level A',
    'wcag21aa': 'WCAG 2.1 Level AA',
    'best-practice': 'Best Practices',
  }
  return map[s]
}

function generateHtmlReport(data: ReportData): string {
  const complianceScore =
    data.summary.totalPasses + data.summary.totalViolations > 0
      ? Math.round(
          (data.summary.totalPasses / (data.summary.totalPasses + data.summary.totalViolations)) * 100,
        )
      : 100

  // Find top recommendations (most frequent violations)
  const violationFrequency = new Map<string, { count: number; description: string; impact: string; helpUrl: string }>()
  for (const page of data.pageResults) {
    for (const v of page.violations) {
      const existing = violationFrequency.get(v.id)
      if (existing) {
        existing.count++
      } else {
        violationFrequency.set(v.id, {
          count: 1,
          description: v.help,
          impact: v.impact,
          helpUrl: v.helpUrl,
        })
      }
    }
  }
  const topRecommendations = Array.from(violationFrequency.entries())
    .sort((a, b) => {
      const impactOrder: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 }
      const impactDiff = (impactOrder[a[1].impact] ?? 4) - (impactOrder[b[1].impact] ?? 4)
      if (impactDiff !== 0) return impactDiff
      return b[1].count - a[1].count
    })
    .slice(0, 10)

  const pageBreakdown = data.pageResults
    .map((page) => {
      const violationCards = page.violations
        .map((v) => {
          const nodeSnippets = v.nodes
            .slice(0, 3)
            .map(
              (n) => `<div style="background:#f8f8f8;border:1px solid #e5e5e5;border-radius:4px;padding:8px;margin:4px 0;font-family:monospace;font-size:11px;word-break:break-all;">${escapeHtml(n.html)}</div>`,
            )
            .join('')
          const moreNodes = v.nodes.length > 3 ? `<p style="color:#6b7280;font-size:12px;">...and ${v.nodes.length - 3} more elements</p>` : ''

          return `
            <div style="border:1px solid #e5e5e5;border-left:4px solid ${impactColor(v.impact)};border-radius:4px;padding:12px;margin:8px 0;background:${impactBgColor(v.impact)};">
              <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
                <span style="background:${impactColor(v.impact)};color:white;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600;text-transform:uppercase;">${v.impact}</span>
                <code style="font-size:12px;color:#374151;">${escapeHtml(v.id)}</code>
              </div>
              <p style="margin:4px 0;font-size:13px;">${escapeHtml(v.description)}</p>
              <p style="margin:4px 0;font-size:12px;color:#4b5563;">${escapeHtml(v.help)}</p>
              ${nodeSnippets}
              ${moreNodes}
              <p style="margin:4px 0;font-size:11px;"><a href="${escapeHtml(v.helpUrl)}" style="color:#2563eb;">Learn more</a></p>
            </div>`
        })
        .join('')

      return `
        <div style="page-break-inside:avoid;margin:16px 0;border:1px solid #d1d5db;border-radius:6px;padding:16px;">
          <h3 style="margin:0 0 4px;font-size:14px;color:#111827;">${escapeHtml(page.title || page.url)}</h3>
          <p style="margin:0 0 12px;font-size:12px;color:#6b7280;">${escapeHtml(page.url)}</p>
          <div style="display:flex;gap:16px;margin-bottom:12px;">
            <span style="font-size:12px;"><strong style="color:#dc2626;">${page.violations.length}</strong> violations</span>
            <span style="font-size:12px;"><strong style="color:#16a34a;">${page.passes.length}</strong> passes</span>
            <span style="font-size:12px;"><strong style="color:#ca8a04;">${page.incomplete.length}</strong> incomplete</span>
          </div>
          ${violationCards || '<p style="color:#16a34a;font-size:13px;">No violations found on this page.</p>'}
        </div>`
    })
    .join('')

  const recommendationsList = topRecommendations
    .map(
      ([ruleId, info]) =>
        `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;font-family:monospace;font-size:12px;">${escapeHtml(ruleId)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;"><span style="background:${impactColor(info.impact)};color:white;padding:1px 6px;border-radius:3px;font-size:10px;text-transform:uppercase;">${info.impact}</span></td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;font-size:12px;">${escapeHtml(info.description)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e5e5e5;text-align:center;font-size:12px;">${info.count}</td>
        </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 32px; color: #111827; line-height: 1.5; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 16px; border-bottom: 2px solid #e5e5e5; padding-bottom: 6px; margin: 24px 0 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 6px 10px; background: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <div style="border-bottom:3px solid #2563eb;padding-bottom:16px;margin-bottom:24px;">
    <h1>Accessibility Test Report</h1>
    <p style="margin:4px 0;font-size:13px;color:#6b7280;">Generated on ${escapeHtml(data.testDate)}</p>
    <p style="margin:4px 0;font-size:13px;">Target: <a href="${escapeHtml(data.targetUrl)}" style="color:#2563eb;">${escapeHtml(data.targetUrl)}</a></p>
    <p style="margin:4px 0;font-size:13px;">Standards: ${data.standards.map((s) => `<span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:3px;font-size:11px;margin:0 2px;">${standardLabel(s)}</span>`).join(' ')}</p>
  </div>

  <h2>Executive Summary</h2>
  <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
    <div style="flex:1;min-width:140px;background:#f9fafb;border:1px solid #e5e5e5;border-radius:6px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#111827;">${data.summary.totalPages}</div>
      <div style="font-size:12px;color:#6b7280;">Pages Tested</div>
    </div>
    <div style="flex:1;min-width:140px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#dc2626;">${data.summary.totalViolations}</div>
      <div style="font-size:12px;color:#6b7280;">Total Violations</div>
    </div>
    <div style="flex:1;min-width:140px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#16a34a;">${data.summary.totalPasses}</div>
      <div style="font-size:12px;color:#6b7280;">Total Passes</div>
    </div>
    <div style="flex:1;min-width:140px;background:${complianceScore >= 80 ? '#f0fdf4' : complianceScore >= 50 ? '#fefce8' : '#fef2f2'};border:1px solid #e5e5e5;border-radius:6px;padding:16px;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:${complianceScore >= 80 ? '#16a34a' : complianceScore >= 50 ? '#ca8a04' : '#dc2626'};">${complianceScore}%</div>
      <div style="font-size:12px;color:#6b7280;">Compliance Score</div>
    </div>
  </div>

  <h2>Severity Breakdown</h2>
  <div style="display:flex;gap:12px;margin-bottom:16px;">
    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:8px 16px;border-radius:4px;flex:1;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#dc2626;">${data.summary.criticalCount}</div>
      <div style="font-size:11px;color:#6b7280;">Critical</div>
    </div>
    <div style="background:#fff7ed;border-left:4px solid #ea580c;padding:8px 16px;border-radius:4px;flex:1;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#ea580c;">${data.summary.seriousCount}</div>
      <div style="font-size:11px;color:#6b7280;">Serious</div>
    </div>
    <div style="background:#fefce8;border-left:4px solid #ca8a04;padding:8px 16px;border-radius:4px;flex:1;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#ca8a04;">${data.summary.moderateCount}</div>
      <div style="font-size:11px;color:#6b7280;">Moderate</div>
    </div>
    <div style="background:#f9fafb;border-left:4px solid #6b7280;padding:8px 16px;border-radius:4px;flex:1;text-align:center;">
      <div style="font-size:20px;font-weight:700;color:#6b7280;">${data.summary.minorCount}</div>
      <div style="font-size:11px;color:#6b7280;">Minor</div>
    </div>
  </div>

  ${topRecommendations.length > 0 ? `
  <h2>Top Recommendations</h2>
  <table>
    <thead>
      <tr><th>Rule</th><th>Severity</th><th>Description</th><th>Occurrences</th></tr>
    </thead>
    <tbody>${recommendationsList}</tbody>
  </table>` : ''}

  <h2>Page-by-Page Breakdown</h2>
  ${pageBreakdown}

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:11px;color:#9ca3af;text-align:center;">
    Report generated by Buildify Accessibility Tester &middot; Powered by axe-core
  </div>
</body>
</html>`
}

export async function generateAccessibilityReport(data: ReportData): Promise<string> {
  const html = generateHtmlReport(data)

  const { launchBrowser } = await import('@/lib/browser')
  const browser = await launchBrowser()

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '12mm', bottom: '15mm', left: '12mm' },
    })

    return Buffer.from(pdfBuffer).toString('base64')
  } finally {
    await browser.close().catch(() => undefined)
  }
}
