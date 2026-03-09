# PR #20 Review Report

**Title:** AI RESUME BUILDER
**Branch:** `dev-manjot` -> `main`
**Author:** MANJOT SINGH (@manjot1104)
**Status:** OPEN | Mergeability: **CONFLICTING** | Build: FAILED (Vercel)
**Stats:** +5,078 / -55 | 23 files changed | 1 commit

---

## Summary

Adds an **AI Resume Builder** feature that generates LaTeX-based resumes from user input via OpenRouter AI:

1. **Resume Builder Page** - Form-based UI to input resume data (personal info, experience, education, skills)
2. **AI Resume Generation** - Uses OpenRouter to generate structured resume JSON from prompts
3. **LaTeX Compilation** - Converts resume data to LaTeX, then compiles to PDF
4. **Resume Templates** - DB-backed template system for LaTeX resume layouts
5. **PDF Service** - Server-side LaTeX to PDF compilation
6. **Syntax Highlighting** - Shiki-based code highlighting for LaTeX preview
7. **DB Schema** - `resume_templates` and `user_resumes` tables

---

## Files Changed (Key)

| File | Change |
|------|--------|
| `src/app/(main)/dashboard/ai-resume/page.tsx` | NEW - Main resume builder page |
| `src/app/api/resume/generate/route.ts` | NEW - AI resume generation endpoint |
| `src/app/api/resume/generate-latex/route.ts` | NEW - LaTeX generation endpoint |
| `src/app/api/resume/compile-pdf/route.ts` | NEW - PDF compilation endpoint |
| `src/app/api/resume/test-key/route.ts` | NEW - API key test endpoint |
| `src/server/api/controllers/resume.controller.ts` | NEW - Resume CRUD controller |
| `src/server/services/pdf.service.ts` | NEW - LaTeX to PDF service |
| `src/lib/latex-to-pdf.ts` | NEW - LaTeX compilation utility |
| `src/lib/openrouter.ts` | NEW - OpenRouter client |
| `src/hooks/use-shiki.ts` | NEW - Shiki syntax highlighting hook |
| `src/types/api.types.ts` | NEW - Resume API types |
| `src/types/latex-js.d.ts` | NEW - Type declarations for latex.js |
| `src/server/db/schema.ts` | Added resume_templates, user_resumes tables |
| `src/app/api/[[...slugs]]/elysia.ts` | Added resume routes |
| `src/env.js` | Added OPENROUTER_API_KEY validation |
| `drizzle/0009_bouncy_deathbird.sql` | NEW migration |
| `package.json` | Added dependencies (shiki, latex.js, etc.) |
| `src/server/services/debug.log` | **SHOULD NOT BE COMMITTED** |

---

## Issues Found

### Critical

1. **MERGE CONFLICTS** - PR cannot be merged in its current state
   - Conflicts with `main` on schema.ts, elysia.ts, and likely migration files
   - Must rebase on latest main before merge

2. **`debug.log` committed** (`src/server/services/debug.log`)
   - Debug/log file should never be in version control
   - Add to `.gitignore` and remove from the PR

3. **Migration `0009` conflict** - Three other PRs (#7, #17, #19) also create migration 0009
   - Will need renumbering after other PRs merge

### High

4. **Separate API routes outside Elysia pattern**
   - `src/app/api/resume/generate/route.ts` etc. use Next.js route handlers directly
   - Project convention is to use Elysia for all API routes (per CLAUDE.md)
   - Inconsistent API pattern - some resume endpoints in Elysia, some in standalone routes

5. **OpenRouter API key in `env.js`** - Good that it's validated, but:
   - The key is also used in PR #17 which has its own `openrouter.ts`
   - Potential duplicate/conflicting OpenRouter client implementations

6. **`package-lock.json` included** - Project uses Bun, not npm
   - `package-lock.json` should not be committed (project uses `bun.lockb`)
   - Will conflict with every other PR

7. **LaTeX compilation dependency** - `latex.js` is a JavaScript LaTeX-to-HTML renderer
   - Does NOT produce real PDFs - it renders LaTeX as HTML/SVG
   - The `pdf.service.ts` and `compile-pdf` endpoint may not produce actual downloadable PDFs
   - Needs verification that the PDF generation pipeline actually works

### Medium

8. **No authentication on resume API routes**
   - `src/app/api/resume/generate/route.ts` - appears to have no auth middleware
   - `src/app/api/resume/test-key/route.ts` - exposes API key validation endpoint publicly
   - Security concern: unauthenticated users could consume OpenRouter credits

9. **Resume page is a single large component** (`ai-resume/page.tsx`)
   - 5,000+ lines in one file is likely (given +5,078 additions)
   - Should be split into components

10. **No rate limiting on resume generation** - Could allow abuse of OpenRouter API

### Low

11. **Shiki hook** (`use-shiki.ts`) - Good addition but could be shared with other features
12. **Type definitions** - `api.types.ts` and `latex-js.d.ts` are clean
13. **Sidebar updated** - Adds "AI Resume" link

---

## Verdict

**NOT READY for merge.**

### Must Fix Before Merge:
1. Resolve merge conflicts (rebase on main)
2. Remove `debug.log` from tracked files
3. Remove `package-lock.json` (project uses Bun)
4. Add authentication to resume API routes
5. Verify PDF generation actually works end-to-end

### Recommended:
- Consolidate OpenRouter client with PR #17's implementation
- Move all resume API routes into Elysia for consistency
- Split the resume page into smaller components
- Add rate limiting on AI generation endpoints
- Merge AFTER PR #17 (which also adds OpenRouter support)

---

## Overlap with Other PRs

| PR | Overlapping Files | Severity |
|----|-------------------|----------|
| #17 | schema.ts, elysia.ts, package.json, openrouter.ts | High conflict |
| #19 | schema.ts, migration 0009 | Medium conflict |
| #7 | schema.ts, elysia.ts | Medium conflict |
| #18 | None | Clean |

---

## Risk Assessment: HIGH
Has merge conflicts already, commits debug files, potentially broken PDF pipeline, unauthenticated API routes, and conflicts with 3 other PRs.
