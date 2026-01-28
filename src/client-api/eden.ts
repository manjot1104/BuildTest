import { treaty } from '@elysiajs/eden'
import type { ElysiaApp } from '../app/api/[[...slugs]]/elysia.types'

// Get base URL - use window.location.origin in browser, or process.env.NEXT_PUBLIC_APP_URL
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  return 'http://localhost:3000'
}

// Create Eden client with type-only import to avoid bundling server code
export const api = treaty<ElysiaApp>(getBaseUrl()).api

