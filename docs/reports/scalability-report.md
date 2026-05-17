# Scalability & CI/CD Report — Yaarlore

Generated: 2026-05-17

---

## CI/CD Summary

### Workflows

#### `ci.yml` — Main quality gate (runs on every push/PR to main)

| Job                    | Runs              | Duration Est. | Blocks Merge If             |
| ---------------------- | ----------------- | ------------- | --------------------------- |
| `lint-typecheck`       | Always            | ~60s          | Lint errors, type errors    |
| `unit-tests`           | Always            | ~20s          | Any test fails              |
| `e2e-tests`            | After lint passes | ~3-4 min      | E2E failures                |
| `python-deterministic` | Always            | ~30s          | Any of 43 Python tests fail |
| `build`                | After lint passes | ~2-3 min      | Build error                 |

**Total CI time**: ~5-6 min on a fast runner (jobs parallelized)

#### `visual-regression.yml` — UI change gate (only fires when UI files change)

| Job                 | Trigger                               | Blocks If               |
| ------------------- | ------------------------------------- | ----------------------- |
| `chromatic`         | `src/**/*.tsx`, CSS, Tailwind changes | Visual diffs unapproved |
| `playwright-visual` | Same paths                            | Snapshot diff >200px    |

#### `ai-eval.yml` — AI quality gate (weekly + manual dispatch)

| Job                | Trigger            | Blocks If               |
| ------------------ | ------------------ | ----------------------- |
| `python-llm-tests` | Manual (full eval) | DeepEval threshold fail |
| `promptfoo-eval`   | Weekly + manual    | Prompt regression fail  |

---

## Required GitHub Secrets

| Secret                          | Used By               | Description                                            |
| ------------------------------- | --------------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | ci.yml, visual.yml    | Supabase project URL                                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ci.yml, visual.yml    | Supabase anon key                                      |
| `SUPABASE_SERVICE_ROLE_KEY`     | ci.yml, visual.yml    | Service role key                                       |
| `CHROMATIC_PROJECT_TOKEN`       | visual-regression.yml | Chromatic project token (get from chromatic.com)       |
| `AI_WORKER_ANTHROPIC_API_KEY`   | ai-eval.yml           | Anthropic key for AI worker (NOT the same as main app) |
| `AI_WORKER_ANTHROPIC_BASE_URL`  | ai-eval.yml           | Optional: proxy base URL for AI worker                 |

---

## Scalability Recommendations

### Short-term (0-3 months)

1. **Storybook install** — Disk space was limited during setup. Once space is available:

   ```bash
   npm install -D @storybook/nextjs storybook @storybook/addon-essentials @storybook/addon-interactions @storybook/addon-a11y
   npx storybook dev -p 6006
   ```

   Config already in `.storybook/` (derived from `storybook-next.zip` archive inspection).

2. **Promptfoo install** — Add to `devDependencies` for local runs:

   ```bash
   npm install -D promptfoo
   ```

   Config ready at `tests/ai/promptfoo.yaml`.

3. ~~**Playwright browser install for CI**~~ ✅ **Done** — `ci.yml` now runs `npx playwright install --with-deps` (all 3 browsers) and removed `--project=chromium` filter

4. ~~**Coverage threshold enforcement**~~ ✅ **Done** — Thresholds raised to Lines: 70%, Functions: 70%, Branches: 60% in `vitest.config.ts`

5. ~~**Langfuse session IDs**~~ ✅ **Done** — `requestId` generated per request in `send-otp`; all `traceSecurityEvent()` calls pass it as `sessionId` for per-request event correlation in Langfuse

### Medium-term (3-6 months)

6. **Supertest HTTP integration tests** — The `supertest` package is installed. Wire it to a test server:

   ```ts
   // tests/integration/http-server.test.ts
   import supertest from 'supertest';
   import { createServer } from 'http';
   // Then test against real HTTP responses including headers
   ```

7. **Contract testing with Pact** — For tRPC procedures that are consumed by mobile clients

8. **Performance regression testing** — Add Playwright `page.metrics()` assertions for:
   - LCP < 2.5s on landing
   - CLS < 0.1 on trip room
   - FID < 100ms on login form

9. **Load testing** — Use k6 or Artillery for:
   - OTP route: 100 concurrent sends
   - tRPC `listMine`: 50 concurrent requests
   - AI worker: lore generation queue saturation

10. **Chromatic approval workflow** — Currently `autoAcceptChanges` on main. For PR workflow, set `exitZeroOnChanges: false` to block PRs with visual changes.

### Long-term (6+ months)

11. **Feature flag testing** — Use PostHog experiments (already installed) to run A/B tests on UI flows with automated quality gates

12. **Canary deployment testing** — Roll out new Claude model versions to 5% of generations, measure nostalgia score distribution via Langfuse, auto-rollback if quality drops >10%

13. **Mutation testing** — Add Stryker to find untested code paths (estimate: would reveal ~15-20% of business logic currently uncovered)

---

## Cost Estimates (per month at scale)

| Tool           | Cost                                           | Notes                        |
| -------------- | ---------------------------------------------- | ---------------------------- |
| Chromatic      | $0 (5k snapshots free) → $149/mo               | Free tier covers small teams |
| Promptfoo      | $0 (self-hosted)                               | Only LLM API costs           |
| Langfuse       | $0 (self-hosted) OR ~$59/mo cloud              | Cloud at 100k events/mo      |
| GitHub Actions | ~$0 (free tier for public; $0.008/min private) | ~$5-15/mo at current volume  |
| DeepEval       | $0 (OSS) + LLM API costs                       | ~$2-5/month at weekly runs   |
| Abstract API   | $0 (100/mo free)                               | Upgrade at scale             |
| Kickbox        | $0.004/verification                            | ~$4 per 1000 signups         |
