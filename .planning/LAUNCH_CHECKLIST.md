# Yaarlore Launch Checklist

## Technical — must be done before any press or paid traffic

### Infrastructure

- [ ] `supabase db push` — all migrations applied (verify with `supabase migration list`)
- [ ] Migration `2026051908_yearly_wraps_columns.sql` applied
- [ ] All env vars set on Render: `AI_WORKER_HMAC_SECRET`, `NEXTJS_BASE_URL`, `VOYAGE_API_KEY`
- [ ] All env vars set on Vercel: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] Render Starter tier ($7/month) — eliminates 30–60s cold starts
- [ ] Verify `AI_WORKER_HMAC_SECRET` is identical on Render and Vercel (HMAC must match)
- [ ] Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` for web push
- [ ] Set `NEXTJS_BASE_URL` on Render so worker can send lore-ready emails

### End-to-end testing (run manually before launch)

- [ ] Sign up with a real email → OTP arrives via Resend → verify
- [ ] Create a trip → upload 5+ photos → trigger lore generation
- [ ] Verify lore generation completes (watch Langfuse trace for errors)
- [ ] Verify lore-ready email arrives after generation
- [ ] Open the generated story → slides render correctly
- [ ] Share the story URL → `/t/[code]/story` loads without auth
- [ ] Test the demo at `/demo` — loads without auth in incognito
- [ ] Test payment flow: create order → Razorpay test mode → webhook fires → tier upgrades
- [ ] Test trip battle: create battle → verify AI verdict appears
- [ ] Generate Yearly Wrap → verify card endpoint returns image

### Observability

- [ ] Sentry error alerts configured (email on first occurrence of new error)
- [ ] PostHog funnels set up: landing → demo → signup → lore → share
- [ ] Langfuse traces visible for each pipeline run
- [ ] Render logs accessible (not just health check)

### Security (verify live)

- [ ] Check response headers include `Content-Security-Policy` with nonce (curl -I yaarlore.com)
- [ ] Check `Strict-Transport-Security` header is present
- [ ] Verify `/api/notify/lore-ready` returns 401 without correct bearer token
- [ ] Verify `/generate-lore` on the AI worker returns 401 without HMAC headers

---

## Content — needed before press coverage

- [ ] Record a 60-second product demo video (screen recording with narration)
  - Show: landing → demo mode → "this is what your trip could look like" → signup
  - Keep it under 60 seconds. Nobody watches longer.
- [ ] Write 3 sample lore stories to use as social proof (or generate real ones from beta users)
- [ ] Take screenshots of the best character cards and chaos scores for social media
- [ ] Write Product Hunt launch description (200 words, lead with the demo link)
- [ ] Set up Twitter/X account for Yaarlore if not done (@yaarlore)

---

## Distribution — execute in this order

### Week 1: Soft launch

- [ ] Post demo link on personal Twitter/LinkedIn
- [ ] Post in r/bangalore: "Built an AI that psychoanalyzes your friend group from trip photos"
- [ ] Post in r/india: same framing
- [ ] Post in relevant Discord servers (Indian travel, desi student servers)
- [ ] DM 15 influencers using INFLUENCER_OUTREACH.md template

### Week 2: Beta users

- [ ] Get 10 beta users to generate real lore (not your own trips)
- [ ] Screenshot the best outputs (with permission)
- [ ] Collect 3 honest testimonials

### Week 3: Press

- [ ] Pitch YourStory: "Indian startup builds AI that turns trip photos into friend group documentaries"
- [ ] Pitch The Ken: framing around AI memory and Indian Gen Z travel
- [ ] Pitch Scroll: human interest angle ("the app that named my friend 'The One Who Caused the Car Sound'")

### Week 4: Product Hunt launch

- [ ] Schedule for Tuesday/Wednesday 12:01 AM PST
- [ ] Line up 20 upvoters in advance (beta users, friends, community)
- [ ] Post the 60-second video as the main media
- [ ] First comment: "Here's what the AI said about our Goa trip" + screenshot

---

## Success metrics (first 30 days)

| Metric             | Target |
| ------------------ | ------ |
| Demo visits        | 1,000  |
| Signups            | 200    |
| Lore generations   | 50     |
| Paying subscribers | 10     |
| Viral story shares | 5      |
| MRR                | ₹990   |

These are conservative. If one influencer post hits, all numbers 10× in a week.

---

## Red flags that mean "don't launch yet"

- Render is on free tier (cold starts will kill the first impression)
- Any TypeScript errors in `npm run type-check`
- Sentry is not configured (you won't know about crashes)
- The lore generation pipeline hasn't been tested with real photos from a real trip
- Payment webhook hasn't been tested end-to-end in Razorpay test mode
