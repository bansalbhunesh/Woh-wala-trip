# Architecture Report — Yaarlore Testing & Infrastructure

Generated: 2026-05-17

---

## Repository Overview

| Property        | Value                                       |
| --------------- | ------------------------------------------- |
| Framework       | Next.js 16 (App Router)                     |
| Language        | TypeScript 5.6                              |
| Package manager | npm                                         |
| Backend         | tRPC + Supabase (Postgres + Storage + Auth) |
| AI Worker       | FastAPI (Python 3.11) + Anthropic Claude    |
| Styling         | Tailwind CSS 3 + OKLCH design tokens        |
| Animation       | Framer Motion + GSAP                        |
| State           | TanStack Query v5                           |

## Archive Inspection Results

| Archive                | Contents                              | Version        | Notes                                                                |
| ---------------------- | ------------------------------------- | -------------- | -------------------------------------------------------------------- |
| `playwright-main.zip`  | Playwright monorepo                   | Latest         | Config patterns extracted for E2E setup                              |
| `promptfoo-main.zip`   | Promptfoo CLI source                  | 0.121.11       | Provider format `anthropic:messages:*` confirmed; examples extracted |
| `storybook-next.zip`   | Storybook monorepo                    | 10.5.0-alpha.0 | `@storybook/nextjs` framework config extracted                       |
| `langfuse-main.zip`    | Langfuse server (self-hosted)         | Latest         | Server config patterns; SDK replaced with zero-dep HTTP client       |
| `chromatic-master.zip` | Unrelated project (Chromium modifier) | N/A            | Not Chromatic.com — `chromatic` npm package used instead             |

## Pre-Existing Infrastructure

| Component          | Status Before                                   |
| ------------------ | ----------------------------------------------- |
| `@playwright/test` | Installed, config existed but barely configured |
| Tests directory    | None (only `ai-worker/tests/`)                  |
| CI/CD              | None (`.github/` directory missing)             |
| Prettier           | None                                            |
| Husky              | None                                            |
| ESLint             | Configured via `eslint-config-next`             |
| Anti-spam          | None                                            |
| Observability      | None                                            |
| Storybook          | None                                            |
| Chromatic          | None                                            |
| Vitest             | None                                            |

## Testing Architecture (After)

```
/tests
├── unit/           ← Vitest + React Testing Library (6 files, 151 tests)
│   ├── atoms.test.tsx           ← UI component rendering
│   ├── trip-validation.test.ts  ← Zod schema + phone/email validation
│   ├── new-trip-page.test.tsx   ← Page form behavior
│   ├── join-page.test.tsx       ← Code input behavior
│   ├── lore-utils.test.ts       ← Chaos scoring, nostalgia formula
│   └── anti-spam.test.ts        ← Full anti-spam stack (disposable, typo, fraud)
├── integration/    ← Direct handler testing (2 files)
│   ├── otp-route.test.ts       ← /api/auth/send-otp full route
│   └── api-contracts.test.ts   ← HTTP contract shapes
├── e2e/            ← Playwright (5 files)
│   ├── landing.spec.ts          ← Landing page, responsive, no JS errors
│   ├── auth.spec.ts             ← Auth flow, OTP, protected redirects
│   ├── new-trip.spec.ts         ← Trip creation + join flows
│   ├── anti-spam.spec.ts        ← Abuse flows, disposable email, rate limit
│   └── visual-regression.spec.ts ← Playwright screenshot baselines (5 routes × 2 viewports)
├── visual/         ← Reserved for Chromatic stories
└── ai/
    └── promptfoo.yaml   ← 6 prompt regression test cases (Anthropic provider format)

/ai-worker/tests/   ← Python (DeepEval + deterministic)
├── run_deterministic.py   ← 43 tests, zero API key required
├── test_schema.py         ← Lore JSON schema validation
├── test_safety.py         ← ToxicityMetric, BiasMetric, PII scan
├── test_lore_quality.py   ← GEval narrative quality (LLM-judged)
├── test_signals.py        ← FaithfulnessMetric, HallucinationMetric
├── test_archetypes.py     ← Archetype accuracy
├── test_chaos_calibration.py  ← Chaos score regression
├── test_battle.py         ← Battle verdict consistency
├── test_anniversary.py    ← Email content quality
└── test_pipeline_integration.py ← Pipeline integration

/.storybook/            ← Storybook config (Next.js framework, from archive)
/external-tools/        ← Extracted archives (D:\external-tools symlink)
/.github/workflows/
├── ci.yml              ← 5 parallel jobs on every push/PR
├── visual-regression.yml ← Chromatic + Playwright snapshots on UI changes
└── ai-eval.yml         ← Weekly DeepEval + Promptfoo (manual dispatch)
```

## Dependency Graph

```
Frontend Code
    ↓
Vitest + RTL (unit/integration) → Coverage reports
    ↓
Playwright (E2E) → Screenshots, videos, traces
    ↓
Storybook → Component isolation
    ↓
Chromatic → Visual regression diffs (needs CHROMATIC_PROJECT_TOKEN)
    ↓
Promptfoo → AI prompt regression (6 test cases, hallucination guards)
    ↓
Langfuse → Observability (zero-dep HTTP client, no-op when unconfigured)
```

## Architectural Weaknesses Found

| Issue                               | Severity | Status                                                           |
| ----------------------------------- | -------- | ---------------------------------------------------------------- |
| No anti-spam on OTP route           | High     | **Fixed** — disposable blocklist + 3 API providers + fraud score |
| No tests directory                  | High     | **Fixed** — 151 tests across unit/integration/AI layers          |
| No CI/CD                            | High     | **Fixed** — `.github/workflows/ci.yml`                           |
| Phone auth accepts `+91` alone      | High     | **Fixed** (previous session) — E.164 validation + auto-strip     |
| No observability                    | Medium   | **Fixed** — Langfuse HTTP client, security event tracing         |
| No visual regression                | Medium   | **Fixed** — Playwright snapshots + Chromatic workflow            |
| No code quality gates               | Medium   | **Fixed** — Prettier + Husky + lint-staged                       |
| `playwright.config.ts` nearly empty | Low      | **Fixed** — multi-browser, screenshots, video, traces            |
