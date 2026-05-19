# Yaarlore — YC Application Draft

## What does Yaarlore do? (one sentence)

Yaarlore turns your trip photos into a cinematic AI documentary of your friend group — character roles, chaos scores, roasty narrative arcs, and shareable story cards — in 3 minutes.

---

## Why now?

Three trends converge in 2025–26:

1. **India's Gen Z travel boom.** ₹2.4T travel spend, 40M+ domestic trips annually, and a generation that documents everything but archives nothing. Instagram has the photos. Nobody has the story.

2. **The Spotify Wrapped cultural moment.** Users have been trained to share AI-generated summaries of their behavior. Wrapped gets 700M shares in 48 hours. Yaarlore is Wrapped for your friend group trips.

3. **Claude Vision at production scale.** Multimodal AI that can analyze 80 photos, extract behavioral signals, assign character archetypes, and generate culturally-specific Hinglish narrative — this wasn't viable 18 months ago. It is now.

The cultural raw material (WhatsApp groups, "yaar you won't believe what happened in Goa") meets the technical moment. The window is open.

---

## Who uses it?

**Primary persona:** Riya, 24, works in Bangalore, just got back from a 5-day Himachal trip with her college friends. She has 340 photos in a shared Google Drive that nobody looks at, a WhatsApp thread with 1,200 messages, and zero record of what actually happened.

She opens Yaarlore, uploads photos, and gets back: a cinematic lore document naming her as "The Strategic Dissociator" and her friend as "The Chaos Agent," a chaos score of 87/100 with the verdict "Historically Cooked," a shareable story card that her entire group will scream at in the group chat.

She didn't ask for "AI-generated content." She asked for the thing that explains what just happened.

---

## Business model

- **Free:** First lore generation forever free. Hook.
- **₹99/month:** Unlimited generations for the whole friend group. Core product.
- **₹799/year:** Save 33%. Converts power users.
- **One-time ₹399:** Digital archive for a single trip. For occasional users who don't want a subscription.

Unit economics (₹99/month tier):

- CAC target: ₹200 (₹400 for paid, organic referral halves it)
- LTV: ₹99 × 12 months average = ₹1,188 (6× CAC)
- Marginal AI cost per generation: ~₹40 (60k tokens at Claude Sonnet pricing)
- Gross margin at scale: ~60%

---

## What's the moat?

**Short-term (today):** The prompt design. The `LORE_GENERATION_SYSTEM` prompt is 2,000 words of cultural specificity — Hinglish-native, tuned to Indian friend group archetypes, with 30+ forbidden phrases to prevent generic output. It took 3 months to get right. It produces output that Indian Gen Z recognizes as their own. Competitors can't buy this — they'd have to build it.

**Medium-term (6 months):** The photo embedding corpus. Every trip generates CLIP embeddings stored in pgvector. As the corpus grows, "similar trips" discovery gets better. 10,000 trips = a recommendation engine trained on Indian friend group travel.

**Long-term (2+ years):** The lore history. Users who've been on Yaarlore for 3 years have a documented record of their friendship evolution. That's not portable to a competitor. The WhatsApp group has churn. Yaarlore has permanence.

---

## What's the traction?

**Honest answer:** Pre-revenue, early access stage.

What's real:

- Working product, end-to-end in production
- Public demo at yaarlore.com/demo (no signup required)
- Full payment infrastructure live (Razorpay, subscription + one-time)
- 8-step AI pipeline with quality evaluation, retry logic, prompt injection defense
- HMAC-signed worker authentication, nonce-based CSP, atomic DB claims
- CI/CD, Sentry observability, PostHog analytics

What we need from YC: distribution access and the network to reach the first 1,000 users who will generate the social proof.

---

## Founder story

[TODO: Fill in your personal story — why you built this, what trip or moment made you realize the problem was real, what unique insight you have about Indian Gen Z behavior that outsiders miss]

---

## Market size

- India domestic travel: ₹2.4T annually, growing 15% YoY
- Indian internet users 18–34: 250M
- Addressable (traveled with friends in last 12 months): ~40M
- Paying segment (willing to pay ₹99/month for digital memory products): ~4M (10% conversion assumption)
- TAM at ₹99/month × 4M users: ₹4.8B ARR
- Realistic 3-year target: 100,000 paying users × ₹99/month = ₹1.19B ARR

---

## What makes this different from Google Photos / Instagram?

Google Photos stores. Instagram performs. Yaarlore interprets.

Users don't open Google Photos to understand their trip. They open it to find a specific photo. Yaarlore is the answer to "what actually happened on that Goa trip" — a question Google Photos cannot answer.

Instagram is for broadcasting. Yaarlore is for the 6 people who were actually there.

---

## What should be different vs. generic photo apps?

The unit of value is the **friend group**, not the individual photo. Yaarlore's "chaos score" is a group metric. The "character roles" are relational. The "trip battles" are competitive. None of this works with a single user — you need the WhatsApp group. That network effect is the defensibility.

---

## 6-month plan

**Month 1:** 100 users via influencer outreach (15 travel creators, free lifetime access)
**Month 2:** First viral lore story shares → organic signups → hit 500 users
**Month 3:** First 50 paying subscribers (₹99/month) → ₹4,950 MRR
**Month 4:** Launch Yearly Wrap feature → press coverage → 1,000 users
**Month 5:** Trip Battles leaderboard public → viral loop → 2,000 users
**Month 6:** ₹1L MRR milestone → raise seed round

---

## What elite startups would say is missing right now

1. Traction. Need real users, real viral stories, real payment data.
2. Team. Solo founder is a risk — need at minimum a second person.
3. Distribution. The product is ready; the marketing is not.

YC solves #1 via Demo Day pressure, #3 via network. #2 is on the founder.
