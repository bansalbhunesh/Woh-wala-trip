# Yaarlore Production Deployment Runbook

## Pre-Deploy Checklist

- [ ] `supabase db push` applied to production
- [ ] `supabase gen types typescript --project-id lngtsccftumhbycywerg > src/lib/database.types.ts` regenerated
- [ ] All env vars set (see `.env.local.example`)
- [ ] `npm run type-check` passes
- [ ] `npm run test -- --run` passes
- [ ] Render AI worker is running (`/health` returns 200)

## Environment Variables Required

| Var                           | Service         | Required                  |
| ----------------------------- | --------------- | ------------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | Vercel          | yes                       |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Vercel          | yes                       |
| SUPABASE_SERVICE_ROLE_KEY     | Vercel          | yes                       |
| AI_WORKER_URL                 | Vercel          | yes                       |
| AI_WORKER_SECRET              | Vercel + Render | yes                       |
| AI_WORKER_HMAC_SECRET         | Vercel + Render | yes (same value on both)  |
| UPSTASH_REDIS_REST_URL        | Vercel          | yes (production required) |
| UPSTASH_REDIS_REST_TOKEN      | Vercel          | yes                       |
| RAZORPAY_KEY_ID               | Vercel          | yes                       |
| RAZORPAY_KEY_SECRET           | Vercel          | yes                       |
| RAZORPAY_WEBHOOK_SECRET       | Vercel          | yes                       |
| RESEND_API_KEY                | Vercel          | yes                       |
| CRON_SECRET                   | Vercel          | yes                       |
| ANTHROPIC_API_KEY             | Render          | yes                       |
| FAL_KEY                       | Render          | yes                       |
| LORE_EVAL_SAMPLE_RATE         | Render          | 0.2 for prod              |
| MONTHLY_TOKEN_CAP_PER_USER    | Vercel          | 500000 default            |

## HMAC Rollout Sequence (for new deploys)

1. Deploy Render worker (secret absent — graceful skip)
2. Set `AI_WORKER_HMAC_SECRET` on Render
3. Set `AI_WORKER_HMAC_SECRET` on Vercel (SAME VALUE as Render)
4. Deploy Vercel

Both sides must share the identical secret value. A mismatch causes all lore generation
requests to fail with 401.

## Render Free Tier Limitations

The AI worker on Render free tier spins down after 15 minutes of inactivity.

**Upgrade to Render Starter ($7/mo) before launch to eliminate cold-start issues.**

With paid tier:

- No spindown
- Persistent in-memory state (warmup cache valid)
- Better CPU for concurrent vision batches

The `warmupWorker` tRPC mutation (called client-side when a trip reaches 5 photos) helps
pre-warm the dyno, but it is not a substitute for an always-on instance at launch scale.

## Database Migrations

```bash
supabase link --project-ref lngtsccftumhbycywerg
supabase db push
```

Migrations live in `supabase/migrations/`. Each file is idempotent — re-running is safe.

## Vercel Cron Jobs

Declared in `vercel.json`. Vercel requires each declared path to return 200 on GET or the
deployment is considered unhealthy.

| Cron                             | Schedule       | Purpose                          |
| -------------------------------- | -------------- | -------------------------------- |
| `/api/cron/anniversaries`        | `0 6 * * *`    | On-this-day nostalgia emails     |
| `/api/cron/stuck-jobs`           | `*/15 * * * *` | Noop (consolidated to worker)    |
| `/api/cron/nostalgia-drops`      | `0 10 1 * *`   | Monthly nostalgia email drop     |
| `/api/cron/battle-notifications` | `*/5 * * * *`  | Battle activity notifications    |
| `/api/cron/refresh-chaos`        | `0 * * * *`    | Refresh chaos distribution cache |

All crons require `Authorization: Bearer $CRON_SECRET` header (set automatically by Vercel).

## Post-Deploy Verification

1. `GET /api/health` returns `{"status":"ok"}` with all checks green
2. OTP login works end-to-end (send OTP, verify, session cookie set)
3. Upload 5 photos to a test trip, trigger generation, confirm lore appears
4. Verify Razorpay webhook at `dashboard.razorpay.com` > Webhooks > test event
5. Check Langfuse dashboard for pipeline traces from the test generation

## Rollback Procedure

Vercel maintains instant rollback to the previous deployment via the dashboard:
`vercel.com/[org]/[project] > Deployments > select previous > Promote to Production`

Render rollback: `render.com > [service] > Events > select previous deploy > Rollback`

Database migrations are forward-only. If a migration must be reversed, write a new
migration that undoes the change rather than rolling back the migration file.
