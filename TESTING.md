# Testing Infrastructure

## Overview

| Layer              | Tool                 | Location                               | Speed                   |
| ------------------ | -------------------- | -------------------------------------- | ----------------------- |
| Unit + Integration | Vitest + RTL         | `tests/unit/`, `tests/integration/`    | ~5s                     |
| E2E                | Playwright           | `tests/e2e/`                           | ~60-120s (needs server) |
| Visual Regression  | Playwright snapshots | `tests/e2e/visual-regression.spec.ts`  | ~30s                    |
| AI Quality         | DeepEval             | `ai-worker/tests/`                     | ~5min (LLM calls)       |
| AI Deterministic   | Python runner        | `ai-worker/tests/run_deterministic.py` | ~3s                     |
| Prompt Regression  | Promptfoo            | `tests/ai/promptfoo.yaml`              | ~2min (LLM calls)       |

## Quick Commands

```bash
# Full local check (lint + types + unit tests)
npm test

# Unit tests only
npm run test:unit

# Unit tests with coverage
npm run test:unit:coverage

# E2E (needs dev server running first: npm run dev)
npm run test:e2e

# Visual regression — generate baselines
npm run test:e2e:update-snapshots

# Python deterministic AI tests (no API key needed)
npm run test:ai:deterministic

# Python LLM tests (needs ANTHROPIC_API_KEY in ai-worker/.env)
npm run test:ai:eval
```

## Unit Tests (Vitest)

Files:

- `tests/unit/atoms.test.tsx` — CinematicText, FilmGrain, LightGrain components
- `tests/unit/trip-validation.test.ts` — Zod schema validation, email/phone format
- `tests/unit/new-trip-page.test.tsx` — NewTripPage form behavior
- `tests/unit/join-page.test.tsx` — JoinTripPage code input behavior
- `tests/unit/lore-utils.test.ts` — Chaos verdict mapping, nostalgia scoring, code normalization
- `tests/unit/anti-spam.test.ts` — Disposable email detection, rate limiting

Integration:

- `tests/integration/otp-route.test.ts` — `/api/auth/send-otp` route with mocked Supabase

## E2E Tests (Playwright)

Run against a live Next.js server. Covers:

- Landing page loads, fits one screen, no JS errors
- Auth flow: email input, OTP mock, protected redirect
- New trip form: validation, submit behavior
- Join trip: code input, uppercase, length limits
- Visual snapshots for 5 public routes

### Authenticated Tests

Set `PLAYWRIGHT_AUTH_COOKIE` env var to a JSON-serialized Playwright cookie array to run auth-gated tests.

## AI Tests (DeepEval)

Located in `ai-worker/tests/`. See `ai-worker/tests/README.md` (or `run_deterministic.py` for the no-LLM suite).

**Deterministic tests** (no API key, run in CI):

- Schema validation, verdict tier mapping, field lengths
- Forbidden phrase scanner (44 phrases)
- Nostalgia score formula
- Photo time clustering

**LLM-evaluated tests** (needs API key, run on demand):

- Narrative specificity + Hinglish voice (GEval)
- Toxicity, bias, PII (safety metrics)
- Signal faithfulness, hallucination detection
- Archetype accuracy, superlative distribution

## Visual Regression

Baseline snapshots stored in `tests/e2e/visual-regression.spec.ts-snapshots/`.

To update after intentional design changes:

```bash
npm run test:e2e:update-snapshots
```

## Prompt Regression (Promptfoo)

Config: `tests/ai/promptfoo.yaml`

```bash
npx promptfoo eval --config tests/ai/promptfoo.yaml
```

Tests: chaos verdict accuracy, forbidden phrase absence, member name faithfulness, verdict-level consistency.

## Anti-Spam

`src/lib/anti-spam.ts` provides:

- `checkEmail(raw)` — validates format + blocks disposable domains
- `checkRateLimit(key, max, windowMs)` — in-memory burst protection
- Used in `/api/auth/send-otp` + DB-backed rate limit (5 per 15 min)

## Observability (Langfuse)

`src/lib/langfuse.ts` — zero-config if `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` are not set (all calls are no-ops). Set them in `.env.local` to enable tracing.

Currently traces: `generate-lore-trigger` span in `tripsRouter.generateLore`.

## CI/CD

`.github/workflows/ci.yml` — runs on every push/PR to main:

1. **lint-typecheck** — ESLint + TypeScript
2. **unit-tests** — Vitest (122 tests), uploads coverage artifact
3. **e2e-tests** — Playwright chromium, public routes only
4. **python-deterministic** — ai-worker/tests/run_deterministic.py
5. **build** — Next.js production build check

`.github/workflows/ai-eval.yml` — weekly Monday, manual dispatch:

- DeepEval LLM test suite (requires secrets)
- Promptfoo prompt regression

## Code Quality

- **Prettier**: `npm run format` / `npm run format:check`
- **ESLint**: `npm run lint` / `npm run lint:fix`
- **Husky pre-commit**: runs `lint-staged` (format + lint changed TS/TSX files)
