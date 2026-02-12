# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Buildify is an AI-powered app builder built on the T3 Stack. It integrates with the V0 SDK to generate and iterate on applications through a chat interface, with Razorpay-based subscription and credit system for monetization.

## Commands

```bash
bun run dev              # Start dev server (Next.js + Turbo)
bun run build            # Production build
bun run lint             # ESLint check
bun run lint:fix         # ESLint auto-fix
bun run typecheck        # TypeScript type checking only
bun run check            # Lint + typecheck combined
bun run format:check     # Prettier format check
bun run format:write     # Prettier auto-format

# Database (Drizzle + PostgreSQL)
bun run db:push          # Push schema changes to database
bun run db:generate      # Generate migration files
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio GUI
```

## Tech Stack

- **Framework:** Next.js 15 (App Router) with React 19
- **Package Manager:** Bun
- **API Layer:** Elysia (Bun HTTP framework) with Eden client for type-safe RPC
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Better Auth (email/password + OAuth)
- **UI:** shadcn/ui (Radix UI + Tailwind CSS v4)
- **State:** TanStack React Query for server state, React Context for UI state
- **Payments:** Razorpay
- **AI:** V0 SDK for chat-based app generation
- **Validation:** Zod (runtime), T3 Env (environment variables)

## Architecture

### API Layer (Elysia + Eden)

The API is defined as a single Elysia app in `src/app/api/[[...slugs]]/elysia.ts` and exposed through a Next.js catch-all route handler at `src/app/api/[[...slugs]]/route.ts`. The client calls APIs via the Eden treaty client in `src/client-api/eden.ts`, which provides end-to-end type safety by importing the Elysia app type from `elysia.types.ts`.

### Server Organization

- `src/server/db/schema.ts` - All Drizzle table definitions (prefixed with `Buildify_*` in DB via `pgTableCreator`, except auth tables which use plain `pgTable`)
- `src/server/db/queries.ts` - Database query functions
- `src/server/api/controllers/` - Request handlers (chat, payment, star)
- `src/server/services/` - Business logic (credits, razorpay)
- `src/server/better-auth/` - Auth config (`config.ts`), server session (`server.ts`), client auth (`client.ts`)

### Client Organization

- `src/app/(main)/chat/page.tsx` - Main chat interface (client component)
- `src/hooks/` - Custom hooks (`use-chat.ts`, `use-chat-api.ts`, `use-user-credits.ts`)
- `src/context/` - React contexts (`state-machine.tsx` for auth/modal state, `chat-actions.tsx`)
- `src/providers/root-provider.tsx` - Wraps TanStack Query, Theme, and all providers
- `src/components/ui/` - shadcn/ui component library

### Credit System

Dual credit model: subscription credits (expire with billing cycle) + additional credits (purchased separately, never expire). New chat costs 20 credits, follow-up message costs 30. Credits are deducted before the V0 API call. Active subscription required.

### Rate Limiting

Authenticated users: 50 messages/day. Anonymous users: 3 messages/day (tracked by IP via `anonymous_chat_logs` table).

### Environment Variables

Validated at build time via `src/env.js` (T3 Env + Zod). Required: `DATABASE_URL`, `V0_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`. `BETTER_AUTH_SECRET` required in production. Skip validation with `SKIP_ENV_VALIDATION=1`.

## Code Conventions

- **Path alias:** `@/*` maps to `./src/*`
- **Imports:** Use `type` keyword for type-only imports (`import { type Foo }`)
- **Drizzle safety:** ESLint enforces `WHERE` clauses on all `delete()` and `update()` calls against `db` and `ctx.db`
- **Unused vars:** Prefix with `_` to suppress warnings
- **Formatting:** Prettier with tailwindcss plugin for class sorting
