# Yaarlore (Woh-wala-trip) — Claude Code Guide

## Project Overview

Cinematic AI trip documentary platform. Next.js 15 + tRPC 11 + Supabase + Python FastAPI AI worker. India-first. Dual runtime: TypeScript (Next.js/Vercel) + Python (FastAPI/Render).

**Planning:** `.planning/` — see `.planning/STATE.md` for current status, `.planning/ROADMAP.md` for phases.

## GSD Workflow

This project uses the GSD (Get Shit Done) workflow. Always check `.planning/STATE.md` before starting work.

```
/gsd:progress          — check current state and what to do next
/gsd:plan-phase N      — plan a specific phase
/gsd:execute-phase N   — execute a planned phase
/gsd:verify-work       — verify phase completion
```

**Current status:** Phase 1 (Security Foundation) not yet started. See `.planning/ROADMAP.md`.

## Critical Rules

### Never break these

- Cinematic UX, animations, and documentary-style storytelling must survive all refactors
- Public story sharing (`/t/[code]/story`) must remain functional
- Lore generation pipeline end-to-end must work after every change
- Razorpay payment flow must work end-to-end

### Security invariants (being fixed in Phase 1, must maintain after)

- All Supabase tables must have RLS enabled before any production traffic
- `createSupabaseServiceClient()` bypasses ALL RLS — always validate user auth before using it
- Never expose service role key to the browser
- `AI_WORKER_SECRET` is never sent to the browser — server-side only

### Architecture patterns

- All storage operations use `createSupabaseServiceClient()` (RLS blocks user session on storage)
- All tRPC mutations that modify data use `protectedProcedure`
- Fire-and-forget AI worker calls are an anti-pattern — use `background_jobs` queue
- Lore generation: HTTP trigger primary → DB queue fallback (both paths must be maintained)

## Stack Quick Reference

| Layer         | Technology                       | Location                     |
| ------------- | -------------------------------- | ---------------------------- |
| Frontend      | Next.js 15 App Router + React 19 | `src/app/`                   |
| API           | tRPC 11 + TanStack Query         | `src/server/trpc/`           |
| Auth          | Supabase Auth + custom OTP       | `src/app/api/auth/`          |
| DB            | Supabase Postgres + pgvector     | `supabase/migrations/`       |
| AI Worker     | FastAPI + Python 3.12            | `ai-worker/`                 |
| AI Models     | Claude Sonnet 4.6 + Haiku 4.5    | `ai-worker/src/`             |
| Image Gen     | fal.ai Sana Sprint               | `ai-worker/src/image_gen.py` |
| Payments      | Razorpay                         | `src/app/api/payments/`      |
| OG Cards      | Satori (edge runtime)            | `src/app/api/card/`          |
| Observability | Langfuse + PostHog               | `src/lib/langfuse.ts`        |

## Key Files

- `src/server/trpc/routers/trips.ts` — core trip logic, lore generation trigger
- `src/server/trpc/routers/photos.ts` — photo upload, signed URL cache
- `src/server/trpc/routers/battles.ts` — trip vs trip battles
- `ai-worker/src/lore/orchestrator.py` — 8-step AI lore pipeline
- `ai-worker/src/image_gen.py` — fal.ai image generation
- `src/lib/supabase/server.ts` — two Supabase clients (user-scoped + service role)
- `src/lib/anti-spam.ts` — rate limiting + fraud scoring
- `supabase/migrations/` — all schema definitions

## Known Issues (being fixed)

See `.planning/REQUIREMENTS.md` for full list. Critical items:

- `trips` table has NO RLS (SEC-01) — any authenticated user can read all trips
- No CSP header (SEC-04)
- Rate limiting falls back to in-memory on serverless (SEC-05)
- `markAbsent` and `battles.challenge` are fire-and-forget (REL-01, REL-02)
- `stuck-jobs` cron runs daily not every 15 min (REL-03)
- No monthly token budget cap (COST-01)
- 59 `as any` casts from stale Supabase types (TYPE-02)

## Running the Project

```bash
# Next.js dev server
npm run dev

# AI worker (Python)
cd ai-worker && uvicorn src.main:app --reload

# Type check
npm run type-check

# Tests
npm run test        # Vitest unit tests
npm run test:e2e    # Playwright E2E
```

## Supabase Types

Types at `src/lib/database.types.ts` are stale. Regenerate with:

```bash
supabase gen types typescript --project-id <project-id> > src/lib/database.types.ts
```

This is tracked as TYPE-01 in requirements.

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes -- don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -- then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
