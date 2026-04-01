import { NextResponse } from 'next/server'

const FALLBACK_MODELS = [
  "arcee-ai/trinity-large-preview:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen2.5-7b-instruct:free",
  "google/gemma-2-9b-it:free"
]

// ─── PageSpeed Insights fetch ─────────────────────────────────────────────
async function fetchPageSpeedData(url: string) {
  const apiKey = process.env.PAGESPEED_API_KEY
  if (!apiKey) return null

  try {
    const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES`
    
    const res = await fetch(psUrl, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    
    const data = await res.json()
    const categories = data.lighthouseResult?.categories
    const audits = data.lighthouseResult?.audits

    // Core Web Vitals
    const lcp = audits?.['largest-contentful-paint']
    const fid = audits?.['max-potential-fid'] ?? audits?.['interactive']
    const cls = audits?.['cumulative-layout-shift']
    const fcp = audits?.['first-contentful-paint']
    const tbt = audits?.['total-blocking-time']
    const si  = audits?.['speed-index']

    return {
      scores: {
        performance: Math.round((categories?.performance?.score ?? 0) * 100),
        seo: Math.round((categories?.seo?.score ?? 0) * 100),
        accessibility: Math.round((categories?.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((categories?.['best-practices']?.score ?? 0) * 100),
      },
      coreWebVitals: {
        lcp: { value: lcp?.displayValue ?? 'N/A', score: lcp?.score ?? null },
        fid: { value: fid?.displayValue ?? 'N/A', score: fid?.score ?? null },
        cls: { value: cls?.displayValue ?? 'N/A', score: cls?.score ?? null },
        fcp: { value: fcp?.displayValue ?? 'N/A', score: fcp?.score ?? null },
        tbt: { value: tbt?.displayValue ?? 'N/A', score: tbt?.score ?? null },
        si:  { value: si?.displayValue  ?? 'N/A', score: si?.score  ?? null },
      },
      opportunities: Object.values(audits ?? {})
        .filter((a: any) => a.details?.type === 'opportunity' && a.score !== null && a.score < 0.9)
        .slice(0, 5)
        .map((a: any) => ({ title: a.title, savings: a.displayValue ?? '' })),
    }
  } catch {
    return null
  }
}

// ─── Score label helper ───────────────────────────────────────────────────
function scoreLabel(score: number | null) {
  if (score === null) return '⚪'
  if (score >= 0.9) return '🟢'
  if (score >= 0.5) return '🟡'
  return '🔴'
}

export async function POST(req: Request) {
  try {
    const { appUrl } = await req.json()

    // Run PageSpeed + HTML fetch in parallel
    const [psData, htmlResult] = await Promise.allSettled([
      fetchPageSpeedData(appUrl),
      (async () => {
        const pageRes = await fetch(appUrl, {
          headers: { 'User-Agent': 'SEO-Audit-Bot/1.0' },
          signal: AbortSignal.timeout(8000),
        })
        const html = await pageRes.text()
        const headMatch = html.match(/<head[\s\S]*?<\/head>/i)
        return headMatch ? headMatch[0].slice(0, 3000) : html.slice(0, 3000)
      })(),
    ])

    const pageSpeedData = psData.status === 'fulfilled' ? psData.value : null
    const pageContent = htmlResult.status === 'fulfilled'
      ? htmlResult.value
      : '(Page not publicly accessible — URL-only analysis)'

    // Build PageSpeed section for the report
    let pageSpeedSection = ''
    if (pageSpeedData) {
      const { scores, coreWebVitals: cwv, opportunities } = pageSpeedData
      pageSpeedSection = `
## 📊 PageSpeed Insights (Real Data)

### Category Scores
| Category | Score |
|---|---|
| 🚀 Performance | ${scores.performance}/100 |
| 🔍 SEO | ${scores.seo}/100 |
| ♿ Accessibility | ${scores.accessibility}/100 |
| ✅ Best Practices | ${scores.bestPractices}/100 |

### Core Web Vitals
| Metric | Value | Status |
|---|---|---|
| LCP (Largest Contentful Paint) | ${cwv.lcp.value} | ${scoreLabel(cwv.lcp.score)} |
| CLS (Cumulative Layout Shift) | ${cwv.cls.value} | ${scoreLabel(cwv.cls.score)} |
| FCP (First Contentful Paint) | ${cwv.fcp.value} | ${scoreLabel(cwv.fcp.score)} |
| TBT (Total Blocking Time) | ${cwv.tbt.value} | ${scoreLabel(cwv.tbt.score)} |
| Speed Index | ${cwv.si.value} | ${scoreLabel(cwv.si.score)} |

> 🟢 Good &nbsp; 🟡 Needs Improvement &nbsp; 🔴 Poor

${opportunities.length > 0 ? `### ⚡ Top Optimization Opportunities\n${opportunities.map(o => `- **${o.title}** ${o.savings}`).join('\n')}` : ''}
`
    } else {
      pageSpeedSection = `\n> ⚠️ PageSpeed data unavailable (localhost or API key missing — deploy your app for real metrics)\n`
    }

    // AI SEO analysis
    for (const model of FALLBACK_MODELS) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: `You are an expert SEO auditor.

Analyze this web app: ${appUrl}

${pageContent !== '(Page not publicly accessible — URL-only analysis)'
  ? `Here is the actual HTML head:\n${pageContent}`
  : `HTML not accessible — do best possible analysis based on URL and typical issues.`
}

${pageSpeedData ? `PageSpeed scores already computed: Performance ${pageSpeedData.scores.performance}/100, SEO ${pageSpeedData.scores.seo}/100` : ''}

Give response in clean markdown format.

Sections:
- SEO Score (/100) — use the PageSpeed SEO score if provided above
- Issues (bullet points)
- Fixes (numbered)
- Improved Meta Title & Description`
              }
            ]
          })
        })

        if (!response.ok) {
          await new Promise(res => setTimeout(res, 1000))
          continue
        }

        const data = await response.json()
        const aiResult = data.choices?.[0]?.message?.content

        if (aiResult) {
          // Combine PageSpeed section + AI analysis
          return NextResponse.json({
            result: pageSpeedSection + '\n---\n\n' + aiResult,
            pageSpeedData, // also send raw data for future UI use
          })
        }
      } catch {
        await new Promise(res => setTimeout(res, 1000))
      }
    }

    // If AI fails, still return PageSpeed data
    return NextResponse.json({
      result: pageSpeedSection + '\n\n> AI analysis unavailable — all models rate-limited.',
      pageSpeedData,
    })

  } catch (err) {
    console.error('SEO audit crash:', err)
    return NextResponse.json({ result: 'Server error while running SEO audit' })
  }
}