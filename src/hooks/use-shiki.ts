import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import type { HighlighterCore } from 'shiki'

let highlighterPromise: Promise<HighlighterCore> | null = null

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then((shiki) =>
      shiki.createHighlighter({
        themes: ['github-dark', 'github-light'],
        langs: [
          'typescript',
          'tsx',
          'javascript',
          'jsx',
          'json',
          'css',
          'html',
          'markdown',
          'mdx',
          'yaml',
          'toml',
          'xml',
          'bash',
          'python',
          'rust',
          'go',
          'sql',
          'graphql',
          'dockerfile',
          'latex',
          'tex',
        ],
      }),
    )
  }
  return highlighterPromise
}

/**
 * Returns the shared shiki highlighter instance (lazy-loaded singleton).
 */
export function useShikiHighlighter() {
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void getHighlighter().then((hl) => {
      if (!cancelled) {
        setHighlighter(hl)
        setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { highlighter, isLoading }
}

/**
 * Highlights code with shiki and returns HTML string.
 * Automatically switches theme based on dark/light mode.
 */
export function useHighlightCode(code: string, language: string) {
  const { highlighter, isLoading: highlighterLoading } = useShikiHighlighter()
  const { resolvedTheme } = useTheme()
  const [html, setHtml] = useState('')

  const theme = resolvedTheme === 'dark' ? 'github-dark' : 'github-light'

  useEffect(() => {
    if (!highlighter || !code) {
      setHtml('')
      return
    }

    try {
      // Check if the language is loaded, fall back to 'text' if not
      const loadedLangs = highlighter.getLoadedLanguages()
      const lang = loadedLangs.includes(language) ? language : 'text'

      const result = highlighter.codeToHtml(code, {
        lang,
        theme,
      })
      setHtml(result)
    } catch {
      // Fallback: render as plain text
      const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      setHtml(`<pre><code>${escaped}</code></pre>`)
    }
  }, [highlighter, code, language, theme])

  return { html, isLoading: highlighterLoading }
}
