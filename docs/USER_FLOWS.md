# User Flows — Yaarlore

## Onboarding Flow (Signup → First Trip)

```
1. User arrives at landing page (/)
   - Sees cinematic hero + top-chaos trips from getPublicShowcase
   - Optional: URL has ?ref=USERNAME → referral code stored in session

2. User clicks "Get Started" → /login
   - Sees CinematicAuth component with OTP input

3. User enters email
   - POST /api/auth/send-otp
   - Anti-spam: IP rate limit (10 req/min) + fraud score check
   - IF disposable/role account → blocked with message
   - IF OK → Supabase admin generates magic link → extracts OTP
   - Stores hashed OTP in otp_codes table (10-min expiry)
   - Sends via Resend email: "YOUR ACCESS CODE: XXXXXX"
   - Returns: {success: true}

4. User enters OTP code
   - POST /api/auth/verify-otp
   - Validates OTP hash against otp_codes table
   - Calls Supabase verifyOtp() → sets session cookie
   - IF referral param exists → tRPC trips.applyReferral (sets invited_by_user_id)
   - Redirects to /trips

5. On /trips (first visit, no trips yet)
   - Prompt: "Create your first trip"

6. User creates trip → /trips/new
   - Form: name, destination, start/end dates
   - tRPC trips.create
   - Auto-joins creator as first member
   - Referral counter fires if this is creator's first trip
   - Redirects to /trips/[tripId]

7. Creator shares invite code
   - Visit /trips/[tripId]/invite
   - Invite code + QR code + WhatsApp share link
   - Friends join at /trips/join?code=XXXXXXXX
```

**Error states:**

- Disposable email: "Disposable email addresses are not allowed"
- Too many OTP requests: "Too many requests. Try again in 15 minutes."
- Invalid OTP: Error from Supabase
- Trip create fails: DB error surfaced as "Could not create season"

---

## Trip Creation Flow

```
1. /trips/new page
2. User fills: Trip Name (2-80 chars), Destination (optional), Start Date, End Date
3. tRPC trips.create mutation
4. IF OK:
   - Trip row inserted (tier: 'free', creator_id: userId)
   - Creator auto-inserted as trip_member
   - Referral mechanic checked + applied if eligible
5. Redirect to /trips/[tripId]
6. User sees trip detail page with upload prompt
```

---

## Photo Upload Flow

```
1. User on /trips/[tripId] page
2. Clicks upload / selects photos
3. For each photo:
   a. tRPC photos.getUploadUrl
      - Validates membership
      - Checks tier limits (50 photos or 500MB for free tier)
      - Creates signed upload URL (Supabase Storage service client)
      - Returns {uploadUrl, storagePath, token}

   b. Browser PUTs photo directly to Supabase Storage signed URL
      (bypasses Next.js — direct to storage)

   c. tRPC photos.confirmUpload
      - Validates storagePath prefix (security: must match tripId/userId)
      - Checks membership again
      - Idempotency: returns existing photoId if path already exists
      - Queries storage.objects for actual file size (server-authoritative)
      - Per-photo 50MB cap enforced (removes from storage if exceeded)
      - Inserts photos row
      - Fire-and-forget: POST /generate-thumbnail to worker
      - Queues: background_jobs embed_photo for CLIP embedding
      - Returns {photoId}

4. When photo count reaches 5, UI unlocks "Generate Lore" button
5. tRPC trips.warmupWorker called at 5 photos (warms Render dyno)
```

**Error states:**

- Not a member: "Not a member of this trip" (403)
- Free tier photo limit: "Free tier limit: 50 photos. Upgrade to add unlimited photos."
- Free tier storage limit: "Free tier storage limit reached (500 MB). Upgrade to continue uploading."
- Per-photo size limit: "File exceeds the 50 MB per-photo limit."
- Storage path mismatch: "Invalid storage path — must match the expected trip/user prefix."

---

## Lore Generation Flow

```
1. Creator clicks "Generate Lore" on trip page
2. tRPC trips.generateLore
   a. Verify creator_id === userId
   b. Count photos via service client (≥5 required)
   c. Check if first generation (always free if so)
   d. Check referral bonus (bypasses monthly cap if active)
   e. Check monthly token cap (default 500k tokens)
   f. Atomic DB claim: call_lore_generation RPC
      - Returns: 'claimed' | 'already_processing' | 'forbidden'
   g. Langfuse span opened
   h. HTTP POST /generate-lore (HMAC signed, 8s timeout)
      - IF OK → return {status: 'processing'}
      - IF fails → INSERT generation_jobs → return {status: 'queued'}
   i. Consume referral bonus if active

3. User redirected to /trips/[tripId]/generating page
   - Supabase Realtime subscription on trips table for this tripId
   - Shows step-by-step progress from lore_pipeline_state:
     - "Loading your memories..." (fetch)
     - "Watching the journey..." (vision)
     - "Reading between the lines..." (aggregate)
     - "Writing the mythology..." (lore)
     - "Assigning character roles..." (enrichment)
     - "Archiving everything..." (persist)
   - 4-minute client-side timeout → calls resetStuckLore mutation

4. AI Worker runs 8-step pipeline (see AI_PIPELINES.md)
   - Updates lore_pipeline_state per step (watched by Realtime)
   - On completion: lore_status = 'ready'

5. Supabase Realtime detects lore_status = 'ready'
   - Client redirected to /trips/[tripId]/story
```

**Error states:**

- <5 photos: "Need at least 5 photos to generate lore"
- Already processing: "You already have a trip generating lore"
- Monthly cap: "Monthly generation limit reached (X / Y tokens). Resets next month."
- Worker unavailable: returns {status: 'queued'} — user stays on generating page
- Pipeline failure: lore_status = 'failed' → FailedState component shown
- 4-min client timeout: calls resetStuckLore, shows "Retry" button

---

## Story Sharing Flow (Public /t/[code]/story)

```
1. Creator on /trips/[tripId]/story
2. Sees "Make Public" toggle (setStoryVisible mutation)
3. Shares URL: /t/[invite_code]/story
4. OR: Shares OG card via WhatsApp (from /trips/[tripId]/share)

Public story page:
1. Anyone visits /t/[code]/story
2. No auth required
3. Server fetches trip by invite_code
4. IF story_visible = false → shows locked/teaser view
5. IF story_visible = true → full documentary player
6. Emoji reactions available (anonymous with IP hashing)
7. WhatsApp share button pre-fills story URL
```

---

## Battle Flow

```
1. User visits trip story page → finds "Challenge" button
2. User selects an opponent trip (both must have lore_status = 'ready')
3. tRPC battles.challenge
   a. Verify ownership of myTripId
   b. Check myTrip has lore_status = 'ready'
   c. Rate limit: max 3 battles per user per 24h (counts battles by any owned trip)
   d. Check opponentTrip has lore_status = 'ready'
   e. INSERT trip_vs_trip {status: 'pending', voting_ends_at: now + 48h}
   f. INSERT background_jobs {job_type: 'judge_battle', payload: {battle_id}}
   g. INSERT group_pulse_events {event_type: 'battle_started'} for all members of both trips

4. Worker picks up judge_battle job
   → LoreOrchestrator.judge_battle(battle_id)
   → Claude Sonnet reviews both lore JSONs
   → Updates trip_vs_trip with winner + verdict

5. Members of both trips visit /battles/[battleId]
   → See side-by-side lore comparison
   → Cast vote via battles.vote (server-authoritative dedup, no fingerprint needed)
   → Live vote counts shown

6. After 48h: voting closes; final verdict displayed
```

**Error states:**

- My trip has no lore: "Generate lore for your trip first before challenging"
- Opponent has no lore: "Opponent trip must have lore generated"
- Rate limit: "Max 3 battle challenges per day. Try again tomorrow."

---

## Payment / Upgrade Flow

```
1. User hits photo limit or clicks "Upgrade" → /trips/[tripId]/upgrade
2. Sees tier options:
   - Digital (₹399): unlimited photos, unlimited members
   - Print (₹799): physical print pack (waitlist)
   - Monthly (₹99/mo): subscription
   - Annual (₹799/yr): subscription (33% saving)

3. User clicks tier → POST /api/payments/create-order
   a. Verifies membership
   b. Creates Razorpay order (idempotent receipt: trip_{id}_{tier})
   c. Returns {orderId, amount, currency}

4. Razorpay checkout JS opens in browser
5. User completes payment (UPI / card / netbanking)

6. Razorpay fires webhook → POST /api/payments/webhook
   a. Verifies HMAC signature (timingSafeEqual)
   b. Validates amount matches expected tier price (anti-manipulation)
   c. Checks current tier rank (no downgrade replay)
   d. UPDATE trips SET tier=..., payment_id=..., webhook_payment_id=...
   e. Returns 200 to Razorpay

7. Client polls tRPC trips.upgradeTier
   a. Reads webhook_payment_id column
   b. IF set → {success: true}
   c. IF not set → {pending: true} (shows "Confirming payment..." UI)
   d. IF already upgraded → {alreadyUpgraded: true}
```

**Error states:**

- Not a member: 403
- Invalid tier: "Invalid input"
- Razorpay not configured: 503 "Payment service not configured"
- Amount mismatch in webhook: logged, returns 200 (fraud signal)
- DB update fail in webhook: returns 500 → Razorpay retries

---

## OTP Auth Flow (Technical)

```
POST /api/auth/send-otp:
  1. IP rate limit check (10/min via Upstash)
  2. Fraud score: format + disposable + role account + API (Disify/Abstract/Kickbox)
  3. IF blocked: Langfuse security event + 400 response
  4. DB rate limit: max 5 OTP sends per email per 15 min
  5. supabase.auth.admin.generateLink({type: 'magiclink', email})
  6. Extract OTP from response.properties.email_otp
  7. Hash OTP with HMAC-SHA256 (OTP_HMAC_SECRET)
  8. Store hash in otp_codes (expires 10min)
  9. Send via Resend (or console.log in dev)

POST /api/auth/verify-otp:
  1. Look up otp_codes where email + hash matches + not used + not expired
  2. Call supabase.auth.verifyOtp()
  3. Mark OTP as used
  4. Response sets Supabase session cookies
```

---

## Error States Reference

| Error               | User-Facing Message                                                              | Recovery             |
| ------------------- | -------------------------------------------------------------------------------- | -------------------- |
| Disposable email    | "Disposable email addresses are not allowed. Use a real email to join Yaarlore." | Use real email       |
| IP rate limit       | "Too many requests. Slow down."                                                  | Wait 1 min           |
| OTP DB rate limit   | "Too many requests. Try again in 15 minutes."                                    | Wait 15 min          |
| <5 photos           | "Need at least 5 photos to generate lore. You have X — upload Y more."           | Upload more photos   |
| Already processing  | "You already have a trip generating lore. Wait for it to finish."                | Wait                 |
| Monthly cap         | "Monthly generation limit reached (X / Y tokens). Resets next month."            | Wait for month reset |
| Generation timeout  | Retry button shown via FailedState                                               | Reset + retry        |
| Storage limit       | "Free tier storage limit reached (500 MB). Upgrade to continue uploading."       | Upgrade              |
| Battle rate limit   | "Max 3 battle challenges per day. Try again tomorrow."                           | Wait 24h             |
| Invalid invite code | "Yaar this code is literally not working (invalid or expired)."                  | Check code           |
| Member limit        | "This trip is at its 6-member limit. Upgrade to let the whole group join."       | Upgrade              |
| Payment pending     | "Confirming payment..." (UI polls)                                               | Wait for webhook     |
