import { treaty } from '@elysiajs/eden'
import type { ElysiaApp } from '../app/api/[[...slugs]]/elysia.types'
import { env } from '@/env'

// Get base URL - use window.location.origin in browser, or env.NEXT_PUBLIC_APP_URL
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}

// Create Eden client with type-only import to avoid bundling server code
export const api = treaty<ElysiaApp>(getBaseUrl()).api

