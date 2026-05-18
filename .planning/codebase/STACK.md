# Technology Stack

**Analysis Date:** 2026-05-18

## Languages

**Primary:**

- TypeScript 5.6 — entire Next.js frontend and API layer (`src/`)
- Python 3.11+ — AI worker microservice (`ai-worker/`)

**Secondary:**

- JavaScript (`.mjs` config files) — `next.config.mjs`, `postcss.config.mjs`, `scripts/prepare.mjs`

## Runtime

**Frontend / API:**

- Node.js (version not pinned; uses ESNext target, `moduleResolution: "bundler"`)

**AI Worker:**

- Python ≥ 3.11 (set in `ai-worker/pyproject.toml`)
- Served via Uvicorn + FastAPI (`ai-worker/src/main.py`)

**Package Manager:**

- npm (lockfile: `package-lock.json` — present)
- pip / venv for Python worker (`ai-worker/venv/`)

## Frameworks

**Core:**

- Next.js `^16.2.6` — App Router, React Server Components, route handlers in `src/app/api/`
- React `^19.2.6` — UI rendering
- FastAPI `>=0.115.0` — Python AI worker HTTP service

**Data Fetching / API Layer:**

- tRPC `^11.0.0-rc.446` — end-to-end typesafe RPC; routers in `src/server/trpc/routers/`
- TanStack React Query `^5.50.0` — client-side caching, co-used with tRPC's React Query adapter
- SuperJSON `^2.2.1` — tRPC serializer (handles Dates, Maps, etc.)

**Testing:**

- Vitest `^4.1.6` — unit and integration tests (`tests/unit/`, `tests/integration/`)
- Playwright `^1.60.0` — E2E and visual regression tests (`tests/e2e/`)
- Storybook `^10.4.0` / `@storybook/nextjs ^10.4.0` — component development and visual testing
- Chromatic `^16.10.1` — Storybook cloud CI for visual diff
- Testing Library (`@testing-library/react ^16.3.2`) — component rendering in Vitest

**Build / Dev:**

- Next.js built-in Turbopack/Webpack (no separate bundler config)
- Vite (`@vitejs/plugin-react ^6.0.2`) — used exclusively by Vitest, not the Next.js build

## Key Dependencies

| Package                                                              | Version                              | Purpose                                                                   |
| -------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `@anthropic-ai/sdk`                                                  | `^0.30.0`                            | Anthropic Claude API client (Next.js side, e.g. future server calls)      |
| `@supabase/ssr`                                                      | `^0.5.0`                             | Supabase cookie-based SSR auth client                                     |
| `@supabase/supabase-js`                                              | `^2.45.0`                            | Supabase data + service-role client                                       |
| `@trpc/server` + `@trpc/client` + `@trpc/react-query` + `@trpc/next` | `^11.0.0-rc.446`                     | Full tRPC stack                                                           |
| `@upstash/redis`                                                     | `^1.38.0`                            | HTTP Redis client for distributed rate limiting                           |
| `@upstash/ratelimit`                                                 | `^2.0.8`                             | Sliding-window rate limiter on top of Upstash Redis                       |
| `framer-motion`                                                      | `^12.38.0`                           | Declarative animations                                                    |
| `gsap`                                                               | `^3.15.0`                            | Imperative animation (timelines, scroll triggers)                         |
| `lucide-react`                                                       | `^1.16.0`                            | Icon set                                                                  |
| `posthog-js`                                                         | `^1.373.5`                           | Client-side product analytics                                             |
| `qrcode`                                                             | `^1.5.4`                             | QR code generation for share/invite flows                                 |
| `razorpay`                                                           | `^2.9.0`                             | Payment order creation (INR, server-side only)                            |
| `resend`                                                             | `^6.12.3`                            | Transactional email (OTPs, anniversary emails)                            |
| `three`                                                              | `^0.184.0` + `@types/three ^0.184.1` | 3D scene rendering                                                        |
| `zod`                                                                | `^3.23.8`                            | Runtime schema validation (tRPC input, forms)                             |
| `clsx` + `tailwind-merge`                                            | `^2.1.1` / `^3.6.0`                  | Conditional className composition via `cn()` helper in `src/lib/utils.ts` |

**Python AI Worker (`ai-worker/pyproject.toml`):**

| Package                            | Version                             | Purpose                                    |
| ---------------------------------- | ----------------------------------- | ------------------------------------------ |
| `anthropic`                        | `>=0.40.0`                          | Async Claude API client (vision + text)    |
| `supabase`                         | `>=2.8.0`                           | Database read/write for trip & lore data   |
| `fastapi`                          | `>=0.115.0`                         | HTTP API for lore generation endpoints     |
| `uvicorn[standard]`                | `>=0.30.0`                          | ASGI server                                |
| `pydantic` + `pydantic-settings`   | `>=2.8.0` / `>=2.4.0`               | Config and request validation              |
| `pillow` + `pyheif`                | `>=10.4.0` / `>=0.7.1`              | Image processing (HEIF/JPEG conversion)    |
| `tenacity`                         | `>=8.5.0`                           | Retry logic for Claude API calls           |
| `transformers` + `torch` + `numpy` | `>=4.40.0` / `>=2.2.0` / `>=1.26.0` | ML embeddings (`src/embeddings.py`)        |
| `httpx`                            | `>=0.27.0`                          | Async HTTP (fal.ai image generation calls) |

## CSS / Styling

**Approach:** Tailwind CSS utility-first with CSS custom properties for theming.

**Setup:**

- Tailwind CSS `^3.4.15` — config at `tailwind.config.ts`
- PostCSS `^8.4.49` — config at `postcss.config.mjs`
- Autoprefixer `^10.4.20`
- Global CSS variables in `src/app/globals.css` define theme tokens (`--bg`, `--bg-surface`, `--text`, `--text-muted`, `--border`, `--accent`)
- Custom color palettes in `tailwind.config.ts`: `cooked`, `chill`, `unstable`, `delusional`, `lore`, `film`
- Custom font families via CSS vars: `--font-display`, `--font-ui`, `--font-mono`
- Extensive custom keyframe animations (marquee, grain, shimmer, flicker, float variants, card-in, blob-float)
- `cn()` utility in `src/lib/utils.ts` wraps `clsx` + `tailwind-merge`

## State Management

- **Server state:** TanStack React Query (via tRPC's React Query adapter) — no standalone Zustand/Redux
- **Local / ephemeral UI state:** React `useState` / `useReducer` in components
- **No global client-side store** detected (no Redux, Zustand, Jotai, or Recoil)

## Form / Validation

- **Zod** `^3.23.8` — schema definitions for tRPC procedure inputs and custom validation
- No form library (react-hook-form, Formik) detected — forms appear to use controlled components with manual validation

## Date / Time

- No dedicated date library (no `date-fns`, `dayjs`, `luxon`) — native `Date` / `toISOString()` used throughout

## Testing Framework Summary

| Layer                   | Tool              | Config                            |
| ----------------------- | ----------------- | --------------------------------- |
| Unit + Integration      | Vitest 4          | `vitest.config.ts`                |
| E2E + Visual regression | Playwright        | `playwright.config.ts`            |
| Component stories       | Storybook 10      | `.storybook/`                     |
| Visual diff CI          | Chromatic         | `CHROMATIC_PROJECT_TOKEN` env var |
| Python AI evals         | pytest + deepeval | `ai-worker/pytest.ini`            |
| AI prompt evals         | promptfoo         | `tests/ai/promptfoo.yaml`         |

Coverage thresholds (Vitest): lines 70%, functions 70%, branches 60%.

## Linting / Formatting

| Tool        | Version   | Config                                                                              |
| ----------- | --------- | ----------------------------------------------------------------------------------- |
| ESLint      | `^9.15.0` | `eslint-config-next 16.2.6` (no separate `.eslintrc` found — uses Next.js defaults) |
| Prettier    | `^3.8.3`  | No `.prettierrc` found — uses defaults                                              |
| Husky       | `^9.1.7`  | Git hooks via `scripts/prepare.mjs`                                                 |
| lint-staged | `^17.0.5` | Runs Prettier on staged TS/JS/JSON/MD/YAML files                                    |

## TypeScript Configuration (`tsconfig.json`)

| Option                   | Value                       |
| ------------------------ | --------------------------- |
| `target`                 | `ESNext`                    |
| `strict`                 | `true`                      |
| `moduleResolution`       | `bundler`                   |
| `noEmit`                 | `true` (type-checking only) |
| `incremental`            | `true`                      |
| Path alias               | `@/*` → `./src/*`           |
| `isolatedModules`        | `true`                      |
| Excluded from type-check | `tests/`, `*.stories.ts(x)` |

## Build Tooling

- **Next.js built-in** — handles compilation, bundling, code splitting, image optimization
- **`next dev`** — development server
- **`next build`** / `next start`\*\* — production build + server
- **Vercel** — deployment target (inferred from `vercel.json` with cron definitions)

---

_Stack analysis: 2026-05-18_
