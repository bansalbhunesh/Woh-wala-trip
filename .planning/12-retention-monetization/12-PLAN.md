# Phase 12: Retention & Monetization — Plan

**Goal:** Push Retention from 4/10 and Monetization from 4/10 to 10/10.
**Requirements:** 30-day retention loop, subscription model, freemium funnel

---

## Plan 1: 30-Day Retention Loops

### Task 1: Monthly Nostalgia Drop Cron

Create `src/app/api/cron/nostalgia-drops/route.ts`

Runs monthly (1st of each month). For each user with at least one completed trip:

- Find their oldest trip that was generated 1-6 months ago
- Send a "Remember when..." email via Resend
- Include a cinematic snippet from their lore_json tagline + chaos score
- Deep link back to the story

Vercel.json cron: `0 9 1 * *` (1st of month, 9am UTC)

### Task 2: Battle Challenge Notification Email

When `battles.challenge` inserts a background_jobs row for `judge_battle`:

- Also insert a `scheduled_emails` row of type `battle_challenge` for the opposing trip's creator
- The anniversaries cron (or a new battles cron) picks it up and sends:
  "⚔️ Your trip was just challenged! [Challenger Trip] thinks they're more cooked than you."

### Task 3: 7-Day Re-engagement Hook

After a user's first lore generation, schedule a `scheduled_emails` row for 7 days later:

- Type: `first_week_followup`
- Content: "Your trip is still live. Have you shared it yet? Here's your invite link."
- Triggered by the existing `on_lore_ready_schedule_anniversary` trigger (add a 7-day entry alongside the 1-year entry)

---

## Plan 2: Freemium & Subscription Model

### Task 4: Freemium Model — First Trip Always Free

In `trips.ts` `generateLore`:

- Count the user's total trips with `lore_status = 'ready'`
- If count === 0 (first generation ever): skip the monthly token cap check
- Show "Your first trip is free!" in the generating page

### Task 5: Subscription Pricing UI

Update `src/app/api/payments/create-order/route.ts` to support two products:

- `SINGLE_TRIP` — ₹399 one-time per trip
- `SUBSCRIPTION` — ₹99/month, unlimited trips (6-month and annual options)

Update the payment UI to show both options clearly with the subscription framed as better value:

- "₹399 per trip — or subscribe at ₹99/month for unlimited trips (₹17/person for 6 friends)"

### Task 6: Trip Archive Export

Add `trips.exportArchive` tRPC procedure:

- Returns a ZIP of the trip's lore_json, all photo signed URLs, OG card PNG
- This creates a "you own your memories" value prop that justifies subscription
- Use Next.js streaming response for the ZIP

---

## Plan 3: Scalability — getChaosDistribution Materialized View

### Task 7: Postgres Materialized View for Chaos Distribution

Create migration `20260519_chaos_distribution_view.sql`:

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS public.chaos_distribution AS
SELECT chaos_score
FROM public.trips
WHERE lore_status = 'ready'
AND chaos_score IS NOT NULL;

CREATE UNIQUE INDEX ON public.chaos_distribution (chaos_score, ctid);

-- Function to refresh (called by cron or after each lore completion)
CREATE OR REPLACE FUNCTION refresh_chaos_distribution()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.chaos_distribution;
END;
$$;
```

Update `getChaosDistribution` in `trips.ts` to query `chaos_distribution` view instead of `trips` table directly.

Add a Vercel cron `0 * * * *` (hourly) at `/api/cron/refresh-chaos` that calls the Supabase RPC.

---

## Success Criteria

1. Users receive a nostalgia email 30 days after first lore generation (not just 1 year)
2. Battle challenges generate notification emails to the challenged trip creator
3. First trip is always free — the monthly token cap only kicks in after the first generation
4. Subscription pricing option is visible on the payment screen
5. getChaosDistribution queries the materialized view, not a full table scan
