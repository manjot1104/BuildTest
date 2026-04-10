import { NextResponse } from 'next/server'
import { env } from '@/env'

const FALLBACK_MODELS = [
  "arcee-ai/trinity-large-preview:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen2.5-7b-instruct:free",
  "google/gemma-2-9b-it:free"
]

// ─── PageSpeed Insights fetch ─────────────────────────────────────────────
async function fetchPageSpeedData(url: string, strategy: 'mobile' | 'desktop' = 'mobile') {
  const apiKey = process.env.PAGESPEED_API_KEY
 
  if (!apiKey) return null

  try {
    const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=${strategy}&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES`

   const res = await fetch(psUrl, { signal: AbortSignal.timeout(15000) })

if (!res.ok) {
  const errorText = await res.text()
  console.log("PageSpeed ERROR:", res.status, errorText)
  return null
}

const data = await res.json()

if (!data.lighthouseResult) {
  console.log("Invalid PageSpeed response:", data)
  return null
}
    const categories = data.lighthouseResult?.categories
    const audits = data.lighthouseResult?.audits

    const lcp = audits?.['largest-contentful-paint']
    const inp = audits?.['interaction-to-next-paint']
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
        inp: { value: inp?.displayValue ?? 'N/A', score: inp?.score ?? null },
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

// ─── PageSpeed section builder ────────────────────────────────────────────
function buildPageSpeedSection(
  mobileData: Awaited<ReturnType<typeof fetchPageSpeedData>>,
  desktopData: Awaited<ReturnType<typeof fetchPageSpeedData>>,
) {
  if (!mobileData && !desktopData) {
    return `\n> ⚠️ PageSpeed data unavailable (localhost or API key missing — deploy your app for real metrics)\n`
  }

  const renderTable = (d: NonNullable<Awaited<ReturnType<typeof fetchPageSpeedData>>>, label: string) => {
    const { scores, coreWebVitals: cwv, opportunities } = d
    return `
### ${label}

#### Category Scores
| Category | Score |
|---|---|
| 🚀 Performance | ${scores.performance}/100 |
| 🔍 SEO | ${scores.seo}/100 |
| ♿ Accessibility | ${scores.accessibility}/100 |
| ✅ Best Practices | ${scores.bestPractices}/100 |

#### Core Web Vitals
| Metric | Value | Status |
|---|---|---|
| LCP (Largest Contentful Paint) | ${cwv.lcp.value} | ${scoreLabel(cwv.lcp.score)} |
| INP (Interaction to Next Paint) | ${cwv.inp.value} | ${scoreLabel(cwv.inp.score)} |
| CLS (Cumulative Layout Shift) | ${cwv.cls.value} | ${scoreLabel(cwv.cls.score)} |
| FCP (First Contentful Paint) | ${cwv.fcp.value} | ${scoreLabel(cwv.fcp.score)} |
| TBT (Total Blocking Time) | ${cwv.tbt.value} | ${scoreLabel(cwv.tbt.score)} |
| Speed Index | ${cwv.si.value} | ${scoreLabel(cwv.si.score)} |

> 🟢 Good &nbsp; 🟡 Needs Improvement &nbsp; 🔴 Poor
${opportunities.length > 0 ? `\n#### ⚡ Top Optimization Opportunities\n${opportunities.map(o => `- **${o.title}** ${o.savings}`).join('\n')}` : ''}
`
  }

  let section = `## 📊 PageSpeed Insights (Real Data)\n`
section += mobileData
  ? renderTable(mobileData, '📱 Mobile')
  : `\n### 📱 Mobile\n❌ Mobile data unavailable\n`

section += desktopData
  ? renderTable(desktopData, '🖥️ Desktop')
  : `\n### 🖥️ Desktop\n❌ Desktop data unavailable\n`
  return section
}

export async function POST(req: Request) {
  try {
    const { appUrl } = await req.json()

    if (!appUrl || typeof appUrl !== 'string' || !appUrl.startsWith('http')) {
      return NextResponse.json({ result: 'Invalid URL provided' }, { status: 400 })
    }

    // Run all 3 fetches in parallel — mobile, desktop, HTML
    const [[mobileData, desktopData], htmlResult] = await Promise.all([
      Promise.all([
        fetchPageSpeedData(appUrl, 'mobile'),
        fetchPageSpeedData(appUrl, 'desktop'),
      ]),
      (async () => {
        const pageRes = await fetch(appUrl, {
          headers: { 'User-Agent': 'SEO-Audit-Bot/1.0' },
         signal: AbortSignal.timeout(30000),
        })
        const html = await pageRes.text()
        const headMatch = html.match(/<head[\s\S]*?<\/head>/i)
        return headMatch ? headMatch[0].slice(0, 3000) : html.slice(0, 3000)
      })().catch(() => null),
    ])

    const pageContent = htmlResult ?? '(Page not publicly accessible — URL-only analysis)'
    const html = pageContent || ''

    const hasSchema    = html.includes('application/ld+json')
    const hasOG        = html.includes('og:title')
    const hasTwitter   = html.includes('twitter:card')
    const hasMetaDesc  = html.includes('name="description"')
    const hasCanonical = html.includes('rel="canonical"')
    const hasRobotsMeta = html.includes('name="robots"')
    const hasH1        = html.includes('<h1')
    const hasAlt       = html.includes('alt=')
    const hasFavicon   = html.includes('rel="icon"')
    const hasViewport  = html.includes('name="viewport"')

    const pageSpeedSection = buildPageSpeedSection(mobileData, desktopData)

    const technicalSeoSection = `
## 🔎 Basic SEO Checks

- Schema Markup: ${hasSchema ? '✅ Present' : '❌ Missing'}
- Open Graph Tags: ${hasOG ? '✅ Present' : '❌ Missing'}
- Twitter Card: ${hasTwitter ? '✅ Present' : '❌ Missing'}
- Meta Description: ${hasMetaDesc ? '✅ Present' : '❌ Missing'}

## ⚙️ Technical SEO

- Canonical Tag: ${hasCanonical ? '✅ Present' : '❌ Missing'}
- Robots Meta Tag: ${hasRobotsMeta ? '✅ Present' : '❌ Missing'}
- Viewport Meta: ${hasViewport ? '✅ Present' : '❌ Missing'}
- Favicon: ${hasFavicon ? '✅ Present' : '❌ Missing'}

## 🧱 Structure & Content

- H1 Tag: ${hasH1 ? '✅ Present' : '❌ Missing'}
- Image Alt Text: ${hasAlt ? '✅ Present' : '❌ Missing'}
`

    // AI SEO analysis
    for (const model of FALLBACK_MODELS) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: `
You are a senior SEO expert with deep knowledge of technical SEO, performance, and modern AI search (Google + ChatGPT + Perplexity).

Perform a DETAILED and PRACTICAL SEO audit.

IMPORTANT:
- Be specific, not generic
- Use the provided HTML + PageSpeed data
- If something is missing, clearly explain impact

---

URL:
${appUrl}

${pageContent !== '(Page not publicly accessible — URL-only analysis)'
  ? `HTML HEAD:\n${pageContent}`
  : `HTML not available — infer issues based on common problems.`}

${mobileData ? `PageSpeed Mobile:
- Performance: ${mobileData.scores.performance}/100
- SEO: ${mobileData.scores.seo}/100` : ''}

${desktopData ? `PageSpeed Desktop:
- Performance: ${desktopData.scores.performance}/100
- SEO: ${desktopData.scores.seo}/100` : ''}

---

## OUTPUT FORMAT (STRICT)

### 🔢 SEO Score (0–100)
- Give score
- Explain reasoning clearly

### 🚨 Critical Issues
- Only important problems
- Explain impact

### ⚙️ Technical SEO Issues
- meta, canonical, robots, schema

### 🧠 AI / Modern SEO
- Is this site optimized for AI search?
- Structured content?
- Clear semantics?

### ⚡ Performance Issues
- Based on PageSpeed or best practices

### 🛠 Fixes (MOST IMPORTANT)
- Practical fixes
- Include CODE

Example:
❌ Missing meta description
✅ Fix:
<meta name="description" content="SEO optimized description" />

### 🎯 Priority
- High / Medium / Low

Be developer-friendly.
Avoid fluff.
Be precise.
Return a HIGH-QUALITY structured report in MARKDOWN.
`
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
          return NextResponse.json({
            result: pageSpeedSection + '\n---\n' + technicalSeoSection + '\n---\n\n' + aiResult,
            mobileData,
            desktopData,
          })
        }
      } catch {
        await new Promise(res => setTimeout(res, 1000))
      }
    }

    // AI fails — still return PageSpeed data
    return NextResponse.json({
      result: pageSpeedSection + '\n\n> AI analysis unavailable — all models rate-limited.',
      mobileData,
      desktopData,
    })

  } catch (err) {
    console.error('SEO audit crash:', err)
    return NextResponse.json({ result: 'Server error while running SEO audit' })
  }
}