<!-- refreshed: 2026-05-18 -->

# Codebase Structure

**Analysis Date:** 2026-05-18

## Directory Layout

```
Woh-wala-trip/
├── src/                        # Next.js application source
│   ├── app/                    # Next.js App Router — routes and API handlers
│   │   ├── (auth)/             # Route group: auth pages (no shared layout)
│   │   │   └── login/          # Login page — renders CinematicAuth
│   │   ├── api/                # Next.js API routes (REST + tRPC)
│   │   │   ├── admin/          # Admin-only endpoints
│   │   │   │   └── security-log/
│   │   │   ├── auth/           # Custom OTP auth endpoints
│   │   │   │   ├── send-otp/   # POST: generate + send OTP via Resend
│   │   │   │   └── verify-otp/ # POST: verify OTP, set Supabase session
│   │   │   ├── card/           # OG image card rendering (Satori, Edge runtime)
│   │   │   │   ├── [tripId]/   # GET: main trip lore card PNG
│   │   │   │   ├── battle/[battleId]/ # GET: battle card PNG
│   │   │   │   ├── character/[tripId]/[memberId]/ # GET: character card PNG
│   │   │   │   ├── missing/[tripId]/[userId]/     # GET: missing person card PNG
│   │   │   │   ├── receipt/[tripId]/  # GET: receipt stats card PNG
│   │   │   │   ├── share/[tripId]/    # GET: share preview card PNG
│   │   │   │   └── superlative/[tripId]/[index]/  # GET: superlative card PNG
│   │   │   ├── cron/           # Vercel cron handlers
│   │   │   │   ├── anniversaries/ # Daily: send anniversary emails
│   │   │   │   └── stuck-jobs/    # Daily: reset processing-stuck trips
│   │   │   ├── og-test/        # OG image testing endpoint
│   │   │   ├── payments/
│   │   │   │   └── create-order/  # POST: Razorpay order creation
│   │   │   ├── print-waitlist/ # POST: print waitlist signup
│   │   │   ├── reactions/      # POST: emoji reactions (anon + auth)
│   │   │   └── trpc/[trpc]/    # tRPC catch-all handler
│   │   ├── auth/callback/      # GET: Supabase OAuth/magic link callback
│   │   ├── battles/[battleId]/ # Public battle page
│   │   ├── privacy/            # Privacy policy
│   │   ├── terms/              # Terms of service
│   │   ├── t/[code]/           # Public trip share pages (by invite code)
│   │   │   └── story/          # Public story view
│   │   ├── trips/              # Authenticated trip pages
│   │   │   ├── [tripId]/       # Trip detail and sub-pages
│   │   │   │   ├── card/       # Card share selector
│   │   │   │   ├── generating/ # Lore generation loading screen (Realtime)
│   │   │   │   ├── invite/     # Invite friends page
│   │   │   │   ├── print-order/# Print order flow
│   │   │   │   ├── share/      # Share page
│   │   │   │   ├── story/      # Cinematic story slides (main experience)
│   │   │   │   └── upgrade/    # Tier upgrade / payment page
│   │   │   ├── join/           # Join by invite code
│   │   │   └── new/            # Create new trip
│   │   ├── u/[username]/       # Public user profile page
│   │   ├── wrap/[year]/        # Yearly wrap page
│   │   ├── layout.tsx          # Root layout: TRPCProvider + PostHogProvider + fonts
│   │   └── page.tsx            # Landing page (redirects to /trips if authed)
│   ├── components/             # Shared React components
│   │   ├── cinematic/          # Cinematic UI pieces (non-interactive presentation)
│   │   │   ├── ArchiveRoom.tsx # Archive room visual environment
│   │   │   ├── Artifacts.tsx   # Artifact display components
│   │   │   ├── Documentary.tsx # Documentary-style text/scroll components
│   │   │   ├── Frames.tsx      # Cinematic frame/border components
│   │   │   ├── Hero.tsx        # Hero section
│   │   │   └── Orchestrator.tsx# Cinematic sequence coordinator
│   │   ├── experience/         # Interactive experience components (client-heavy)
│   │   │   ├── CinematicAuth.tsx       # Login form with cinematic animation
│   │   │   ├── CinematicLanding.tsx    # Landing page cinematic hero
│   │   │   ├── CinematicShell.tsx      # Wrapping shell for cinematic layouts
│   │   │   ├── ConfessionInput.tsx     # Trip confession input UI
│   │   │   ├── LandingClient.tsx       # Client component wrapper for landing
│   │   │   ├── LoreCapsules.tsx        # Lore snippet display capsules
│   │   │   ├── MoodSoundtrack.tsx      # Ambient audio controller
│   │   │   ├── ParticleUniverse.tsx    # Canvas particle animation
│   │   │   ├── ReactionBar.tsx         # Emoji reaction bar for story slides
│   │   │   ├── RecurringIdentityWidget.tsx # Cross-trip archetype display
│   │   │   ├── ScratchReveal.tsx       # Scratch-card reveal animation
│   │   │   └── SlidePhotoBackground.tsx# Photo background for story slides
│   │   ├── providers/          # React context providers
│   │   │   └── PostHogProvider.tsx # PostHog analytics provider
│   │   └── ui/                 # Primitive UI atoms
│   │       ├── atoms.tsx       # Buttons, inputs, basic primitives
│   │       └── atoms.stories.tsx # Storybook stories
│   ├── lib/                    # Shared utilities and integrations
│   │   ├── analytics.ts        # PostHog event helpers
│   │   ├── anti-spam.ts        # Email fraud scoring, rate limiting, disposable domain list
│   │   ├── database.types.ts   # Supabase generated TypeScript types
│   │   ├── langfuse.ts         # Langfuse observability client (spans, events)
│   │   ├── og/                 # OG image rendering utilities
│   │   │   ├── colors.ts       # Palette generation by chaos score
│   │   │   ├── components-viral.tsx # Viral sharing card components
│   │   │   ├── components.tsx  # Core card React components (Satori-compatible)
│   │   │   ├── fonts.ts        # Edge font loading for Satori
│   │   │   ├── qr.ts           # QR code data URL generation
│   │   │   └── render.ts       # Satori/ImageResponse wrapper
│   │   ├── supabase/           # Supabase client factories
│   │   │   ├── client.ts       # createSupabaseBrowserClient() — browser/Realtime
│   │   │   └── server.ts       # createSupabaseServerClient() + createSupabaseServiceClient()
│   │   ├── trpc/               # tRPC client setup
│   │   │   ├── client.ts       # createTRPCReact<AppRouter>() export
│   │   │   └── provider.tsx    # TRPCProvider (QueryClient + httpBatchLink)
│   │   ├── types.ts            # Shared TypeScript types (LoreJson, etc.)
│   │   └── utils.ts            # General utilities (formatName, etc.)
│   ├── server/                 # Server-only code (never imported by client components)
│   │   └── trpc/               # tRPC server setup
│   │       ├── init.ts         # t.init, createContext, publicProcedure, protectedProcedure
│   │       ├── router.ts       # Root appRouter — composes all sub-routers
│   │       └── routers/        # Domain-specific tRPC routers
│   │           ├── archetypes.ts  # User archetype queries (cross-trip character history)
│   │           ├── battles.ts     # Trip vs trip challenge, vote, get
│   │           ├── cards.ts       # Card list for share selector
│   │           ├── photos.ts      # Upload URL, confirm upload, list, similar, nostalgia
│   │           ├── reactions.ts   # Emoji reaction read/write
│   │           └── trips.ts       # CRUD, generateLore, joinByCode, upgradeTier, etc.
│   └── types/                  # Additional TypeScript type definitions
│
├── ai-worker/                  # Python FastAPI AI service (deployed to Render)
│   ├── src/
│   │   ├── main.py             # FastAPI app, HTTP endpoints, startup polling loops
│   │   ├── clients.py          # Supabase + Anthropic client singletons
│   │   ├── config.py           # Pydantic settings (Anthropic, Supabase, models, limits)
│   │   ├── embeddings.py       # CLIP embedding generation, pgvector upsert
│   │   ├── image_gen.py        # fal.ai image generation (covers, portraits, era thumbnails)
│   │   ├── nostalgia.py        # NostalgiaEngine: "on this day" + memory echo
│   │   ├── thumbnails.py       # Photo thumbnail resize + Supabase storage upload
│   │   └── lore/
│   │       ├── orchestrator.py # LoreOrchestrator: full 8-step AI pipeline
│   │       ├── prompts.py      # All Claude prompt templates (system + user)
│   │       └── validators.py   # Lore JSON schema validation + forbidden phrase scan
│   ├── tests/                  # Pytest test suite
│   │   └── fixtures/           # Test fixture data
│   ├── Dockerfile              # Container image for Render deployment
│   ├── render.yaml             # Render.com service definition
│   └── pyproject.toml          # Python dependencies (fastapi, anthropic, supabase, etc.)
│
├── supabase/migrations/        # Numbered SQL migration files
│   ├── 001_add_processing_started_at.sql
│   ├── 002_total_photos_trigger.sql
│   ├── 003_photo_views.sql
│   ├── 004_trip_signals_and_jobs.sql
│   ├── 005_photo_embeddings.sql
│   ├── 20260515_auto_profile.sql
│   ├── 20260515_fix_trip_members_rls.sql
│   ├── 20260515_otp_codes.sql
│   ├── 20260515_storage_rls.sql
│   ├── 20260516_anniversary_and_reactions.sql
│   ├── 20260516_cross_trip_features.sql
│   ├── 20260516_profiles_rls.sql
│   ├── 20260517_generation_cost_tokens.sql
│   ├── 20260517_image_gen_columns.sql
│   ├── 20260517_print_waitlist.sql
│   ├── 20260517_referral_mechanic.sql
│   ├── 20260518_email_send_at_index.sql
│   ├── 20260518_embedding_status.sql
│   ├── 20260518_hermes_lorian_observability.sql
│   ├── 20260518_photo_storage_tracking.sql
│   └── 20260518_signed_url_cache.sql
│
├── tests/                      # Playwright E2E tests
├── .storybook/                 # Storybook configuration
├── scripts/                    # Utility scripts
├── external-tools/             # External CLI tools
├── next.config.mjs             # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── vercel.json                 # Vercel cron job configuration
├── vitest.config.ts            # Vitest unit test configuration
└── playwright.config.ts        # Playwright E2E config
```

## Module Boundaries and Responsibilities

**`src/server/`** — Server-only. Never imported by `'use client'` components. Contains tRPC init and all routers. Direct Supabase access only through `src/lib/supabase/server.ts`.

**`src/lib/`** — Shared utilities. Split into:

- `src/lib/supabase/` — Supabase client factories. `client.ts` safe to import in client components. `server.ts` server-only (uses `next/headers`).
- `src/lib/trpc/` — tRPC React client and provider. Both are `'use client'` modules.
- `src/lib/og/` — OG rendering utilities. Satori-compatible — no Node.js APIs, safe for edge runtime.
- `src/lib/analytics.ts` — PostHog client wrapper. Browser-only.
- `src/lib/langfuse.ts` — Observability. Server-only (uses env secrets).
- `src/lib/anti-spam.ts` — Server-only (uses Upstash Redis env vars).

**`src/components/`** — React components. Sub-namespaced by purpose:

- `cinematic/` — Presentation-only, stateless or minimal state.
- `experience/` — Heavy interactivity, canvas animations, Realtime subscriptions.
- `providers/` — Context providers used in root layout.
- `ui/` — Primitive design system atoms.

**`ai-worker/`** — Completely separate Python service. Communicates with Next.js only via shared Supabase tables and HTTP callbacks. No shared code with `src/`.

## Key Files and Their Roles

**`src/app/layout.tsx`** — Root layout. Mounts `TRPCProvider` (wraps all routes with React Query + tRPC), `PostHogProvider`, and Google Fonts. No auth redirect logic here.

**`src/app/page.tsx`** — Landing / root route. RSC: checks session, redirects to `/trips` if authenticated. Otherwise renders `LandingClient`.

**`src/server/trpc/init.ts`** — tRPC initialization. Defines `createContext()` (attaches Supabase server client + user to every procedure), `publicProcedure`, and `protectedProcedure` (throws `UNAUTHORIZED` if no user).

**`src/server/trpc/router.ts`** — Root `appRouter`. Compose point for all domain routers. `AppRouter` type is exported and consumed by `src/lib/trpc/client.ts`.

**`src/lib/supabase/server.ts`** — Two distinct client factories: `createSupabaseServerClient()` (cookie-based, user session, RLS respected) and `createSupabaseServiceClient()` (service role, RLS bypassed). Choosing the wrong one is the most common source of 403 errors.

**`src/app/api/trpc/[trpc]/route.ts`** — tRPC HTTP handler. Mounts `appRouter` at `/api/trpc`. Both GET and POST exported.

**`src/app/api/auth/send-otp/route.ts`** — OTP dispatch. Multi-layer fraud scoring, DB rate limiting, HMAC hash storage, Resend delivery.

**`src/app/api/auth/verify-otp/route.ts`** — OTP verification. Delegates to `supabase.auth.verifyOtp()`, marks code as used.

**`src/app/auth/callback/route.ts`** — Supabase OAuth/magic link code exchange. Validates `next` param to prevent open redirect.

**`src/app/trips/[tripId]/generating/page.tsx`** — Generation loading page. Opens Supabase Realtime channel on `trips` table, routes to story on `lore_status → 'ready'`.

**`ai-worker/src/main.py`** — FastAPI app entry point. Registers all HTTP endpoints and starts two background polling loops on startup.

**`ai-worker/src/lore/orchestrator.py`** — Core AI pipeline. `LoreOrchestrator.run_full_pipeline()` is the main entry point. 1270+ lines — the most complex file in the project.

**`ai-worker/src/lore/prompts.py`** — All Claude prompt templates. System + user prompt pairs for each pipeline step.

**`ai-worker/src/lore/validators.py`** — Lore JSON schema validation (required field presence) and forbidden phrase scanner.

**`src/lib/og/render.ts`** — Satori wrapper. Takes a React element and returns a PNG `Response`.

**`src/lib/langfuse.ts`** — Singleton Langfuse HTTP client. Traces AI pipeline spans and security events. No-op when `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` are absent.

## Entry Points

**Web Application:**

- `src/app/layout.tsx` — Root HTML shell, providers
- `src/app/page.tsx` — `/` route (landing or redirect)
- `src/app/(auth)/login/page.tsx` — `/login` (dynamic import of CinematicAuth)

**API:**

- `src/app/api/trpc/[trpc]/route.ts` — All tRPC calls
- `src/app/api/auth/send-otp/route.ts` — `POST /api/auth/send-otp`
- `src/app/api/auth/verify-otp/route.ts` — `POST /api/auth/verify-otp`
- `src/app/auth/callback/route.ts` — `GET /auth/callback`

**AI Worker:**

- `ai-worker/src/main.py` — FastAPI app (`app = FastAPI(...)`)

## Route Structure (App Router)

```
/                       → Landing or redirect to /trips
/login                  → (auth)/login/page.tsx (CinematicAuth)
/auth/callback          → Supabase session exchange
/trips                  → Trip list (client component, tRPC)
/trips/new              → Create trip form
/trips/join             → Join by invite code
/trips/[tripId]         → Trip detail
/trips/[tripId]/story   → Cinematic story experience (main AI output)
/trips/[tripId]/generating → Lore generation loading (Realtime)
/trips/[tripId]/card    → Card share selector
/trips/[tripId]/share   → Share page
/trips/[tripId]/invite  → Invite friends
/trips/[tripId]/upgrade → Tier upgrade / Razorpay
/trips/[tripId]/print-order → Print order
/t/[code]               → Public trip by invite code
/t/[code]/story         → Public story view (no auth)
/battles/[battleId]     → Public battle page
/u/[username]           → Public user profile
/wrap/[year]            → Yearly wrap
/privacy                → Privacy policy
/terms                  → Terms of service
```

**API routes:**

```
/api/trpc/[trpc]                          → tRPC handler (GET + POST)
/api/auth/send-otp                        → POST: OTP send
/api/auth/verify-otp                      → POST: OTP verify
/api/card/[tripId]                        → GET: trip card PNG (edge)
/api/card/battle/[battleId]               → GET: battle card PNG (edge)
/api/card/character/[tripId]/[memberId]   → GET: character card PNG (edge)
/api/card/missing/[tripId]/[userId]       → GET: missing person card PNG (edge)
/api/card/receipt/[tripId]                → GET: receipt stats card PNG (edge)
/api/card/share/[tripId]                  → GET: share card PNG (edge)
/api/card/superlative/[tripId]/[index]    → GET: superlative card PNG (edge)
/api/payments/create-order                → POST: Razorpay order
/api/reactions                            → POST: emoji reaction
/api/print-waitlist                       → POST: print waitlist signup
/api/cron/anniversaries                   → GET: daily anniversary email cron
/api/cron/stuck-jobs                      → GET: daily stuck-job reset cron
/api/admin/security-log                   → GET: admin security log view
```

## Server vs Client Code Separation

**Server Components (RSC) — no `'use client'`:**

- `src/app/page.tsx` — session check + redirect
- All `layout.tsx` files (except where children force client)
- Any page that only reads data via `createSupabaseServerClient()` and doesn't need interactivity

**Client Components (`'use client'`):**

- `src/app/trips/page.tsx` — tRPC hooks for trip list + nostalgia feed
- `src/app/trips/[tripId]/generating/page.tsx` — Realtime subscription + canvas animation
- `src/app/trips/[tripId]/story/page.tsx` — Slide state, touch handling, reactions
- `src/app/(auth)/login/page.tsx` — dynamic import of `CinematicAuth` (ssr: false)
- All files in `src/components/experience/` — animations, interactivity
- `src/lib/trpc/client.ts` — `createTRPCReact()` (browser only)
- `src/lib/trpc/provider.tsx` — `TRPCProvider`
- `src/components/providers/PostHogProvider.tsx`

**Edge runtime (special — no Node.js APIs):**

- All files under `src/app/api/card/` — Satori-based OG image rendering

## Naming Conventions

**Files:**

- Pages: `page.tsx` (required by App Router)
- API routes: `route.ts` or `route.tsx` (for JSX in OG routes)
- Components: PascalCase (`CinematicAuth.tsx`, `ReactionBar.tsx`)
- Utilities: camelCase (`analytics.ts`, `anti-spam.ts`)
- tRPC routers: camelCase domain name (`trips.ts`, `photos.ts`)

**Directories:**

- App Router segments: kebab-case (`print-order/`, `send-otp/`)
- Route groups: `(auth)/` (parentheses = no URL segment)
- Dynamic segments: `[tripId]/`, `[code]/`, `[trpc]/`
- Components grouped by role: `cinematic/`, `experience/`, `providers/`, `ui/`

## Where to Add New Code

**New tRPC procedure:**

1. Add to the appropriate router in `src/server/trpc/routers/` or create a new `src/server/trpc/routers/newDomain.ts`
2. If new router: register in `src/server/trpc/router.ts`
3. Use `protectedProcedure` for any mutation or user-specific query

**New API route (non-tRPC):**

- Create `src/app/api/{feature}/route.ts`
- Use `createSupabaseServiceClient()` only after verifying caller identity
- For edge-compatible routes, add `export const runtime = 'edge'`

**New page:**

- Create `src/app/{route}/page.tsx`
- Prefer RSC for data fetching; add `'use client'` only when you need hooks, events, or browser APIs
- Auth redirect: check session in the RSC, redirect via `import { redirect } from 'next/navigation'`

**New component:**

- Interactive / stateful → `src/components/experience/`
- Visual / presentation → `src/components/cinematic/`
- Design primitive → `src/components/ui/atoms.tsx`
- Shared provider → `src/components/providers/`

**New database table:**

- Create a timestamped SQL file in `supabase/migrations/YYYYMMDD_{description}.sql`
- Always include RLS policies matching the pattern of existing tables
- Add the type to `src/lib/database.types.ts` (or run `supabase gen types`)

**New AI worker endpoint:**

- Add the Pydantic request model and FastAPI route handler in `ai-worker/src/main.py`
- Add the implementation in the appropriate module (`ai-worker/src/lore/orchestrator.py` for lore, new modules for new domains)
- Call it fire-and-forget from the appropriate tRPC router using `fetch(...).catch(e => console.error(...))`

## Special Directories

**`.planning/codebase/`:**

- Purpose: GSD codebase map documents
- Generated: By `/gsd:map-codebase` agent
- Committed: Yes

**`ai-worker/venv/`:**

- Purpose: Python virtual environment
- Generated: Yes (`python -m venv venv`)
- Committed: No (in `.gitignore`)

**`.next/`:**

- Purpose: Next.js build output
- Generated: Yes
- Committed: No

**`supabase/.temp/`:**

- Purpose: Supabase CLI temp files (project linking)
- Generated: Yes
- Committed: No (contains project ref)

**`tests/`:**

- Purpose: Playwright E2E test files
- Config: `playwright.config.ts`

---

_Structure analysis: 2026-05-18_
