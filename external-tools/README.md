# External Tools Archive Inspection

Archives extracted from `D:\Downloads` to `D:\external-tools\` (C: drive was 98% full).

## Archives

### chromatic-master.zip → `D:\external-tools\chromatic\`

**IMPORTANT**: This archive is NOT the Chromatic visual regression tool (chromatic.com).
It is a different project called "chromatic" — a universal modifier for Chromium/V8 (formerly BetterNCM).

**Action taken**: Installed the real Chromatic visual regression CLI via npm:
```
npm install -D chromatic
```
Config: `.github/workflows/visual-regression.yml`

---

### langfuse-main.zip → `D:\external-tools\langfuse\`

**Contents**: Langfuse self-hosted server monorepo (Next.js web app + worker + ClickHouse + Postgres + Redis)

**Key patterns extracted**:
- `.env.dev.example` — server configuration reference
- API endpoint: `/api/public/ingestion` with Basic auth
- Event format: `{ batch: [{ id, type, body }] }`
- Span types: `span-create`, `span-update`, `event-create`

**Action taken**: Built zero-dependency HTTP client at `src/lib/langfuse.ts` that:
- Sends directly to Langfuse ingestion API via fetch
- Is a complete no-op when `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` are absent
- Traces `generate-lore-trigger` span + security events

---

### playwright-main.zip → `D:\external-tools\playwright\`

**Contents**: Playwright test framework monorepo source

**Key patterns extracted**:
- Device profiles reference (`devices['Pixel 7']`, `devices['Desktop Chrome']`)
- Trace configuration: `trace: 'on-first-retry'`
- Screenshot configuration: `screenshot: 'only-on-failure'`
- Video: `video: 'on-first-retry'`
- Multi-project setup with `webServer` config for CI

**Action taken**: Updated `playwright.config.ts` with:
- 3 browser projects (Chromium, Firefox, Mobile Chrome)
- Screenshots, videos, traces on failure
- JSON + HTML reporters
- `webServer` config for CI

---

### promptfoo-main.zip → `D:\external-tools\promptfoo\`

**Contents**: Promptfoo CLI source (v0.121.11) + examples

**Key patterns from `examples/claude-thinking/promptfooconfig.yaml`**:
```yaml
# Schema declaration (best practice)
# yaml-language-server: $schema=https://promptfoo.dev/config-schema.json

# Correct provider IDs for Anthropic:
providers:
  - id: anthropic:messages:claude-sonnet-4-6
  - id: anthropic:messages:claude-haiku-4-5-20251001
```

**Action taken**: Updated `tests/ai/promptfoo.yaml` with:
- Correct provider IDs from the archive
- Schema declaration
- 6 test cases: chaos verdict, chill trip, hallucination guard, verdict-level contract, anti-toxicity, act structure

---

### storybook-next.zip → `D:\external-tools\storybook\`

**Contents**: Full Storybook monorepo source (yarn workspace)

**Key patterns from `code/frameworks/nextjs/package.json`**:
- Framework name: `@storybook/nextjs` (v10.5.0-alpha.0 in archive; use stable v8 from npm)
- Export structure confirms: `.storybook/main.ts` `framework.name: '@storybook/nextjs'`
- Export mocks: `@storybook/nextjs/navigation.mock`, `@storybook/nextjs/headers.mock`

**Action taken**: Created:
- `.storybook/main.ts` — framework config, addons
- `.storybook/preview.ts` — backgrounds (dark/cream), Next.js App Router
- `src/components/ui/atoms.stories.tsx` — CinematicText stories
- `src/app/trips/new/page.stories.tsx` — NewTripPage stories
- Excluded from root `tsconfig.json` until `@storybook/nextjs` installed

**To activate Storybook**:
```bash
npm install -D @storybook/nextjs storybook @storybook/addon-essentials @storybook/addon-interactions @storybook/addon-a11y
npm run storybook
```
