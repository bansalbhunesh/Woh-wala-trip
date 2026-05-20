# Feature Matrix — Yaarlore

## Status Legend

- **WORKING** — fully implemented, tested, no known blocking issues
- **AT RISK** — implemented but depends on external config or has known fragility
- **PARTIAL** — core works, edge cases or secondary functionality missing
- **BROKEN** — known to not work in production as-is

---

## Core Trip Features

| Feature                                                 | Status  | Issues                                                                    | Key Files                                    |
| ------------------------------------------------------- | ------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| Trip creation                                           | WORKING | None                                                                      | `trips.ts:create`                            |
| Trip invite code                                        | WORKING | None                                                                      | `trips.ts:joinByCode`                        |
| Trip member limit enforcement (6 free / unlimited paid) | WORKING | Enforced in `join_trip_by_code` RPC                                       | `trips.ts:joinByCode`                        |
| Trip list (paginated)                                   | WORKING | Uses `list_user_trips` SECURITY DEFINER RPC                               | `trips.ts:listMine`                          |
| Trip settings (edit name, etc.)                         | PARTIAL | Settings page exists; update mutation not confirmed in tRPC router        |
| Trip story visibility toggle                            | WORKING | `setStoryVisible` mutation + DB column                                    | `trips.ts:setStoryVisible`                   |
| Trip data export (JSON)                                 | WORKING | `exportData` mutation with 24h signed URLs                                | `trips.ts:exportData`                        |
| Trip archive ZIP                                        | PARTIAL | `exportArchive` query exists but ZIP assembly is client-side via JSZip    | `src/app/api/trips/[tripId]/export/route.ts` |
| Yearly wrap                                             | PARTIAL | Generation pipeline works; `/wrap/[year]` UI exists but may be incomplete | `trips.ts:generateYearlyWrap`                |

---

## Photo Features

| Feature                                   | Status  | Issues                                                        | Key Files                       |
| ----------------------------------------- | ------- | ------------------------------------------------------------- | ------------------------------- |
| Photo upload (signed URL)                 | WORKING | Storage RLS requires service client                           | `photos.ts:getUploadUrl`        |
| Upload confirmation + DB insert           | WORKING | Validates server-side file size from storage.objects          | `photos.ts:confirmUpload`       |
| Thumbnail generation                      | AT RISK | Fire-and-forget HTTP to worker; silently fails if worker down | `photos.ts:confirmUpload:267`   |
| Photo list (paginated + signed URL cache) | WORKING | URL cache prevents 80% of regen calls                         | `photos.ts:list`                |
| Photo privacy toggle                      | WORKING | `is_private` column; uploader-only                            | `photos.ts:togglePrivacy`       |
| CLIP embeddings                           | AT RISK | Requires `VOYAGE_API_KEY`; silently skipped if not set        | `ai-worker/src/embeddings.py`   |
| Similar photos discovery                  | AT RISK | Depends on embeddings being complete                          | `photos.ts:findSimilar`         |
| Photo view duration tracking              | WORKING | `recordView` mutation                                         | `photos.ts:recordView`          |
| Free tier cap (50 photos / 500MB)         | WORKING | Enforced on `getUploadUrl`                                    | `photos.ts:getUploadUrl:90-113` |

---

## Lore Generation Features

| Feature                                | Status  | Issues                                              | Key Files                               |
| -------------------------------------- | ------- | --------------------------------------------------- | --------------------------------------- |
| Lore generation trigger                | WORKING | Atomic claim prevents race conditions               | `trips.ts:generateLore`                 |
| 8-step AI pipeline                     | WORKING | 60k token budget; vision + aggregate + lore + roles | `orchestrator.py`                       |
| Generating page real-time progress     | WORKING | Supabase Realtime on `lore_pipeline_state`          | `generating/page.tsx`                   |
| Queue fallback (HTTP trigger fails)    | WORKING | `generation_jobs` → poll every 60s                  | `main.py:poll_job_queue`                |
| Stuck pipeline recovery                | WORKING | Worker resets pipelines stuck >30min                | `orchestrator.py:reset_stuck_pipelines` |
| Quality gate (auto-retry below 0.55)   | WORKING | LoreEvaluator + retry once                          | `orchestrator.py:_quality_gate`         |
| Lore eval sampling                     | WORKING | 100% in dev, 20% in prod (configurable)             | `config.py:LORE_EVAL_SAMPLE_RATE`       |
| Monthly token cap                      | WORKING | Per-user cap via profiles table                     | `trips.ts:generateLore:466-489`         |
| First generation always free           | WORKING | Bypasses token cap check                            | `trips.ts:generateLore:444`             |
| Confession injection                   | WORKING | Sanitized + injected into lore prompt               | `orchestrator.py:_get_confessions`      |
| Callback context (mythology callbacks) | WORKING | Past incidents injected for returning groups        | `orchestrator.py:_get_callback_context` |
| Prompt injection defense               | WORKING | 6-layer sanitization on user-supplied fields        | `orchestrator.py:sanitize_for_prompt`   |
| Low confidence mode (<8 photos)        | WORKING | Softer tone, chaos clamped 20-65                    | `orchestrator.py:_generate_lore`        |

---

## Story Experience Features

| Feature                          | Status  | Issues                                        | Key Files                                            |
| -------------------------------- | ------- | --------------------------------------------- | ---------------------------------------------------- |
| Documentary view (private)       | WORKING | `/trips/[tripId]/story`                       | `Documentary.tsx`                                    |
| Public story page                | WORKING | `/t/[code]/story`                             | `PublicStoryClient.tsx`                              |
| Character roles display          | WORKING | Per-member archetype cards                    | `trip_members.role_*` columns                        |
| Trip eras / chapters             | WORKING | `trip_eras` table                             |                                                      |
| Receipt stats                    | WORKING | `trip_stats` table                            |                                                      |
| Chaos score display + percentile | AT RISK | Percentile requires ≥10 trips on platform     | `trips.ts:getChaosDistribution`                      |
| Trip cover art (fal.ai)          | AT RISK | Requires `FAL_API_KEY`; silent skip if absent | `image_gen.py:generate_trip_cover`                   |
| Character portrait art           | AT RISK | Same fal.ai dependency                        | `image_gen.py:generate_character_portraits`          |
| Era thumbnail art                | AT RISK | Same fal.ai dependency                        | `image_gen.py:generate_era_thumbnails`               |
| Dispute system                   | WORKING | File dispute + 48h vote window                | `trips.ts:disputeCharacterRole`, `DisputeSystem.tsx` |
| Incident log                     | WORKING | Extracted post-generation                     | `orchestrator.py:_extract_incidents`                 |
| Emoji reactions on lore          | WORKING | With `is_public` guard                        | `reactions/route.ts`                                 |
| OG card generation               | WORKING | Satori edge renderer                          | `/api/card/*` routes                                 |

---

## Social / Sharing Features

| Feature                        | Status  | Issues                                                                   | Key Files                        |
| ------------------------------ | ------- | ------------------------------------------------------------------------ | -------------------------------- |
| Public story sharing           | WORKING | `/t/[code]/story`                                                        |                                  |
| WhatsApp pre-fill share        | WORKING | In anniversary email + share page                                        |                                  |
| Battle challenge               | WORKING | Queue-based, judge via AI                                                | `battles.ts:challenge`           |
| Battle voting                  | WORKING | Server-authoritative dedup                                               | `battles.ts:vote`                |
| Group Pulse feed               | PARTIAL | Events inserted; UI exists but full rendering depends on component state | `group_pulse_events`             |
| Archetype history (public)     | WORKING | `/u/[username]` uses `getPublicHistory`                                  | `archetypes.ts`                  |
| Nostalgia feed ("On This Day") | AT RISK | Requires photos from prior years + embeddings                            | `trips.ts:getNostalgiaFeed`      |
| Similar public trips discovery | AT RISK | Requires CLIP embeddings to be populated                                 | `trips.ts:getSimilarPublicTrips` |
| Leaderboard                    | PARTIAL | Page exists; query implementation not confirmed                          | `src/app/leaderboard/page.tsx`   |

---

## Engagement / Retention Features

| Feature                    | Status  | Issues                                                                              | Key Files                 |
| -------------------------- | ------- | ----------------------------------------------------------------------------------- | ------------------------- |
| Anniversary email (1yr)    | BROKEN  | Cron route exists but `vercel.json` is empty — never triggers                       | `/api/cron/anniversaries` |
| First-week follow-up email | BROKEN  | Same — cron never triggers                                                          | `/api/cron/anniversaries` |
| Push notifications         | AT RISK | `push_subscriptions` table + subscribe route exists; trigger in `notify/lore-ready` |                           |
| Referral system            | WORKING | 3 referrals → unlock free generation                                                | `trips.ts:applyReferral`  |
| Yearly wrap                | PARTIAL | Generation works; UI completeness unknown                                           |                           |

---

## Payments Features

| Feature                       | Status  | Issues                                                    | Key Files                    |
| ----------------------------- | ------- | --------------------------------------------------------- | ---------------------------- |
| Order creation (one-time)     | WORKING | ₹399 digital / ₹799 print                                 | `/api/payments/create-order` |
| Order creation (subscription) | WORKING | ₹99/mo / ₹799/yr                                          | `/api/payments/create-order` |
| Webhook processing            | WORKING | HMAC verified; amount validated; downgrade protected      | `/api/payments/webhook`      |
| Tier upgrade confirmation     | WORKING | Read-only tRPC gate checks `webhook_payment_id`           | `trips.ts:upgradeTier`       |
| Print waitlist                | PARTIAL | Waitlist signup exists; print fulfillment not implemented | `/api/print-waitlist`        |

---

## Security Features

| Feature                       | Status  | Issues                                         | Key Files                                          |
| ----------------------------- | ------- | ---------------------------------------------- | -------------------------------------------------- |
| RLS on all tables             | WORKING | Phase 1 complete (all tables)                  | `migrations/2026051902_security_rls_hardening.sql` |
| CSP header (nonce-based)      | WORKING | Per-request nonce via middleware               | `src/middleware.ts`                                |
| Rate limiting (Upstash Redis) | WORKING | Hard-fail in production; in-memory only in dev | `src/lib/anti-spam.ts`                             |
| HMAC signing on worker calls  | WORKING | Timestamp + signature validation               | `src/lib/worker-auth.ts`, `ai-worker/src/auth.py`  |
| Disposable email blocklist    | WORKING | 60+ domains + third-party API checks           | `src/lib/anti-spam.ts`                             |
| OTP HMAC hashing              | WORKING | `OTP_HMAC_SECRET` required                     | `/api/auth/send-otp`                               |
| Razorpay webhook signature    | WORKING | `timingSafeEqual` comparison                   | `/api/payments/webhook:43-49`                      |
| Storage path validation       | WORKING | Prefix must match tripId/userId                | `photos.ts:confirmUpload:159`                      |
