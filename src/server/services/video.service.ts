// server/services/video.service.ts
//
// Self-contained LLM service for video JSON generation.
// Zero imports from other services in this codebase.
//
// TO SWAP LLM PROVIDERS — change only:
//   1. OPENROUTER_API_URL  (if moving off OpenRouter entirely)
//   2. VIDEO_MODELS        (model list)
//   3. buildRequestBody()  (if new provider has a different request shape)
//   4. extractContent()    (if new provider has a different response shape)
// Nothing in video.controller.ts or elysia.ts needs to change.

import { validateVideoJson } from '@/remotion-src/utils/validateVideoJson'
import { VIDEO_SYSTEM_PROMPT, buildVideoPrompt } from '@/remotion-src/utils/llmPrompt'
import type { VideoJson } from '@/remotion-src/types'

// ── Config ────────────────────────────────────────────────────────────────────

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

const RETRY_DELAY_MS = 2_000

// Free models ordered by JSON reliability for structured output tasks.
// All confirmed free on OpenRouter as of 2026.
// Falls through to the next model on 429 / 402 / empty response.
const VIDEO_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'arcee-ai/trinity-large-preview:free',
  'upstage/solar-pro-3:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'stepfun/step-3.5-flash:free',
  'google/gemma-3-12b-it:free',
  'qwen/qwen3-4b:free',
  'openrouter/free',
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterResponse {
  choices: { message: { content: string } }[]
}

export interface GenerateVideoResult {
  success: true
  videoJson: VideoJson
}

export interface GenerateVideoError {
  success: false
  error: string
  details?: string
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Strips markdown fences and extracts the outermost JSON object.
// LLMs sometimes wrap output in ```json``` blocks despite instructions not to.
function extractJson(raw: string): string {
  const stripped = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim()

  const start = stripped.indexOf('{')
  const end = stripped.lastIndexOf('}')
  if (start !== -1 && end > start) return stripped.slice(start, end + 1)

  return stripped
}

// ── Request / response adapters ───────────────────────────────────────────────

function buildRequestBody(model: string, messages: OpenRouterMessage[]): object {
  return {
    model,
    max_tokens: 2000,
    // Low temperature for deterministic, schema-conforming JSON output.
    // Matches the 0.1 used in openRouter.service.ts for the same reason.
    temperature: 0.1,
    messages,
  }
}

function extractContent(data: OpenRouterResponse): string | null {
  return data?.choices?.[0]?.message?.content ?? null
}

// ── Core OpenRouter call ──────────────────────────────────────────────────────
// Mirrors the callOpenRouter() pattern in openRouter.service.ts:
// tries each model in order, retries on 429/402 with a delay, throws if all fail.

async function callOpenRouter(messages: OpenRouterMessage[]): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY is not set')

  let lastError: Error | null = null

  for (const model of VIDEO_MODELS) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
          'X-Title': 'Video Generator',
        },
        body: JSON.stringify(buildRequestBody(model, messages)),
      })

      if (response.status === 429) {
        console.warn(`[VideoService] ${model} rate-limited (429) — waiting ${RETRY_DELAY_MS}ms`)
        lastError = new Error(`Rate limited: ${await response.text()}`)
        await sleep(RETRY_DELAY_MS)
        continue
      }

      if (response.status === 402) {
        console.error(`[VideoService] ${model} spend limit (402)`)
        lastError = new Error(`Spend limit reached: ${await response.text()}`)
        await sleep(RETRY_DELAY_MS)
        continue
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }

      const data = (await response.json()) as OpenRouterResponse
      const content = extractContent(data)

      if (!content) {
        console.warn(`[VideoService] ${model} returned empty content — trying next model`)
        lastError = new Error('Empty response')
        continue
      }

      console.log(`[VideoService] ✓ model=${model} chars=${content.length}`)
      return content

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`[VideoService] ${model} failed: ${lastError.message}`)
      await sleep(RETRY_DELAY_MS)
    }
  }

  throw new Error(`All video models failed. Last error: ${lastError?.message}`)
}

// ── Public service API ────────────────────────────────────────────────────────

/**
 * Converts a user prompt into a validated VideoJson object.
 *
 * Tries each model in VIDEO_MODELS in order (same fallback strategy as
 * openRouter.service.ts). On invalid JSON or schema failure, retries once
 * with the next available model before giving up.
 *
 * @param prompt          — user's video description
 * @param durationSeconds — target video length in seconds (default 15)
 */
export async function generateVideoJson(
  prompt: string,
  durationSeconds = 15,
): Promise<GenerateVideoResult | GenerateVideoError> {
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: VIDEO_SYSTEM_PROMPT },
    { role: 'user', content: buildVideoPrompt(prompt, durationSeconds) },
  ]

  let lastError = ''

  // Two attempts: first call may succeed with one model, retry uses the next.
  // The model fallback loop inside callOpenRouter handles per-model failures.
  // This outer loop handles JSON parse / schema validation failures — in that
  // case we re-call with a clarifying nudge to get a cleaner response.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[VideoService] generateVideoJson attempt ${attempt}/2`)

      // On retry, append a reminder to the messages to fix common mistakes
      const attemptMessages: OpenRouterMessage[] =
        attempt === 1
          ? messages
          : [
              ...messages,
              {
                role: 'assistant',
                content: lastError.slice(0, 300),
              },
              {
                role: 'user',
                content:
                  'The JSON you returned was invalid. Please return ONLY valid JSON matching the schema. No markdown, no explanation.',
              },
            ]

      const raw = await callOpenRouter(attemptMessages)
      const jsonString = extractJson(raw)

      let parsed: unknown
      try {
        parsed = JSON.parse(jsonString)
      } catch {
        lastError = `Attempt ${attempt}: invalid JSON — ${jsonString.slice(0, 300)}`
        console.warn(`[VideoService] ${lastError}`)
        if (attempt < 2) await sleep(RETRY_DELAY_MS)
        continue
      }

      const validation = validateVideoJson(parsed)
      if (!validation.success) {
        lastError = `Attempt ${attempt}: schema validation failed — ${validation.error.issues.map((i) => i.message).join(', ')}`
        console.warn(`[VideoService] ${lastError}`)
        if (attempt < 2) await sleep(RETRY_DELAY_MS)
        continue
      }

      console.log(
        `[VideoService] ✓ Generated ${validation.data.scenes.length} scenes, ` +
        `${validation.data.duration} frames (${durationSeconds}s)`,
      )

      return { success: true, videoJson: validation.data as VideoJson }

    } catch (err) {
      lastError = `Attempt ${attempt}: ${err instanceof Error ? err.message : String(err)}`
      console.error(`[VideoService] ${lastError}`)
      if (attempt < 2) await sleep(RETRY_DELAY_MS)
    }
  }

  return {
    success: false,
    error: 'Failed to generate valid video JSON after retries',
    details: lastError,
  }
}

/**
 * Stub for video rendering. Phase 5 replaces this with a real BullMQ job.
 */
export async function renderVideo(
  videoJson: VideoJson,
): Promise<{ success: true; status: 'queued'; jobId: string } | GenerateVideoError> {
  // TODO Phase 5: enqueue a BullMQ job, return real jobId
  console.log(`[VideoService] renderVideo stub — ${videoJson.scenes.length} scenes`)
  return { success: true, status: 'queued', jobId: `stub_${Date.now()}` }
}