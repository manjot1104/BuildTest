import { NextResponse } from 'next/server'

const FALLBACK_MODELS = [
  "arcee-ai/trinity-large-preview:free",
  "mistralai/mistral-7b-instruct:free",
  "qwen/qwen2.5-7b-instruct:free",
  "google/gemma-2-9b-it:free"
]

export async function POST(req: Request) {
  try {
    const { appUrl } = await req.json()

    
    let pageContent = ''
    try {
      const pageRes = await fetch(appUrl, {
        headers: { 'User-Agent': 'SEO-Audit-Bot/1.0' },
        signal: AbortSignal.timeout(8000),
      })
      const html = await pageRes.text()
      // Sirf <head> section lo — SEO ke liye kaafi hai, token limit safe rahegi
      const headMatch = html.match(/<head[\s\S]*?<\/head>/i)
      pageContent = headMatch ? headMatch[0].slice(0, 3000) : html.slice(0, 3000)
    } catch {
    
      pageContent = '(Page not publicly accessible — URL-only analysis)'
    }

    for (const model of FALLBACK_MODELS) {
      try {
        console.log("Trying model:", model)

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

Give response in clean markdown format.

Sections:
- SEO Score (/100)
- Issues (bullet points)
- Fixes
- Improved Meta Title & Description`
              }
            ]
          })
        })

        if (!response.ok) {
          const err = await response.text()
          console.warn(`❌ ${model} failed:`, err)
          await new Promise(res => setTimeout(res, 1000))
          continue
        }

        const data = await response.json()
        const result = data.choices?.[0]?.message?.content

        if (result) {
          console.log("✅ Success with:", model)
          return NextResponse.json({ result })
        }

      } catch (err) {
        console.warn(`⚠️ Error with ${model}:`, err)
        await new Promise(res => setTimeout(res, 1000))
      }
    }

    return NextResponse.json({
      result: "SEO audit failed: All models unavailable (rate-limited or down)"
    })

  } catch (err) {
    console.error("API crash:", err)
    return NextResponse.json({
      result: "Server error while running SEO audit"
    })
  }
}