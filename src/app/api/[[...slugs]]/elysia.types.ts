// Type-only export for Eden client to avoid bundling server code
import type { elysiaApp } from './elysia'

export type ElysiaApp = typeof elysiaApp
