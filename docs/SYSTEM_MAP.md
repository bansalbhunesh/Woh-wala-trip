# System Map — Yaarlore

## All Pages and Routes

| Route                        | File                                         | Auth      | Description                          |
| ---------------------------- | -------------------------------------------- | --------- | ------------------------------------ |
| `/`                          | `src/app/page.tsx`                           | Public    | Landing page with cinematic showcase |
| `/(auth)/login`              | `src/app/(auth)/login/page.tsx`              | Public    | OTP login page                       |
| `/trips`                     | `src/app/trips/page.tsx`                     | Protected | Trip list / dashboard                |
| `/trips/new`                 | `src/app/trips/new/page.tsx`                 | Protected | Create new trip                      |
| `/trips/join`                | `src/app/trips/join/page.tsx`                | Protected | Join by invite code                  |
| `/trips/[tripId]`            | `src/app/trips/[tripId]/page.tsx`            | Protected | Trip detail + photo grid             |
| `/trips/[tripId]/generating` | `src/app/trips/[tripId]/generating/page.tsx` | Protected | Lore generation progress             |
| `/trips/[tripId]/story`      | `src/app/trips/[tripId]/story/page.tsx`      | Protected | Full documentary view                |
| `/trips/[tripId]/share`      | `src/app/trips/[tripId]/share/page.tsx`      | Protected | Share options                        |
| `/trips/[tripId]/card`       | `src/app/trips/[tripId]/card/page.tsx`       | Protected | OG card preview                      |
| `/trips/[tripId]/invite`     | `src/app/trips/[tripId]/invite/page.tsx`     | Protected | Invite link + QR                     |
| `/trips/[tripId]/settings`   | `src/app/trips/[tripId]/settings/page.tsx`   | Protected | Trip settings                        |
| `/trips/[tripId]/upgrade`    | `src/app/trips/[tripId]/upgrade/page.tsx`    | Protected | Razorpay payment                     |
| `/t/[code]`                  | `src/app/t/[code]/page.tsx`                  | Public    | Public trip landing                  |
| `/t/[code]/story`            | `src/app/t/[code]/story/page.tsx`            | Public    | Public story player                  |
| `/battles/[battleId]`        | `src/app/battles/[battleId]/page.tsx`        | Public    | Battle view + voting                 |
| `/leaderboard`               | `src/app/leaderboard/page.tsx`               | Public    | Trip leaderboard                     |
| `/u/[username]`              | `src/app/u/[username]/page.tsx`              | Public    | Public user profile                  |
| `/wrap/[year]`               | `src/app/wrap/[year]/page.tsx`               | Protected | Yearly wrap view                     |
| `/demo`                      | `src/app/demo/page.tsx`                      | Public    | Demo story (no auth)                 |
| `/status`                    | `src/app/status/page.tsx`                    | Public    | System status                        |
| `/contact`                   | `src/app/contact/page.tsx`                   | Public    | Contact                              |
| `/privacy`                   | `src/app/privacy/page.tsx`                   | Public    | Privacy policy                       |
| `/terms`                     | `src/app/terms/page.tsx`                     | Public    | Terms of service                     |
| `/auth/callback`             | `src/app/auth/callback/route.ts`             | —         | Supabase OAuth callback              |

---

## All API Routes

| Route                                   | Method   | Auth             | Purpose                                    |
| --------------------------------------- | -------- | ---------------- | ------------------------------------------ |
| `/api/auth/send-otp`                    | POST     | None             | OTP generation + Resend email              |
| `/api/auth/verify-otp`                  | POST     | None             | OTP verification + session creation        |
| `/api/payments/create-order`            | POST     | Session          | Razorpay order creation                    |
| `/api/payments/webhook`                 | POST     | HMAC sig         | Razorpay payment confirmation              |
| `/api/card/[tripId]`                    | GET      | None             | Trip OG card (Satori)                      |
| `/api/card/story/[tripId]`              | GET      | None             | Story OG card                              |
| `/api/card/battle/[battleId]`           | GET      | None             | Battle OG card                             |
| `/api/card/archetype/[tripId]/[userId]` | GET      | None             | Character archetype card                   |
| `/api/card/wrap/[userId]/[year]`        | GET      | None             | Yearly wrap card                           |
| `/api/cron/anniversaries`               | GET      | CRON_SECRET      | Anniversary + first-week emails            |
| `/api/cron/battle-notifications`        | GET      | CRON_SECRET      | Battle expiry notifications                |
| `/api/cron/nostalgia-drops`             | GET      | CRON_SECRET      | Nostalgia feed notifications               |
| `/api/cron/on-this-day`                 | GET      | CRON_SECRET      | "On this day" notifications                |
| `/api/cron/refresh-chaos`               | GET      | CRON_SECRET      | Refresh chaos_distribution_cache view      |
| `/api/cron/stuck-jobs`                  | GET      | CRON_SECRET      | No-op (consolidated to worker)             |
| `/api/cron/weekly-arc`                  | GET      | CRON_SECRET      | Weekly arc digest                          |
| `/api/notify/lore-ready`                | POST     | AI_WORKER_SECRET | Worker → Next.js push notification trigger |
| `/api/push/subscribe`                   | POST     | Session          | Web Push subscription registration         |
| `/api/reactions`                        | POST     | Optional         | Emoji reactions on lore                    |
| `/api/trips/[tripId]/export`            | GET      | Session          | Trip data JSON export                      |
| `/api/print-waitlist`                   | POST     | None             | Print product waitlist                     |
| `/api/health`                           | GET      | None             | Health check                               |
| `/api/trpc/[trpc]`                      | GET/POST | —                | tRPC handler                               |
| `/api/admin/security-log`               | GET      | Admin            | View blocked attempts                      |
| `/api/admin/seed-demo`                  | POST     | Admin            | Seed demo data                             |

---

## All tRPC Procedures

### `trips` router (`src/server/trpc/routers/trips.ts`)

| Procedure                       | Type     | Auth      |
| ------------------------------- | -------- | --------- |
| `trips.create`                  | mutation | protected |
| `trips.getFull`                 | query    | protected |
| `trips.joinByCode`              | mutation | protected |
| `trips.listMine`                | query    | protected |
| `trips.generateLore`            | mutation | protected |
| `trips.submitConfession`        | mutation | protected |
| `trips.markAbsent`              | mutation | protected |
| `trips.resetStuckLore`          | mutation | protected |
| `trips.resetLoreStatusToUpload` | mutation | protected |
| `trips.upgradeTier`             | mutation | protected |
| `trips.applyReferral`           | mutation | protected |
| `trips.getReferralStatus`       | query    | protected |
| `trips.setStoryVisible`         | mutation | protected |
| `trips.exportArchive`           | query    | protected |
| `trips.getChaosDistribution`    | query    | protected |
| `trips.isFirstGeneration`       | query    | protected |
| `trips.warmupWorker`            | mutation | protected |
| `trips.getNostalgiaFeed`        | query    | protected |
| `trips.getSimilarPublicTrips`   | query    | protected |
| `trips.generateYearlyWrap`      | mutation | protected |
| `trips.getYearlyWrap`           | query    | protected |
| `trips.exportData`              | mutation | protected |
| `trips.getPublicShowcase`       | query    | public    |
| `trips.disputeCharacterRole`    | mutation | protected |
| `trips.voteOnDispute`           | mutation | protected |

### `photos` router (`src/server/trpc/routers/photos.ts`)

| Procedure                | Type     | Auth      |
| ------------------------ | -------- | --------- |
| `photos.getUploadUrl`    | mutation | protected |
| `photos.confirmUpload`   | mutation | protected |
| `photos.recordView`      | mutation | protected |
| `photos.findSimilar`     | query    | protected |
| `photos.nostalgiaFeed`   | query    | protected |
| `photos.list`            | query    | protected |
| `photos.togglePrivacy`   | mutation | protected |
| `photos.embeddingHealth` | query    | protected |

### `battles` router (`src/server/trpc/routers/battles.ts`)

| Procedure           | Type     | Auth      |
| ------------------- | -------- | --------- |
| `battles.challenge` | mutation | protected |
| `battles.get`       | query    | public    |
| `battles.vote`      | mutation | protected |

### `archetypes` router (`src/server/trpc/routers/archetypes.ts`)

| Procedure                     | Type     | Auth      |
| ----------------------------- | -------- | --------- |
| `archetypes.getHistory`       | query    | protected |
| `archetypes.syncFromTrip`     | mutation | protected |
| `archetypes.getPublicHistory` | query    | public    |

### `reactions` router (`src/server/trpc/routers/reactions.ts`)

- emoji reactions on lore (protected + public for anonymous)

### `cards` router (`src/server/trpc/routers/cards.ts`)

- OG card generation helpers (protected)

---

## All Components

### `src/components/cinematic/`

| Component          | Purpose                                             |
| ------------------ | --------------------------------------------------- |
| `Documentary.tsx`  | Full documentary view — narrative + eras + timeline |
| `ArchiveRoom.tsx`  | Archive browsing experience                         |
| `Orchestrator.tsx` | Orchestrates cinematic sequence transitions         |
| `Frames.tsx`       | Cinematic frame/panel layouts                       |
| `Hero.tsx`         | Landing hero section                                |
| `Artifacts.tsx`    | Lore artifact display cards                         |

### `src/components/experience/`

| Component                     | Purpose                            |
| ----------------------------- | ---------------------------------- |
| `CinematicLanding.tsx`        | Full landing page experience       |
| `CinematicAuth.tsx`           | Auth (OTP) experience wrapper      |
| `CinematicShell.tsx`          | App shell with navigation          |
| `GeneratingState.tsx`         | Lore generation progress UI        |
| `FailedState.tsx`             | Generation failed state            |
| `UploadState.tsx`             | Photo upload state                 |
| `LoadingStates.tsx`           | Various loading states             |
| `LandingClient.tsx`           | Client-side landing interactions   |
| `DisputeSystem.tsx`           | Character role dispute + voting UI |
| `ConfessionInput.tsx`         | Trip confession submission form    |
| `DeeperRecord.tsx`            | Deep trip record view              |
| `CharacterArc.tsx`            | Member character arc visualization |
| `IncidentLog.tsx`             | Discrete incident records          |
| `FriendshipTimeline.tsx`      | Cross-trip friendship timeline     |
| `GroupPulse.tsx`              | Group activity feed                |
| `GroupAnthem.tsx`             | Group vibe/anthem display          |
| `MemoryReview.tsx`            | Memory review window UI            |
| `MoodSoundtrack.tsx`          | Trip mood + soundtrack             |
| `ProphecyCard.tsx`            | Pre-trip prophecy display          |
| `RecurringIdentityWidget.tsx` | Cross-trip identity patterns       |
| `TripWidgets.tsx`             | Misc trip stat widgets             |
| `LoreCapsules.tsx`            | Lore snapshot cards                |
| `ReactionBar.tsx`             | Emoji reaction bar                 |
| `ScratchReveal.tsx`           | Scratch-card reveal animation      |
| `SlidePhotoBackground.tsx`    | Slideshow background               |
| `EmotionalDamageScan.tsx`     | Chaos score reveal animation       |
| `ParticleUniverse.tsx`        | Three.js particle background       |
| `PushNotificationToggle.tsx`  | Push notification opt-in           |

### `src/components/ui/`

| Component   | Purpose                                  |
| ----------- | ---------------------------------------- |
| `atoms.tsx` | Design system: Button, Card, Badge, etc. |

### `src/components/providers/`

| Component             | Purpose                   |
| --------------------- | ------------------------- |
| `PostHogProvider.tsx` | PostHog analytics context |

---

## All Hooks

None explicitly in `src/hooks/` directory. Client hooks are inline in components or via tRPC's `useQuery`/`useMutation`.

---

## All DB Tables

(From `supabase/migrations/` directory, complete list)

| Table / View               | Description                                                    |
| -------------------------- | -------------------------------------------------------------- |
| `trips`                    | Core trip record + lore columns                                |
| `trip_members`             | Trip membership + character roles                              |
| `photos`                   | Uploaded photos + signed URL cache + embeddings                |
| `photo_views`              | Photo view duration analytics                                  |
| `trip_eras`                | AI-generated trip chapter eras                                 |
| `trip_stats`               | Quantitative trip statistics                                   |
| `trip_vs_trip`             | Battle records                                                 |
| `background_jobs`          | Durable job queue (image gen, judge battle, embed photo, etc.) |
| `generation_jobs`          | Lore generation job queue                                      |
| `scheduled_emails`         | Anniversary + first-week emails                                |
| `otp_codes`                | Hashed OTP codes (UUID PK)                                     |
| `profiles`                 | User profiles, referral tracking, token usage                  |
| `user_archetypes`          | Per-trip archetype history                                     |
| `yearly_wraps`             | AI-generated yearly wrap summaries                             |
| `lore_disputes`            | Character role dispute records                                 |
| `dispute_votes`            | Dispute votes (PK prevents double-vote)                        |
| `group_pulse_events`       | Social activity feed events                                    |
| `user_identity_snapshots`  | Per-trip behavioral snapshots                                  |
| `relationship_dynamics`    | Pairwise relationship records                                  |
| `social_role_assignments`  | Social role labels per trip                                    |
| `group_lore_os`            | Living group mythology document                                |
| `trip_incidents`           | Structured incident records                                    |
| `evidence_gaps`            | Documented timeline gaps                                       |
| `recurring_references`     | Group vocabulary / callback phrases                            |
| `fal_budget`               | Daily fal.ai call counter                                      |
| `print_waitlist`           | Print product waitlist                                         |
| `lore_reactions`           | Emoji reactions on lore                                        |
| `push_subscriptions`       | Web Push subscriptions                                         |
| **Views**                  |                                                                |
| `chaos_distribution_cache` | Materialized view of chaos_score distribution                  |

---

## All Background Jobs / Cron Jobs

### Worker polling loops (always running)

| Job                       | Interval                     | Source File                          |
| ------------------------- | ---------------------------- | ------------------------------------ |
| `poll_job_queue()`        | 60s                          | `ai-worker/src/main.py`              |
| `poll_background_jobs()`  | 60s (offset 15s)             | `ai-worker/src/main.py`              |
| `reset_stuck_pipelines()` | Every 30 poll ticks (~30min) | `ai-worker/src/lore/orchestrator.py` |

### Vercel Cron endpoints (declared but vercel.json is empty — NOT active on Vercel)

| Endpoint                         | Intended schedule          | Status                           |
| -------------------------------- | -------------------------- | -------------------------------- |
| `/api/cron/anniversaries`        | Daily 6am UTC              | Route exists, NOT in vercel.json |
| `/api/cron/battle-notifications` | Daily                      | Route exists, NOT in vercel.json |
| `/api/cron/nostalgia-drops`      | Daily                      | Route exists, NOT in vercel.json |
| `/api/cron/on-this-day`          | Daily                      | Route exists, NOT in vercel.json |
| `/api/cron/refresh-chaos`        | Hourly (for cache refresh) | Route exists, NOT in vercel.json |
| `/api/cron/stuck-jobs`           | Daily (no-op)              | Route exists, NOT in vercel.json |
| `/api/cron/weekly-arc`           | Weekly                     | Route exists, NOT in vercel.json |

**NOTE:** `vercel.json` is `{}` (empty). None of the cron routes are being triggered automatically. External scheduler required. This is a BROKEN/MISSING piece of the production setup.

---

## Analytics Integration Points

| Event                       | Where                                  |
| --------------------------- | -------------------------------------- |
| PostHog page views          | `PostHogProvider.tsx` (automatic)      |
| PostHog custom events       | Via `posthog-js` in components         |
| Langfuse span: lore trigger | `src/server/trpc/routers/trips.ts:530` |
| Langfuse security events    | `src/app/api/auth/send-otp/route.ts`   |
| Sentry errors               | `sentry.*.config.ts` files             |
