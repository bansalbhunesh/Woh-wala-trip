# Observability Report — Yaarlore

Generated: 2026-05-17

---

## Overview

Yaarlore uses a zero-dependency Langfuse HTTP client that is fully no-op when env vars are absent. No cold-start cost, no SDK bloat, no crashes if unconfigured.

## Architecture

```
User Request
    ↓
Next.js API Route / tRPC Procedure
    ↓
src/lib/langfuse.ts (singleton)
    ↓
Langfuse Ingestion API (async, fire-and-forget)
    → never throws, never blocks the request
```

## Traced Events

### AI Workflow Traces (Spans)

| Span Name               | Location                   | Input                      | Output                               |
| ----------------------- | -------------------------- | -------------------------- | ------------------------------------ |
| `generate-lore-trigger` | `tripsRouter.generateLore` | tripId, photoCount, userId | `{status: 'processing' \| 'queued'}` |

### Security Events

| Event Name                  | Location         | Metadata                              |
| --------------------------- | ---------------- | ------------------------------------- |
| `security:disposable_email` | `send-otp` route | ip, fraudScore, signals               |
| `security:rate_limited`     | `send-otp` route | ip, reason (ip_burst \| db_otp_limit) |
| `security:api_fraud_score`  | `send-otp` route | ip, fraudScore, apiResults            |

### Blocked Attempt Log

In-memory ring buffer (200 entries max) via `getBlockLog()`. Accessible via:

- `GET /api/admin/security-log` (not yet implemented — see roadmap)
- Console: `[anti-spam] blocked: pr***@mailinator.com reason=disposable_local score=80`

---

## Configuration

```bash
# .env.local
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com   # or self-hosted URL
```

When keys are absent: all trace calls are synchronous no-ops (< 1μs overhead).

## Langfuse Server (from langfuse-main.zip)

The `langfuse-main.zip` archive is the **self-hosted Langfuse server** (not the SDK). It uses:

- PostgreSQL + ClickHouse for event storage
- Redis for queuing
- MinIO for object storage
- Docker Compose for local development

To run locally:

```bash
cd external-tools/langfuse/langfuse-main
cp .env.dev.example .env
docker compose up
# Dashboard available at http://localhost:3000
```

---

## AI Quality Metrics to Track (Recommended)

| Metric                        | How to Track                                             |
| ----------------------------- | -------------------------------------------------------- |
| Lore generation latency       | `generate-lore-trigger` span duration                    |
| Token usage                   | Pass `usage.promptTokens/completionTokens` to span.end() |
| Chaos score calibration drift | Track `cooked_level` distribution over time              |
| Forbidden phrase rate         | Post-generation scan, event per violation                |
| Hallucination rate            | Manual sampling + Promptfoo weekly eval                  |
| Model switch impact           | Compare span outputs when model changes                  |

---

## Roadmap

1. ~~**Langfuse session tracking**~~ ✅ **Done** — `requestId = crypto.randomUUID()` generated per request in `send-otp`; passed as `traceId` to all `traceSecurityEvent()` calls so all security events for one HTTP request are correlated in Langfuse
2. **Token cost tracking** — instrument the ai-worker Python code to emit token usage per generation
3. ~~**Admin security log endpoint**~~ ✅ **Done** — `GET /api/admin/security-log` at `src/app/api/admin/security-log/route.ts`; protected by `Authorization: Bearer <ADMIN_API_TOKEN>` header; returns `{ count, events[] }`
4. **Alerting** — Langfuse webhooks → Slack alert when blocked attempts spike (>50/hour)
5. **A/B model tracking** — use Langfuse metadata to compare quality scores between Claude models
