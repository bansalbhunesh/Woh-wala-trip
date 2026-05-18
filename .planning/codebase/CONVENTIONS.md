# Coding Conventions

**Analysis Date:** 2026-05-18

## Naming Patterns

**Files:**

- React page components: `page.tsx` (Next.js App Router convention)
- React component files: PascalCase, e.g. `CinematicText.tsx`, `LandingClient.tsx`
- Utility/lib files: kebab-case, e.g. `anti-spam.ts`, `lore-utils.ts`
- tRPC routers: kebab-case in `src/server/trpc/routers/`, e.g. `trips.ts`, `photos.ts`
- Stories files: `atoms.stories.tsx` co-located in `src/components/ui/`
- Test files: `*.test.ts` / `*.test.tsx` (unit/integration), `*.spec.ts` (e2e)

**Functions:**

- Exported functions: camelCase, e.g. `checkEmail`, `computeFraudScore`, `formatName`
- React components: PascalCase, e.g. `CinematicText`, `JoinContent`, `NewTripPage`
- Event handlers: inline arrow functions or `handleX` pattern (no dominant naming convention)
- tRPC procedures: camelCase keys on the router object, e.g. `create`, `joinByCode`, `getFull`

**Variables:**

- Local variables: camelCase
- Constants and lookup tables: SCREAMING_SNAKE_CASE, e.g. `DISPOSABLE_DOMAINS`, `LABELS`, `TICKER_ITEMS`
- Boolean state: verb prefix, e.g. `revealed`, `focused`, `isPending`
- Error map objects: camelCase, e.g. `errorMap`

**Types and Interfaces:**

- Interfaces: PascalCase, e.g. `Trip`, `TripMember`, `LoreJson`, `FraudCheckResult`
- Type aliases: PascalCase, e.g. `TripWithLore`, `Context`, `AppRouter`
- Zod schemas: PascalCase with `Input` suffix, e.g. `TripCreateInput`, `InviteCodeInput`
- Local interfaces for RPC shapes: descriptive PascalCase with `Result` or `Row` suffix, e.g. `GetTripFullResult`, `TripCreatorRow`

## TypeScript Usage

**Strict mode:** Enabled. `tsconfig.json` sets `"strict": true` with `target: "ESNext"`, `isolatedModules: true`, and `noEmit: true`.

**Type safety approach:**

- Zod schemas validate all tRPC inputs; `zodError` is surfaced in the error formatter via `initTRPC`
- Domain types centralized in `src/types/domain.ts` with full interface coverage for all DB shapes
- Supabase return types are frequently cast (`as unknown as SomeType`) because codegen types lag behind schema changes — this is a known project-wide workaround
- `as never` is used extensively to satisfy TypeScript when querying columns added after codegen, e.g. `.update({ lore_status: 'processing' } as never)`
- `ReturnType<typeof vi.fn>` used in tests to type mock return values

**Where strict is bypassed:**

- Supabase RPC calls return `Json` — always cast via `as unknown as InterfaceType`
- `any` appears in `Ratelimit.slidingWindow()` call in `anti-spam.ts` (documented: `as any`)
- Route handler params cast to `never` in integration tests: `POST(req as never)`

## Component Patterns

**Structure convention:**

```typescript
'use client'; // Always first when client component

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';

// Constants at module level in SCREAMING_SNAKE_CASE
const LABELS: Record<string, string> = { ... };

// Named function component with inline prop typing
export default function PageName() {
  // State declarations
  const [fields, setFields] = useState({ ... });

  // Side effects
  useEffect(() => { ... }, []);

  // tRPC hooks
  const mutation = trpc.router.action.useMutation({ onSuccess: () => ... });

  return ( /* JSX */ );
}
```

**Props typing:** Inline object type in function signature, not a separate `Props` type:

```typescript
export function CinematicText({
  children,
  variant = 'heading',
  className,
}: {
  children: React.ReactNode;
  variant?: 'heading' | 'data' | 'eyebrow' | 'italic';
  className?: string;
}) { ... }
```

**Client vs Server:**

- All interactive components (forms, pages with state) have `'use client'` as first line
- `src/lib/trpc/client.ts` and `src/lib/trpc/provider.tsx` both marked `'use client'`
- tRPC init (`src/server/trpc/init.ts`) is server-only — no directive needed
- Server components (RSC) exist for layouts and pages that don't need interactivity

**Suspense boundaries:**

- Wrap any component using `useSearchParams()` in `<Suspense>` with a fallback, per Next.js requirement — see `src/app/trips/join/page.tsx`

## Error Handling Patterns

**tRPC procedures:**

```typescript
// Always use TRPCError with a semantic code
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: `Could not create season: ${error.message}`,
});

// Map RPC error strings to user-facing messages — never expose raw DB errors
const errorMap: Record<string, string> = {
  invalid_or_expired_code: 'Yaar this code is literally not working.',
};
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: knownError ?? 'Could not join trip. Check the code and try again.',
});
```

**Non-critical paths (fire-and-forget):**

```typescript
// Wrap in try/catch with console.error but don't rethrow — never break primary flow
try {
  // referral tracking, worker ping, etc.
} catch {
  // comment: "Referral tracking must never break trip creation"
}
```

**API route handlers:** Return `NextResponse.json({ error: string }, { status: 4xx })` — error messages are user-facing and never expose stack traces or internal DB error strings.

**Component error display:** Render `mutation.error.message` directly in JSX when tRPC mutation fails — the server guarantees user-safe messages.

## Import/Export Patterns

**Import order (by convention, not enforced by linter):**

1. React core: `import { useState, useEffect } from 'react'`
2. Next.js: `import { useRouter } from 'next/navigation'`
3. Third-party libraries: framer-motion, lucide-react, etc.
4. Internal absolute paths via `@/` alias: `import { trpc } from '@/lib/trpc/client'`
5. Relative paths (rare, only within same directory)

**Path alias:** `@/` maps to `src/` — configured in both `tsconfig.json` and `vitest.config.ts`.

**Exports:**

- Page components: `export default function PageName()`
- Utility functions and shared components: named exports, e.g. `export function cn(...)`
- tRPC router: named export `export const appRouter`, type export `export type AppRouter`
- Domain types: all named exports from `src/types/domain.ts`

**Barrel files:** Not used. Each file imports directly from source locations.

## Async Patterns

**tRPC mutations (client):**

```typescript
const createTrip = trpc.trips.create.useMutation({
  onSuccess: trip => {
    analytics.tripCreated(trip.id, trip.name);
    router.push(`/trips/${trip.id}/invite`);
  },
});
// Called in event handler:
createTrip.mutate({ name, destination, startDate, endDate });
// Pending state rendered via: createTrip.isPending
// Error rendered via: createTrip.error?.message
```

**tRPC queries (server):**

```typescript
// All procedures are async functions
const procedure = protectedProcedure
  .input(z.object({ tripId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.from('trips').select(...);
    if (error) throw new TRPCError({ ... });
    return data;
  });
```

**AbortSignal for timeouts:** Used on fetch calls to AI worker, e.g. `signal: AbortSignal.timeout(8000)`.

**Promise.all for parallel work:**

```typescript
const apiResults = (
  await Promise.all([checkDisify(email), checkAbstractAPI(email), checkKickbox(email)])
).filter((r): r is ThirdPartyResult => r !== null);
```

## API Call Patterns (tRPC)

**Client setup:**

- `src/lib/trpc/client.ts` creates the typed React client: `createTRPCReact<AppRouter>()`
- `src/lib/trpc/provider.tsx` wraps the app with `TRPCProvider` + `QueryClientProvider`
- Query config: `staleTime: 30_000`, `refetchOnWindowFocus: false`
- Transport: `httpBatchLink` at `/api/trpc` with `superjson` transformer

**Component usage pattern:**

```typescript
// Mutation
const mutation = trpc.router.action.useMutation({ onSuccess: cb });
mutation.mutate(input);
mutation.isPending; // for loading UI
mutation.error; // for error display

// Query
const { data, isLoading } = trpc.router.action.useQuery(input);
```

**Server-side:**

- `publicProcedure`: unauthenticated access
- `protectedProcedure`: requires `ctx.user` — throws `UNAUTHORIZED` if not present
- Context created in `src/server/trpc/init.ts` — provides `supabase` client and `user`

## State Management Patterns

**No global state store.** State is local to each page component using `useState`.

**Typical page state:**

```typescript
const [fields, setFields] = useState({ name: '', destination: '', startDate: '', endDate: '' });
const [active, setActive] = useState<string | null>(null); // focused field
const [revealed, setRevealed] = useState(false); // entrance animation
```

**Derived state as computed variables:**

```typescript
const isReady = fields.name.trim() && fields.startDate && fields.endDate && !createTrip.isPending;
```

**Server state:** Managed entirely by tRPC + TanStack Query — no manual cache invalidation patterns observed in reviewed files.

## CSS and Styling Conventions

**Approach:** Tailwind CSS classes for layout and spacing. Inline `style` props for dynamic/design-token values.

**Design token pattern:** OKLCH color values used directly as inline styles for the light-mode cinematic theme:

```typescript
style={{ background: 'oklch(97% 0.008 70)', color: 'oklch(16% 0.015 60)' }}
```

**Tailwind for static classes:**

```typescript
className = 'font-display font-black tracking-tighter uppercase leading-[0.85]';
className = 'w-full py-4 rounded-2xl font-ui font-black text-[11px] uppercase tracking-[0.3em]';
```

**`cn()` utility:** Used in library-style components (like `atoms.tsx`) to merge Tailwind classes conditionally:

```typescript
import { cn } from '@/lib/utils';
<div className={cn(styles[variant], className)}>{children}</div>
```

**Custom CSS animations:** Defined inline with `<style jsx>` tags in page components for page-local keyframes. Global animations defined in `tailwind.config.ts` under `theme.extend.keyframes`.

**Fonts:**

- `font-display` → Bricolage Grotesque (variable: `--font-display`)
- `font-ui` → Nunito (variable: `--font-ui`)
- `font-mono` → Fira Mono (variable: `--font-mono`)

**Film grain effects:** Applied via CSS class `film-grain` (dark pages) or `light-grain` (cream pages) — these are div elements rendered as absolute overlays.

**Anti-pattern — heavy inline styles:** Page components (e.g. `new/page.tsx`, `join/page.tsx`) use very long inline `style` objects with transition strings and animation delays calculated from index. This makes pages hard to maintain. Components in `src/components/ui/atoms.tsx` use the cleaner `cn()` + Tailwind pattern.

## File Organization Conventions

**Pages:** `src/app/[route]/page.tsx` — each page is a single default export
**API routes:** `src/app/api/[endpoint]/route.ts`
**Components:**

- `src/components/ui/` — primitive atoms (`atoms.tsx`, `atoms.stories.tsx`)
- `src/components/cinematic/` — full-screen immersive sections
- `src/components/experience/` — feature components for auth, landing, trip views
- `src/components/providers/` — context providers (PostHog, etc.)
  **Server:**
- `src/server/trpc/init.ts` — tRPC context and base procedures
- `src/server/trpc/router.ts` — root router composition
- `src/server/trpc/routers/` — one file per domain: `trips.ts`, `photos.ts`, etc.
  **Lib:**
- `src/lib/trpc/` — client-side tRPC setup
- `src/lib/supabase/` — Supabase client factories
- `src/lib/anti-spam.ts`, `src/lib/analytics.ts`, `src/lib/utils.ts` — shared utilities
  **Types:** `src/types/domain.ts` — all shared DB-derived TypeScript interfaces

## Comment and Documentation Practices

**Module-level docblocks:** Used for complex utility files. Example from `src/lib/anti-spam.ts`:

```typescript
/**
 * Anti-spam and fraud-prevention utilities.
 *
 * Layers:
 *   1. Format validation (regex, local-only, fast)
 *   2. Disposable domain blocklist ...
 */
```

**Section dividers:** ASCII banner comments in long files:

```typescript
// ── 2. Disposable domain blocklist ─────────────────────────────────────────
```

**Inline explanatory comments:** Used for non-obvious decisions:

```typescript
// Use service role for writes — auth is already validated by protectedProcedure
// This bypasses RLS on trips/profiles/trip_members which can fail if the
// user's JWT isn't forwarded correctly to Supabase on Vercel
```

**Test file headers:** JSDoc block explaining what the test file covers and any setup requirements.

**TODO/explanation comments in JSX:** Single-line inline comments on structural decisions:

```typescript
{
  /* Light cream — intentional contrast with dark cinematic pages */
}
{
  /* Thin nav */
}
```

**What is NOT documented:** Individual tRPC procedure input schemas (self-documenting via Zod), most component props (typed via inline TypeScript).

## Anti-Patterns Observed

**1. Heavy inline style objects in page components:**
Pages like `src/app/trips/new/page.tsx` and `src/app/trips/join/page.tsx` have extremely long inline `style` props containing animation transitions with computed delays. This makes the JSX hard to read and the animation logic impossible to test.
**Better approach:** Extract animation styles into named Tailwind classes or CSS modules. Use the `cn()` + variant map pattern from `atoms.tsx`.

**2. Schema duplication in tests:**
`tests/unit/trip-validation.test.ts` replicates the `TripCreateInput` Zod schema that already exists in `src/server/trpc/routers/trips.ts`. If the server schema changes, the test schema must be manually kept in sync.
**Better approach:** Export `TripCreateInput` from `trips.ts` and import it directly in the test file.

**3. `as unknown as Type` Supabase cast pattern:**
Widespread use of double casts (`as unknown as InterfaceType`) because Supabase codegen types are stale. This suppresses TypeScript errors rather than fixing them.
**Better approach:** Regenerate Supabase types when the schema changes, or add a `codegen:types` script to the CI pipeline.

**4. `as never` for post-codegen columns:**
Using `.update({ lore_status: 'processing' } as never)` is pragmatic but hides type errors. Any field name typos will silently pass TypeScript.
**Better approach:** Same as above — keep generated types current.

**5. Mouse event handlers as inline `onMouseEnter`/`onMouseLeave` DOM manipulations:**
Some components directly mutate `e.currentTarget.style` in event handlers instead of using state or CSS `:hover`. Example in `new/page.tsx` button hover effect.
**Better approach:** Use Tailwind hover variants or a `hovered` state variable.

---

_Convention analysis: 2026-05-18_
