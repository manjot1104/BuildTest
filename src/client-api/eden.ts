import { treaty } from '@elysiajs/eden'
import { elysiaApp } from '../app/api/[[...slugs]]/elysia'

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

// Create Eden client
// On server side, use the app directly
// On client side, use the base URL
export const api =
  typeof window === 'undefined'
    ? treaty(elysiaApp).api
    : treaty<typeof elysiaApp>(getBaseUrl()).api

