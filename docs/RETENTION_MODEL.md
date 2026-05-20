# Retention Model — Yaarlore

## Core Retention Hypothesis

Yaarlore's retention strategy is fundamentally different from most travel apps: it does not compete on frequency of use. Instead, it bets on **emotional depth per interaction** and **compounding mythology** across trips.

The model: a user might use Yaarlore 2–4 times per year (once per group trip), but each interaction is so emotionally resonant that it creates lasting memory and social bonds that bring the user back for the next trip.

---

## The Primary Hook: Delayed Gratification Loop

```
Upload photos → Wait for AI generation → Receive cinematic documentary
```

This delay is not a bug — it's the core product mechanic. The wait creates anticipation. The reveal creates a dopamine spike. If the lore is good (specific, chaotic, roasty), the immediate reaction is "I need to share this with the group."

**Key insight from the design:** The generating page shows per-step pipeline progress ("Watching the journey...", "Writing the mythology..."). This is not just UX — it primes users to understand something significant is being created, not just processed.

**Measurement signals in the codebase:**

- `photo_views.view_duration_ms` — which photos are emotionally significant (high dwell = high resonance)
- `lore_reactions` — which lore outputs generate emoji reactions (sentiment signal)
- `lore_eval_json.overall` + `lore_needs_review` flag — internal quality gate for lore that doesn't land

---

## The Sharing / Viral Loop

```
Lore ready → Creator sees it → Shares /t/[code]/story via WhatsApp → Friends react → Some join → Create their own trip
```

**Implemented viral surfaces:**

1. Public story URL `/t/[code]/story` — no login required to view
2. OG card generation at `/api/card/story/[tripId]` — rich preview when link shared
3. Anniversary email at 1 year: "One year ago, you were Historically Cooked 🔥" + story link + WhatsApp button
4. First-week follow-up email at 7 days: "Your trip is still live — have you shared it yet?" + WhatsApp button
5. Battle challenges: sharing a battle link brings opponents' crew to the platform

**WhatsApp-first design:** Anniversary and first-week emails include a direct `wa.me/?text=` WhatsApp pre-fill button. This is India-first UX — WhatsApp is the primary content sharing channel.

---

## Battle System as Re-engagement

The battle system (`trip_vs_trip`) is the second-strongest retention mechanism. It creates:

1. **Return reason:** "Your battle ends in 48 hours — see if you're winning"
2. **Group notification:** When a battle starts, ALL members of BOTH trips see `battle_started` in the Group Pulse feed
3. **Social pressure:** Your trip's honor is at stake against another friend group
4. **Voting as engagement:** Members return to cast votes over the 48-hour window

**Rate limit design:** Max 3 battles per user per 24 hours. This creates scarcity and prevents the mechanism from becoming noise.

---

## Dispute System as Retention Machine

The dispute system (file a dispute against the AI's assessment of your character) is described in comments as "the single strongest retention loop."

Why it works:

1. **Immediate motivation:** "The AI called me 'The Chaos Goblin' — I need to correct this"
2. **Social pressure:** Your friends receive a Group Pulse notification that you filed a dispute
3. **Voting creates re-engagement:** Members return to vote over the dispute window
4. **Mythology compounds:** Disputes become part of the recorded incident history
5. **WhatsApp content:** "Wait, Rahul is disputing his chaos rating" — this is natural WhatsApp fodder

Dispute types: `character_role`, `chaos_rating`, `verdict`, `superlative`

**Current implementation status:** Fully built in `trips.ts:disputeCharacterRole` + `voteOnDispute`. `DisputeSystem.tsx` component exists.

---

## Cross-Trip Compounding (The Mythology System)

This is the platform's long-term moat. After each trip's lore is generated, the system extracts and stores:

1. **Identity snapshots** (`user_identity_snapshots`) — per-trip behavioral record for each member. After 5 trips, you have a longitudinal character arc.

2. **Trip incidents** (`trip_incidents`) — discrete incidents extracted by Haiku with callback potential ratings. High-callback incidents are referenced in future trip lore ("Just like the incident in Goa...").

3. **Recurring references** (`recurring_references`) — phrases that became part of the group's vocabulary. Injected into future lore prompts with activation conditions.

4. **Group Lore OS** (`group_lore_os`) — a living mythology document for each friend group. Updated after every trip. Grows more specific and more valuable with each generation.

5. **Relationship dynamics** (`relationship_dynamics`) — pairwise chaos delta and archetype similarity. After 5 years, this is documented behavioral history of specific friendships.

**Callback context injection** (`_get_callback_context` in orchestrator): For returning groups (≥2/3 members overlap), past incidents and recurring references are injected into the lore generation prompt. This creates continuity — the AI "remembers" the group's history and can reference it.

---

## Notification Patterns

**Implemented:**

- Push notifications via Web Push API (`push_subscriptions` table, `notify/lore-ready` trigger)
- Anniversary email (1 year)
- First-week follow-up email (7 days post-lore)
- Group Pulse events (in-feed, not push)

**Not implemented / broken:**

- Battle notification cron (`/api/cron/battle-notifications`) — route exists but never triggers (vercel.json empty)
- Nostalgia drops cron (`/api/cron/nostalgia-drops`) — same
- "On This Day" cron (`/api/cron/on-this-day`) — same
- Push fatigue limit: anniversary cron has a 7-day fatigue window (max 1 email per user per 7 days). Same pattern should apply to push notifications but is not confirmed implemented.

---

## Current Retention Weak Points

1. **No return visit reason for non-creators.** Members of a trip (who didn't create it) have no reason to return until the creator generates lore. The dispute system and battle system both require lore to exist first.

2. **Nostalgia feed requires historical data.** The "On This Day" nostalgia feed requires photos from trips taken in prior years. New users have no nostalgia feed. This is inherent to the model but limits early retention.

3. **Annual cadence.** The primary trigger for returning is a group trip, which happens 1–4 times per year for most users. There is no daily or weekly engagement hook other than battles and disputes.

4. **Emails never send.** Anniversary and first-week emails are the primary re-engagement mechanism for solo-session users (those who generate lore but don't return). These are broken due to empty `vercel.json`.

5. **Group dependency.** If the trip creator churns, the whole group stops using the product for that trip. There is no way for other members to trigger lore generation.

---

## What Would Improve Retention

**Short term (no architectural change):**

- Fix cron jobs (add vercel.json config) → anniversary + first-week emails start firing
- Battle notification email when a battle ends → return trigger
- Push notification for dispute votes → immediate social pressure hook

**Medium term:**

- "Who Changed?" engine — comparing a user's archetype across trips (character arc visualization). Built in data model (`user_identity_snapshots`, `user_archetypes`), not yet surfaced in UI.
- Pre-trip prophecy — before a trip starts, AI predicts how each member will behave based on their history. Creates anticipation before photos are uploaded.
- Monthly "mythology digest" email — summary of the group's recorded incidents and character evolution.

**Long term:**

- Notification for new callback references in someone else's trip ("You were mentioned in Priya's Goa trip")
- "Legendary trip of the month" — community recognition for highest-chaos trips
