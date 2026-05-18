# Testing Patterns

**Analysis Date:** 2026-05-18

## Test Framework

**Unit + Integration Runner:**

- Vitest 4.x
- Config: `vitest.config.ts`
- Environment: `jsdom`
- Globals: enabled (no explicit `import { describe, it, expect }` required, but tests still import them explicitly)
- Setup file: `tests/unit/setup.ts`

**E2E Runner:**

- Playwright 1.60.x
- Config: `playwright.config.ts`
- Browsers: Chromium (Desktop Chrome), Firefox (Desktop Firefox), Pixel 7 (mobile Chrome)

**AI Quality Tests:**

- DeepEval (Python) in `ai-worker/tests/`
- Promptfoo for prompt regression in `tests/ai/promptfoo.yaml`
- Python deterministic runner: `ai-worker/tests/run_deterministic.py`

**Assertion Libraries:**

- `@testing-library/jest-dom` — DOM matchers (`toBeInTheDocument`, `toHaveClass`, etc.)
- Vitest built-in `expect` — `toEqual`, `toBe`, `toMatchObject`, `toThrow`, etc.
- Playwright `expect` — `toBeVisible`, `toHaveScreenshot`, `toBeEnabled`, etc.

**Run Commands:**

```bash
npm test                          # Full check: type-check + lint + unit tests
npm run test:unit                 # Vitest run (one-shot)
npm run test:unit:watch           # Vitest watch mode
npm run test:unit:coverage        # Vitest with v8 coverage
npm run test:e2e                  # Playwright (all specs)
npm run test:e2e:ui               # Playwright interactive UI
npm run test:e2e:visual           # Visual regression only
npm run test:e2e:update-snapshots # Regenerate baseline screenshots
npm run test:ai:deterministic     # Python deterministic AI tests (no API key)
npm run test:ai:eval              # Python LLM tests (requires ANTHROPIC_API_KEY)
npm run test:ai:promptfoo         # Promptfoo prompt regression
```

## Test File Organization

**Location:**

```
tests/
├── unit/
│   ├── setup.ts                  # Global setup: jest-dom, router mocks, matchMedia mock
│   ├── atoms.test.tsx            # UI atom components (CinematicText, FilmGrain, LightGrain)
│   ├── trip-validation.test.ts   # Zod schema validation, email/phone regexes
│   ├── new-trip-page.test.tsx    # NewTripPage form interactions
│   ├── join-page.test.tsx        # JoinTripPage code input behavior
│   ├── lore-utils.test.ts        # Chaos verdict mapping, nostalgia scoring, code normalization
│   └── anti-spam.test.ts         # Full anti-spam module coverage
├── integration/
│   ├── otp-route.test.ts         # POST /api/auth/send-otp with mocked Supabase
│   └── api-contracts.test.ts     # API contract/shape verification
├── e2e/
│   ├── accessibility.spec.ts     # a11y checks for public routes
│   ├── anti-spam.spec.ts         # Anti-spam flow via browser
│   ├── api-contracts.spec.ts     # API shape tests via Playwright
│   ├── auth.spec.ts              # Auth flow + redirect protection
│   ├── confession.spec.ts        # Confession input feature
│   ├── generating.spec.ts        # Lore generation status polling
│   ├── invite.spec.ts            # Trip invite flow
│   ├── landing.spec.ts           # Landing page load, responsiveness
│   ├── new-trip.spec.ts          # New trip form + join trip form
│   ├── payments.spec.ts          # Payment flow
│   ├── public-lore.spec.ts       # Public lore page
│   ├── public-story.spec.ts      # Public story page
│   ├── route-protection.spec.ts  # Protected route redirect checks
│   ├── share-cards.spec.ts       # Share card generation
│   ├── trip-list.spec.ts         # Trip list page
│   └── visual-regression.spec.ts # Screenshot snapshots for 5 public routes
└── ai/
    └── promptfoo.yaml            # Prompt regression config
```

**Naming:**

- Unit/integration: `*.test.ts` or `*.test.tsx`
- E2E: `*.spec.ts`
- All test files are separated from `src/` — no co-located tests

**tsconfig:** `tests/tsconfig.json` exists; `src/tsconfig.json` explicitly `"exclude": ["tests"]` so test files are not type-checked against production strictness settings.

## Test Structure

**Suite Organization:**

```typescript
// Unit/integration — Vitest style
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ComponentOrModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does the expected thing', () => {
    // arrange → act → assert
    expect(result).toBe(expected);
  });
});
```

**E2E style:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/route');
    await page.waitForLoadState('networkidle');
  });

  test('behavior description', async ({ page }) => {
    await expect(page.getByRole('button', { name: /LABEL/i })).toBeVisible();
  });
});
```

**Parametric tests:** Used heavily in validation and anti-spam tests via `forEach`:

```typescript
const cases: [number, string][] = [
  [0, 'Mildly Simmering'],
  [81, 'Historically Cooked'],
];
cases.forEach(([level, expected]) => {
  it(`level ${level} → ${expected}`, () => {
    expect(getCookedVerdict(level)).toBe(expected);
  });
});
```

## Mocking

**Framework:** Vitest `vi.mock()`, `vi.fn()`, `vi.stubGlobal()`, `vi.stubEnv()`

**Patterns:**

Mocking tRPC client in component tests:

```typescript
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    trips: {
      create: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          isPending: false,
          error: null,
        })),
      },
    },
  },
}));
```

Updating mocks per test case:

```typescript
(trpc.trips.create.useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
  mutate: mockMutate,
  isPending: true,
  error: null,
});
```

Mocking Supabase (fluent chain):

```typescript
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockResolvedValue({ count: 0 }),
  auth: { admin: { generateLink: vi.fn().mockResolvedValue({ data: ..., error: null }) } },
};
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServiceClient: vi.fn(() => mockSupabase),
}));
```

Mocking `fetch` globally:

```typescript
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
// Per-test override:
(fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, json: async () => ({ ... }) });
```

Partial mock with `importOriginal` (preserving real implementation):

```typescript
vi.mock('@/lib/anti-spam', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/anti-spam')>();
  return {
    ...original,
    checkDisify: vi.fn().mockResolvedValue(null), // override only external calls
  };
});
```

**Global setup mocks** (`tests/unit/setup.ts`):

- `next/navigation`: `useRouter`, `usePathname`, `useSearchParams`
- `next/image`: simplified `img` element
- `window.matchMedia`: stub implementation

**What to mock:**

- All network calls (`fetch`, Supabase, external APIs)
- `next/navigation` hooks
- tRPC client hooks in component tests
- `framer-motion` when testing in jsdom (no layout APIs)
- Langfuse spans when testing route handlers

**What NOT to mock:**

- Pure utility functions (`isValidEmailFormat`, `normalizeEmail`, `cn`, `formatName`)
- Zod schema validation logic
- In-memory rate limiter logic (tested with fake timers)

## Fixtures and Factories

**Test data:** Inline objects, no separate fixture files or factory helpers.

```typescript
const valid = {
  name: 'Kasol 2024',
  destination: 'Himachal Pradesh',
  startDate: '2024-03-15',
  endDate: '2024-03-17',
};
// Spread for variation:
expect(() => TripCreateInput.parse({ ...valid, name: 'X' })).toThrow();
```

**Mock request factory** (integration tests):

```typescript
function makeRequest(body: unknown, ip = '127.0.0.1') {
  return {
    json: async () => body,
    headers: {
      get: (key: string) => (key === 'x-forwarded-for' ? ip : null),
    },
  };
}
```

**No fixture files.** Test data is defined inline or in the `beforeEach` block.

## Coverage

**Requirements:**

- Lines: 70%
- Functions: 70%
- Branches: 60%
- Provider: v8
- CI runs with `--coverage.thresholds.lines=60` (looser than local config)

**Report formats:** `text`, `lcov`, `html` (output to `coverage/`)

**Excluded from coverage:**

- `src/**/*.stories.{ts,tsx}`
- `src/app/api/**` (tested via integration tests but excluded from Vitest coverage)

**View Coverage:**

```bash
npm run test:unit:coverage
# HTML report at: coverage/index.html
# CI artifact uploaded as 'coverage-report' for 7 days
```

## Test Types

**Unit Tests (`tests/unit/`):**

- Scope: pure functions, utility modules, component rendering, form behavior
- Key areas: email validation, anti-spam logic, rate limiting, chaos verdict mapping, nostalgia scoring, Zod schema validation, UI atom rendering, page form state
- Run time: ~5s total (122 tests per TESTING.md)
- No network, no server required

**Integration Tests (`tests/integration/`):**

- Scope: Next.js route handler logic with mocked external dependencies
- Pattern: import `POST`/`GET` handler directly, call with fake `NextRequest`, assert HTTP response shape
- Mocked: Supabase, Langfuse, anti-spam external APIs
- Not mocked: email format validation, disposable domain blocklist, OTP DB insert logic

**E2E Tests (`tests/e2e/`):**

- Scope: browser-rendered UI against a live Next.js server
- Public routes tested in CI: `landing.spec.ts`, `auth.spec.ts`, `anti-spam.spec.ts`
- Authenticated tests: skipped in CI unless `PLAYWRIGHT_AUTH_COOKIE` env var is set
- Visual regression: 5 public routes, desktop + mobile, 200px max diff, canvas/grain elements masked
- Accessibility tests: heading count, aria labels, image alt text, focus management
- Run time: 60–120s (needs server)

**Visual Regression (`tests/e2e/visual-regression.spec.ts`):**

- Baselines stored in `tests/e2e/visual-regression.spec.ts-snapshots/`
- Tolerance: `maxDiffPixels: 200`
- Masked elements: `.film-grain`, `.light-grain`, `canvas` (animated, non-deterministic)
- Update command: `npm run test:e2e:update-snapshots`

**AI Tests (`ai-worker/tests/`, `tests/ai/`):**

- Deterministic (no API key): schema validation, verdict tier mapping, forbidden phrase scanning, nostalgia score formula, photo time clustering
- LLM-evaluated (requires ANTHROPIC_API_KEY): narrative specificity, Hinglish voice, toxicity/bias/PII, hallucination detection
- Prompt regression (Promptfoo): chaos verdict accuracy, forbidden phrase absence, member name faithfulness

## Common Patterns

**Async Testing:**

```typescript
// waitFor for state changes after interactions
await waitFor(() => expect(btn).not.toBeDisabled());

// findBy* for elements that appear asynchronously
const input = await screen.findByPlaceholderText('TRIPCODE');

// userEvent for realistic user input
const user = userEvent.setup();
await user.type(inputs[0], 'Kasol Trip');
await user.click(btn);
```

**Timer Testing:**

```typescript
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

vi.advanceTimersByTime(1_001); // advance past window
expect(checkRateLimit(key, 1, 1_000)).toBe(true);
```

**Error Testing:**

```typescript
// Zod validation throws:
expect(() => TripCreateInput.parse({ ...valid, name: 'X' })).toThrow();

// Mutation error state:
(trpc.trips.create.useMutation as ReturnType<typeof vi.fn>).mockReturnValue({
  mutate: mockMutate,
  isPending: false,
  error: { message: 'Could not create season: network error' },
});
render(<NewTripPage />);
expect(screen.getByText(/Could not create season/i)).toBeInTheDocument();
```

**E2E API Mocking:**

```typescript
// Mock API call in Playwright test
await page.route('**/api/auth/send-otp', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true }),
  });
});

// Mock tRPC call
await page.route('**/api/trpc/**', route => {
  if (route.request().url().includes('joinByCode')) {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ... }) });
  } else {
    route.continue();
  }
});
```

## CI Testing Pipeline

**File:** `.github/workflows/ci.yml`

**Trigger:** Push or PR to `main` branch. Concurrent runs canceled via concurrency group.

**Jobs (run in order):**

1. `lint-typecheck` — ESLint + `tsc --noEmit` (Node 20, `npm ci`)
2. `unit-tests` — Vitest with coverage threshold `lines=60`; uploads `coverage/` artifact (7 days)
3. `e2e-tests` — Playwright Chromium only; runs `landing.spec.ts`, `auth.spec.ts`, `anti-spam.spec.ts`; uploads `playwright-report/` artifact (14 days); depends on `lint-typecheck`
4. `python-deterministic` — `python -X utf8 -m tests.run_deterministic` (Python 3.11)
5. `build` — `npm run build` production build check; depends on `lint-typecheck`
6. `docker-ai-worker` — Docker build of `ai-worker/`

**Separate workflow:** `.github/workflows/ai-eval.yml` — weekly Monday + manual dispatch; runs DeepEval LLM suite and Promptfoo (requires API key secrets).

**Visual regression workflow:** `.github/workflows/visual-regression.yml` — separate; not in main CI gate.

## Test Quality Assessment

**Strengths:**

- Strong coverage of pure utility functions — `anti-spam.ts` has thorough parametric tests covering every exported function
- Integration tests for the `send-otp` route are realistic and test security properties (OTP not in response, error messages don't leak internal info)
- Fake timer usage for rate limiter tests is correct
- E2E tests use `networkidle` consistently before assertions
- Visual regression correctly masks non-deterministic elements (canvas, grain overlays)
- Accessibility spec covers heading count, aria labels, alt text, and focus management
- `framer-motion` mock in `setup.ts` is clean and prevents JSDOM layout errors

**Weaknesses and Gaps:**

**Schema duplication:** `tests/unit/trip-validation.test.ts` replicates the Zod schema from `src/server/trpc/routers/trips.ts`. If the server schema diverges, tests will pass but the system will reject input.

**Most tRPC routers untested at unit level.** Only `trips.ts` is exercised indirectly via integration tests on the OTP route. The `photos.ts`, `battles.ts`, `cards.ts`, `reactions.ts`, and `archetypes.ts` routers have no unit or integration tests.

**Authenticated E2E flows are entirely skipped in CI.** All tests requiring `PLAYWRIGHT_AUTH_COOKIE` are skipped unless the secret is provided. The new-trip form submit flow, join trip with real code, and photo upload are not tested end-to-end in CI.

**No tests for cinematic/experience components.** Components in `src/components/cinematic/` and `src/components/experience/` (DocumentaryTx, ArchiveRoom, Hero, CinematicLanding, etc.) have zero unit tests. These are visually complex and likely brittle.

**No tests for `src/lib/analytics.ts`.** PostHog event calls are not verified.

**No tests for `src/lib/langfuse.ts`** trace/span calls.

**The `lore-utils.test.ts` file tests locally-defined utility functions**, not the exported functions from any source file. The functions `getCookedVerdict` and `nostalgiaScore` are defined directly in the test file — they don't import from `src/`.

**Race condition protection in `generateLore` mutation** (atomic status claim, job queue fallback) is not tested in any layer.

---

_Testing analysis: 2026-05-18_
