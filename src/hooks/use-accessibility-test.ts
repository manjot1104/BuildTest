import { useState, useCallback, useRef } from 'react'
import type { SSEEvent, TestSummary } from '@/types/accessibility.types'

export interface AccessibilityTestState {
  status: 'idle' | 'running' | 'completed' | 'error'
  logs: SSEEvent[]
  progress: { phase: string; current: number; total: number; percentage: number } | null
  summary: TestSummary | null
  testRunId: string | null
  error: string | null
}

const initialState: AccessibilityTestState = {
  status: 'idle',
  logs: [],
  progress: null,
  summary: null,
  testRunId: null,
  error: null,
}

export function useAccessibilityTest() {
  const [state, setState] = useState<AccessibilityTestState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const startTest = useCallback(
    async (config: { url: string; standards: string[]; maxPages?: number; maxDepth?: number }) => {
      // Reset state
      setState({ ...initialState, status: 'running' })

      const abortController = new AbortController()
      abortRef.current = abortController

      try {
        const response = await fetch('/api/accessibility/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
          signal: abortController.signal,
        })

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(errorData.error ?? `HTTP ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response stream')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const jsonStr = line.slice(6).trim()
            if (!jsonStr) continue

            try {
              const event = JSON.parse(jsonStr) as SSEEvent
              setState((prev) => {
                const newLogs = [...prev.logs, event]
                const next: AccessibilityTestState = { ...prev, logs: newLogs }

                switch (event.type) {
                  case 'progress':
                    next.progress = {
                      phase: event.phase,
                      current: event.current,
                      total: event.total,
                      percentage: event.percentage,
                    }
                    break
                  case 'test:complete':
                    next.summary = event.summary
                    break
                  case 'report:complete':
                    next.testRunId = event.testRunId
                    next.status = 'completed'
                    break
                  case 'error':
                    if (event.fatal) {
                      next.status = 'error'
                      next.error = event.message
                    }
                    break
                }

                return next
              })
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        // If status is still running after stream ends, mark complete
        setState((prev) =>
          prev.status === 'running' ? { ...prev, status: 'completed' } : prev,
        )
      } catch (err) {
        if (abortController.signal.aborted) return
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        }))
      }
    },
    [],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(initialState)
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setState((prev) => ({ ...prev, status: 'error', error: 'Test cancelled' }))
  }, [])

  return { ...state, startTest, reset, abort }
}
