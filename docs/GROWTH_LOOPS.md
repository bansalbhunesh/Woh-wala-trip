# Growth Loops — Yaarlore

## Primary Viral Mechanism: The Shared Story

```
Trip creator generates lore
  → shares /t/[code]/story via WhatsApp
  → friends who weren't on the trip see it
  → some join as members of the trip
  → others create their own trip
```

**Why this works in India:**

- WhatsApp is the social graph. The `wa.me/?text=` pre-fill removes all friction from sharing.
- The OG card (chaos score + verdict + tagline) is inherently shockworthy. A card reading "84 / HISTORICALLY COOKED — Five people, three states, one regrettable decision" generates instant curiosity.
- Indian friend groups discuss their trips relentlessly. This gives them content to discuss.

**Implemented sharing surfaces:**

- `/t/[code]/story` — public URL, no login required to view
- OG card at `/api/card/story/[tripId]` — renders via Satori edge function
- OG card with QR code via `src/lib/og/qr.ts`
- `/trips/[tripId]/share` page with WhatsApp pre-fill
- First-week follow-up email (7 days post-lore): "Share this on WhatsApp" primary CTA

---

## Battle Challenge as Invite Mechanism

```
User challenges another trip
  → battle notification sent to ALL members of BOTH trips (Group Pulse)
  → members of opponent trip visit to vote
  → some of those opponents are new to Yaarlore
  → they see their trip's lore being compared → want their own
```

**Rate limit as scarcity signal:** Max 3 battles per user per 24 hours creates urgency ("I need to use my challenges wisely").

**Viral coefficient estimate:** Each battle exposes the product to the opponent trip's entire member list. A trip with 6 members challenging another 6-member trip = 6 new potential exposures per battle.

---

## Referral System

**Implementation:** `trips.ts:applyReferral`, `trips.ts:getReferralStatus`, `trips.ts:create` (referral counter)

```
User A shares ?ref=USERNAME link
  → New user B signs up
  → B creates their first trip
  → A's referral_count increments
  → At 3 referrals: A gets referral_bonus_unlocked = true
  → A's next generation is free (bonus consumed on trigger)
```

**Referral link:** Landing page URL with `?ref=USERNAME` query param. Applied via `trips.applyReferral` after first auth.

**Anti-gaming:**

- Self-referral blocked (referrerId === joinerId check)
- Only counts once per referred user (`referral_counted` flag)
- Bonus consumed after one generation (not persistent)
- Idempotent: `invited_by_user_id` set only once (first join wins)

**Current state:** Fully implemented in backend. UI for sharing the referral link is in `trips.ts:getReferralStatus` query + presumably in a share/invite UI component.

---

## OG Card Generation for Social Sharing

**Routes:**

- `/api/card/[tripId]` — Standard trip card (chaos score + tagline + invite code + QR)
- `/api/card/story/[tripId]` — Story-specific card
- `/api/card/battle/[battleId]` — Battle card (trip A vs trip B stats)
- `/api/card/archetype/[tripId]/[userId]` — Individual character archetype card
- `/api/card/wrap/[userId]/[year]` — Yearly wrap card

**Technical stack:** Satori (JSX → SVG → PNG) at Vercel Edge runtime. Custom font loading (`src/lib/og/fonts.ts`). QR code generation (`src/lib/og/qr.ts`).

**Archetype card as individual sharing unit:** Each member can share their own character card ("The Chaos Goblin — 9/10 chaos rating"). This is a highly personal, individually shareable unit that spreads awareness even among non-trip-members.

---

## India-First Market Considerations

1. **WhatsApp-first, not Twitter/Instagram.** All sharing surfaces are designed around WhatsApp forwarding. OG cards are optimized for WhatsApp preview size (16:9 or square).

2. **Razorpay, not Stripe.** Indian users do not want to enter international card details. Razorpay supports UPI, netbanking, wallets, and EMI — the actual payment methods used by the target demographic.

3. **Hinglish tone.** The lore generation system has a `hinglish_intensity` parameter (from signal aggregation) that controls how much Hinglish the AI uses in generated narratives. Error messages and UI copy also use Gen Z Indian slang ("Yaar this code is literally not working").

4. **Group travel cultural pattern.** The 4–8 person group trip (college friends, work friends, cousins) is the dominant form of Indian millennial travel. The 6-member free tier cap is calibrated to this group size.

5. **Price point.** ₹399 one-time (≈ $4.80) for a digital upgrade. ₹99/month subscription. These are designed for Indian purchasing power — not global SaaS pricing.

---

## Current Growth Bottlenecks

1. **No app store presence.** Web-only. Organic discovery via app stores is impossible. All growth must come via social sharing or direct marketing.

2. **Emails never send.** Anniversary and first-week emails are the primary owned-channel re-engagement mechanism. Both are broken (cron not configured). This means organic referral-via-email is zero.

3. **No referral UI prominence.** The referral system is fully built in the backend, but there's no dedicated "Invite Friends" screen or referral dashboard surfaced prominently in the UX. Users need to know about it to use it.

4. **Lore quality variance.** With <8 photos, the AI enters "low confidence" mode and produces softer, less specific lore. If early adopters upload 5–7 photos and get generic output, they won't share it. Low viral coefficient from low-photo trips.

5. **Battles require two trips.** The battle mechanic is the strongest re-engagement loop, but it requires both trips to have lore. New users with one trip can only battle other users who also have existing lore. The chicken-and-egg problem limits early battle activity.

6. **CLIP embeddings not yet populated at scale.** Similar trips discovery and nostalgia feed both require CLIP embeddings. If `VOYAGE_API_KEY` is not set, or if the embed_photo background jobs are backlogged, these discovery surfaces are empty for most users.

---

## Missing Growth Infrastructure

1. **Leaderboard.** `/leaderboard` route exists but implementation is unconfirmed. A public chaos leaderboard ("Top 10 most cooked trips this month") is a natural content marketing surface.

2. **Community / discovery.** No way to discover interesting public trips except via the landing page showcase (top-chaos trips only). A "browse by destination" or "trending" surface would create organic discovery.

3. **SEO.** Public story pages (`/t/[code]/story`) are potentially indexable, but there's no explicit SEO metadata strategy visible in the code for these pages. Each public story is a long-tail SEO opportunity ("Goa trip documentary AI chaos score 94").

4. **Webhook-triggered email beyond anniversaries.** No email triggered when someone views your public story, when a battle challenge is issued to you, or when your dispute is resolved. These are high-intent engagement moments with no notification.

5. **Print product.** The print tier (₹799) is a potential high-LTV product and a physical artifact that sits in people's homes. Currently a waitlist only. Actual print fulfillment would create a tangible word-of-mouth surface.
