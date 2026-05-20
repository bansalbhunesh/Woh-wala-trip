# Knowledge Graph — Yaarlore

## System Nodes and Relationships

```
[USER] ─────────────── creates ────────────────► [TRIP]
  │                                                 │
  ├── joins (via invite_code) ──────────────────► [TRIP_MEMBER]
  │                                                 │
  ├── uploads ──────────────────────────────────► [PHOTO]
  │                                                 │
  └── pays (Razorpay) ──────────────────────────► [TRIP.tier]

[TRIP] ─── triggers ──────────────────────────► [LORE_PIPELINE]
  │         (≥5 photos, creator only)               │
  │                                                 ├── generates ──► [LORE_JSON]
  │                                                 ├── generates ──► [TRIP_ERAS]
  │                                                 ├── generates ──► [CHARACTER_ROLES]
  │                                                 ├── generates ──► [TRIP_STATS]
  │                                                 ├── extracts  ──► [TRIP_INCIDENTS]
  │                                                 ├── extracts  ──► [RECURRING_REFS]
  │                                                 └── builds    ──► [IDENTITY_SNAPSHOTS]

[LORE_JSON] ──── enables ──────────────────────► [PUBLIC_STORY /t/[code]/story]
  │                                               (requires story_visible=true)
  ├── enables ──────────────────────────────────► [BATTLE]
  │             (trip_vs_trip, both lore_status=ready)
  ├── enables ──────────────────────────────────► [YEARLY_WRAP]
  └── enables ──────────────────────────────────► [OG_CARD]

[IDENTITY_SNAPSHOTS] ─── builds ──────────────► [USER_ARCHETYPES]
  │                                               (cross-trip behavioral history)
  └── feeds ────────────────────────────────────► [GROUP_LORE_OS]
                                                  (living group mythology)

[PHOTO] ─── queues ───────────────────────────► [EMBED_PHOTO job]
  └─── generates ──────────────────────────────► [THUMBNAIL]
       (fire-and-forget HTTP to worker)

[TRIP_MEMBERS] ─── creates ──────────────────► [RELATIONSHIP_DYNAMICS]
  │                                               (pairwise chaos_delta, archetype_similarity)
  └── creates ─────────────────────────────────► [SOCIAL_ROLE_ASSIGNMENTS]

[LORE_DISPUTES] ─── resolved by ─────────────► [DISPUTE_VOTES]
  │                                               (majority wins, PK prevents double-vote)
  └── emits ───────────────────────────────────► [GROUP_PULSE_EVENTS]
```

---

## Ownership / Responsibility Mapping

| Domain                     | Owner (code)                                 | Danger                                                                 |
| -------------------------- | -------------------------------------------- | ---------------------------------------------------------------------- |
| Trip lifecycle             | `trips.ts` tRPC router                       | God-table (trips holds lore columns, payment columns, status, signals) |
| Photo upload + signed URLs | `photos.ts` tRPC router                      | Storage RLS always requires service client                             |
| Lore generation            | `orchestrator.py` Python                     | Single point of failure — runs on one Render free dyno                 |
| Image generation           | `image_gen.py` Python                        | Daily budget cap; failure never surfaces to user                       |
| Payments                   | `/api/payments/*` routes                     | Webhook is sole authoritative write path                               |
| Auth + OTP                 | `/api/auth/*` routes                         | Redis REQUIRED in production — hard fail if absent                     |
| Rate limiting              | `anti-spam.ts`                               | Redis REQUIRED in production — hard fail if absent                     |
| Job queuing                | `background_jobs` + `generation_jobs` tables | Worker must be running; cron recovery is no-op                         |
| AI observability           | `langfuse.ts`                                | No-op if keys not set — silent data loss                               |
| Email delivery             | `anniversaries` cron                         | Cron not auto-triggered (vercel.json empty)                            |

---

## Critical Flows and Dependencies

### Lore generation (most critical)

```
trips.generateLore (TS)
  → REQUIRES: AI_WORKER_URL, AI_WORKER_SECRET, AI_WORKER_HMAC_SECRET
  → REQUIRES: SUPABASE_SERVICE_ROLE_KEY (for atomic claim RPC)
  → REQUIRES: UPSTASH_REDIS (for monthly cap tracking)
  → HTTP → AI Worker on Render
  → REQUIRES: ANTHROPIC_API_KEY (Claude Sonnet 4.6 + Haiku 4.5)
  → Worker writes back to Supabase via service role
  → Notifies Next.js via /api/notify/lore-ready
```

### Payment flow (revenue critical)

```
Razorpay webhook → /api/payments/webhook
  → REQUIRES: RAZORPAY_WEBHOOK_SECRET
  → REQUIRES: SUPABASE_SERVICE_ROLE_KEY
  → Sole write path for tier upgrades
  → If webhook fails, user can't upgrade even if payment went through
```

### Rate limiting (security critical)

```
/api/auth/send-otp → checkRateLimit()
  → REQUIRES in production: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
  → Throws hard if Redis absent in production (fail-closed)
  → In-memory fallback ONLY in development
```

---

## Hidden Coupling (Things That Break Together)

1. **`trips` table + storage** — All storage ops (upload URL, signed URL generation) require the service client because user-session RLS blocks storage.objects. If service role key is wrong, ALL photo operations fail.

2. **Worker cold start + lore generation** — Render free tier cold starts in ~15 min. tRPC `warmupWorker` is called when photos reach 5 to pre-warm. If worker is cold when user clicks "Generate Lore," the 8-second timeout fires and the fallback queue path runs. If queue is also broken, generation silently fails.

3. **`trip_members` recursion fix** — Migration `2026051904_fix_trip_members_recursion.sql` fixed a recursive RLS policy bug. Any future policy changes to `trip_members` risk re-introducing the recursion that caused the original SEC-01 RLS failure.

4. **OTP + Supabase admin** — The OTP flow uses `supabase.auth.admin.generateLink()` which requires service role. If the Supabase project's `SUPABASE_SERVICE_ROLE_KEY` rotates without updating Vercel env vars, ALL logins break.

5. **Cron jobs + email delivery** — `vercel.json` is empty. Anniversary emails, nostalgia drops, battle notifications are ALL inactive. Scheduled emails accumulate in `scheduled_emails` table but are never sent unless an external scheduler calls the cron routes.

6. **Group Lore OS + canonical_group_hash RPC** — `_update_social_graph` in orchestrator calls `canonical_group_hash` Postgres RPC. If this function doesn't exist (e.g., missing migration in a new Supabase project), the social graph update fails silently but `run_enrichment()` is a background task so lore delivery is unaffected.

7. **Redis + Chaos distribution** — `getChaosDistribution` uses Upstash Redis cache. If Redis is configured but unhealthy, it logs a warning and falls back to DB query (not hard-fail). In production this creates N simultaneous full-table scans if Redis goes down during traffic spike.

---

## Technical Debt Nodes

(See `docs/TECH_DEBT.md` for full detail)

| Node                                                            | Risk                               | File                           |
| --------------------------------------------------------------- | ---------------------------------- | ------------------------------ |
| `lore_disputes` + `dispute_votes` accessed via `as never` casts | TypeScript silent failure          | `trips.ts`                     |
| `group_pulse_events` accessed via `as never`                    | Type safety hole                   | `trips.ts`, `battles.ts`       |
| `cast_vs_vote` via `(ctx.supabase as any).rpc(...)`             | No type checking                   | `battles.ts:198`               |
| `vercel.json` empty                                             | All crons silent                   | `vercel.json`                  |
| `wrap/[year]` route exists but generation recently added        | UI may be stale                    | `src/app/wrap/[year]/page.tsx` |
| `trips` table is a god-table                                    | Schema coupling                    | DB schema                      |
| Worker on Render free tier                                      | Cold start delays, single instance | `ai-worker/src/main.py`        |

---

## Dead / Orphaned Systems

- **`src/app/api/og-test/`** — Directory exists but no `route.ts` file found; likely dev debug endpoint left in place
- **`/api/cron/stuck-jobs`** — Route explicitly returns `{noop: true, reason: 'consolidated_to_worker'}`. The route must exist to prevent Vercel deploy errors but does nothing
- **Sentry config files** — `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` all contain `179 bytes` (likely just the minimal stub). Sentry is not actively configured unless `SENTRY_DSN` is set.

---

## Duplicated Logic

1. **Signed URL generation** — `photos.list` has its own caching logic; `photos.findSimilar` and `photos.nostalgiaFeed` generate fresh URLs on every call. No shared utility.
2. **Storage path resolution** — `ai-worker/src/lore/orchestrator.py:_analyze_one_batch` manually strips `trip-photos/` prefix from storage paths. Same logic exists differently in JS code.
3. **Service client creation** — `createSupabaseServiceClient()` is called at top-level in many procedures rather than being available on ctx. Minor — but means many service client instances per request.
4. **Background job insert pattern** — The `BackgroundJobInsertClient` type wrapper is copy-pasted with slight variations across `trips.markAbsent`, `battles.challenge`, `photos.confirmUpload`. No shared helper.

---

## Feature Interaction Map

| Feature A          | Interacts With                    | Nature                                                  |
| ------------------ | --------------------------------- | ------------------------------------------------------- |
| Lore generation    | Photo privacy (`is_private=true`) | Private photos excluded from AI analysis                |
| Lore generation    | Confession text                   | Injected into lore prompt                               |
| Lore generation    | Referral bonus                    | Bypasses monthly token cap                              |
| Battle             | Lore generation                   | Both trips must have `lore_status=ready`                |
| Battle             | Group Pulse                       | Emits `battle_started` event for both crews             |
| Payment upgrade    | Photo upload                      | Removes 50-photo free tier cap                          |
| Dispute system     | Character roles                   | Disputes a specific `trip_member` role                  |
| Dispute system     | Group Pulse                       | Emits `dispute_filed` event                             |
| Identity snapshots | Character roles                   | Reads from `trip_members` post-lore                     |
| Group Lore OS      | Trip incidents                    | Pulls `callback_potential=HIGH` incidents               |
| Callback context   | Lore generation                   | Past incidents injected into next trip's prompt         |
| Archetype sync     | User archetypes                   | Reads from finalized `trip_members.role_title`          |
| Yearly wrap        | Multiple trips                    | Aggregates lore from all trips in a given year          |
| Nostalgia feed     | Photo views                       | `high_dwell_photo_count` used as signal in lore         |
| Similar trips      | CLIP embeddings                   | Requires `VOYAGE_API_KEY` + `embedding_status=complete` |
