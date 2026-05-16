<div align="center">

# 🎬 YAARLORE

### *Your friendships, narrated.*

**The AI-powered friendship documentary. Spotify Wrapped for the trips you'll never forget.**

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-woh--wala--trip.vercel.app-FF4D4D?style=for-the-badge&logoColor=white)](https://yaarlore.app)
[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Claude Sonnet 4](https://img.shields.io/badge/Claude_Sonnet_4-FF6B00?style=for-the-badge&logoColor=white)](https://anthropic.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

---

> *"Some products show you data. This one shows you who you really are."*

</div>

---

## 🧠 What Is This, Actually?

You went on a trip. Someone started drama on Day 1. Someone claimed to be "fine" until 2 AM. There were three near-disasters, eleven incidents, and one conversation that will never be spoken of again.

**Yaarlore turns all of that into mythology.**

Upload your photo dump. The AI watches, judges, and documents. Out comes a cinematic, roasting, brutally honest **Friendship Lore Archive** — complete with character archetypes, chaos scores, season recaps, and superlatives that will immediately end up in the group chat.

This is not a travel app. It's a **friendship documentary reconstructed from recovered memories.**

---

## ✨ The Full Feature Set

### 🎭 The Lore Engine — AI That Actually Gets It

The heart of the app. Claude Sonnet 4 runs a full behavioral analysis on your trip photos — not *what's* in them, but *what they reveal.*

```
Photo dump  →  8-stage AI pipeline  →  Full cinematic mythology
```

| What it generates | What it means |
|---|---|
| 🎬 **Trip Title** | A cinematic name worthy of an A24 poster |
| 💬 **Tagline** | One sentence that captures the collective delusion |
| 🌡️ **Cooked Score** | 0–100 chaos rating. 84+ = historically cooked |
| 🏷️ **Cooked Verdict** | "Zen Retreat" · "Certified Disaster" · "Institutionalized" |
| 📖 **Season Recap** | A full narrative of what *really* happened |
| 🗓️ **Trip Eras** | The phases your group went through, with timestamps |
| 🃏 **Character Cards** | Every member gets a role title + chaos rating |
| 🏆 **Superlatives** | "Most likely to..." awards — assigned to the actual guilty person |
| ✍️ **Closing Line** | The one sentence that defines the entire trip |

The AI is instructed to think like *"an internet-native historian."* It looks for who's carrying the group's social battery, who is pretending to be normal, and what the collective delusion was. Generic travel writing gets auto-rejected.

---

### 📱 Tap-Through Story Player

Every trip becomes a **cinematic tap-through experience** — like Instagram Stories but for your lore.

**Slide by slide:**

```
[  ████░░░░░░  ] slide 2 of 10

      THE OFFICIAL ARCHIVE

  The Solo Kodai Chronicles:
   Zero Evidence Edition

  "Bhai went full mystery mode and came
   back with absolutely nothing to show for it"

                              TAP →
```

- Directional slide-in animations (`←` retreat / `→` advance)
- Progress bars showing exactly where you are
- The cooked score **slams** in and counts up from 0 with a visual shockwave
- Character cards **flip** in with a 3D perspective reveal
- Superlative winners **slam** in oversized coral text
- The closing verdict arrives cinematic, with teal dividers

---

### 🌐 Public Story — Share Without Login

Every trip gets a permanently shareable link that works for *anyone* — no account needed.

```
/t/83A6AB6           →  Public teaser (title, score, tagline, stats)
/t/83A6AB6/story     →  Full tap-through story (no auth required)
```

Your group chat link → they tap through the whole thing → they see themselves documented → they lose their minds.

The `✓ PUBLIC STORY` teal pill in the corner lets viewers know they're in a shared archive. The full tap-through is identical to the private experience — every slide, every animation, every roast.

---

### 🔥 Emoji Reactions

On the final verdict slide, anyone can react:

```
🔥  😂  💔  👑  😭
```

- Works without an account on the public story
- Optimistic update — feels instant, syncs in background
- Counts are real-time and visible to everyone
- Clicking a reaction doesn't advance the slide

---

### 📬 Anniversary Emails — One Year Later

A year after your trip gets its lore, everyone on the trip gets a cinematic dark email:

```
● ONE YEAR ANNIVERSARY

┌─────────────────────────────┐
│  2025 — The Solo Kodai Chronicles    │
│                             │
│           15                │
│       ZEN RETREAT           │
└─────────────────────────────┘

"One year ago, you and your crew created
 friendship mythology."

"The most legendary trip is the one that
 lives only in your memory."

         RELIVE THE STORY →
```

- Auto-scheduled via SQL trigger the moment lore generation completes
- No manual setup — it just happens
- Sent at 6am UTC via Vercel Cron + Resend
- Matches the app's dark cinematic aesthetic, down to the HTML

---

### 🎥 Cinematic Design System

Three distinct visual zones — each with its own atmosphere:

| Zone | Feel |
|---|---|
| 🌌 **Landing** | 880 particles rushing inward from void. Archetype cards orbiting in space. |
| 🌀 **Auth** | Dr. Strange portal rings rotating. A golden snitch bouncing across edges. |
| 🏚️ **Trip Interior** | Atmospheric film grain. Dark `#060604` base. Documentary shell. |
| 📽️ **Story Player** | Full-screen. Progress bars. Directional transitions. Pure cinema. |

Design tokens baked into every pixel:
- Background: `#060604` (warm dark, not pure black)
- Accent: `#FF4D4D` (cooked coral-red)
- Secondary: teal `rgba(45,158,139,...)`
- Text: `#F5F0E8` (warm off-white)
- Fonts: **Bricolage Grotesque** · **Nunito** · **Fira Mono**

---

### 🔐 Auth — No Passwords, No Friction

Email OTP. You enter, you're in.

```
Enter email  →  Get 8-digit code  →  Enter code  →  You're home
```

- Delivered via Resend
- HMAC-SHA256 hashed before storage
- Rate limited (5 attempts / 15 min)
- Profile auto-created from your email on first login

---

### 🗂️ Trip Management Flow

```
Create trip  →  Share invite code  →  Friends join
     ↓
Upload photos (min 5 to unlock AI)
     ↓
Generate lore  →  Watch the particle universe while Claude thinks
     ↓
Tap through your story  →  Share the public link  →  React
     ↓
           Wait one year. Get an anniversary email.
```

- Optimistic photo count — the Generate button enables the moment you hit 5
- Placeholder pulse dots for photos without thumbnails yet
- Generating page polls until `lore_status = 'ready'`, then auto-redirects

---

## 🛠️ Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND                                               │
│  Next.js 16 (App Router + Turbopack) · React 19        │
│  tRPC v11 · TanStack Query v5                           │
│  Tailwind CSS v4 · OKLCH color tokens                  │
│  Canvas API particle systems · CSS keyframe animations  │
│  Bricolage Grotesque · Nunito · Fira Mono               │
├─────────────────────────────────────────────────────────┤
│  BACKEND                                                │
│  Supabase PostgreSQL + Storage + Auth + RLS            │
│  Next.js API Routes (reactions, cron, OG cards)        │
│  tRPC routers (trips, photos, reactions, cards)        │
│  Resend (OTP + anniversary emails)                     │
├─────────────────────────────────────────────────────────┤
│  AI WORKER                                              │
│  Python 3.12 + FastAPI                                 │
│  AsyncAnthropic (Claude Sonnet 4 · vision + text)      │
│  8-stage async pipeline with parallel enrichment       │
│  180s timeout · tenacity retry · signal validation     │
├─────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE                                         │
│  Vercel (frontend + serverless API routes)             │
│  Vercel Cron (0 6 * * * — anniversary emails)         │
│  Supabase SQL triggers (auto-schedule on lore ready)   │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx                     # Landing → redirects if logged in
│   ├── (auth)/login/                # Email OTP login (portal animation)
│   ├── trips/
│   │   ├── page.tsx                 # Your trips (3D tilt cards)
│   │   ├── new/                     # Create a trip
│   │   ├── join/                    # Join via invite code
│   │   └── [tripId]/
│   │       ├── page.tsx             # Trip room (upload photos, optimistic count)
│   │       ├── generating/          # Particle universe while AI generates
│   │       ├── story/               # Private tap-through story + ReactionBar
│   │       ├── invite/              # Your trip's 8-char invite code
│   │       └── card/                # OG card generation
│   ├── t/[code]/
│   │   ├── page.tsx                 # Public teaser (no auth)
│   │   └── story/
│   │       ├── page.tsx             # Server component — fetches lore
│   │       └── PublicStoryClient.tsx # Tap-through, no auth, with ReactionBar
│   └── api/
│       ├── auth/send-otp/           # OTP send + rate limiting
│       ├── reactions/               # GET counts + POST (anon + auth)
│       ├── cron/anniversaries/      # Daily anniversary email job
│       └── card/[type]/[tripId]/    # OG image generation (Node.js runtime)
│
├── components/
│   ├── cinematic/
│   │   ├── CinematicLanding.tsx     # Particle universe + archetype cards
│   │   ├── CinematicAuth.tsx        # Portal rings + golden snitch canvas
│   │   └── CinematicShell.tsx       # Atmospheric interior shell
│   └── experience/
│       ├── ReactionBar.tsx          # 🔥😂💔👑😭 with optimistic update
│       └── LandingClient.tsx
│
├── server/trpc/routers/
│   ├── trips.ts                     # Create, join, fetch (service role for RLS)
│   ├── reactions.ts                 # add + getCounts (public + auth)
│   └── cards.ts                     # Card metadata
│
└── lib/
    ├── supabase/server.ts           # SSR + service role clients
    └── types.ts                     # LoreJson type (full AI output shape)

ai-worker/
└── src/
    ├── lore/
    │   ├── orchestrator.py          # 8-stage async pipeline
    │   └── prompts.py               # Claude system + user prompts
    ├── clients.py                   # AsyncAnthropic + Supabase setup
    └── main.py                      # FastAPI app
```

---

## 🗃️ Database Schema

```sql
-- Core tables
trips           (id, name, destination, trip_start_date, trip_end_date,
                 invite_code, lore_json, lore_status, chaos_score, created_by)

trip_members    (id, trip_id, user_id, role_title, role_description,
                 role_chaos_rating, photos_uploaded)

trip_photos     (id, trip_id, user_id, storage_path, thumbnail_path,
                 batch_analyzed)

profiles        (id, email, display_name)

-- New features
lore_reactions  (id, trip_id, user_id [nullable], slide_type,
                 slide_idx, emoji, created_at)

scheduled_emails (id, trip_id, user_id, email_type, send_at, sent_at)
```

`lore_json` carries the entire AI output as JSONB — title, tagline, cooked score, verdict, eras, characters, superlatives, closing line — one column, forever.

**SQL trigger:** when `lore_status` flips to `'ready'`, PostgreSQL automatically inserts a row into `scheduled_emails` with `send_at = trip_start_date + 1 year`. No cron setup needed. No manual scheduling. It just works.

---

## 🤖 The AI Pipeline

Claude doesn't caption photos. It reads the room.

**8 stages, fully async, ~45s end to end:**

```
1. 📸 VISION BATCHING
   Photos analyzed in groups of 10
   Extracts: late-night ratio, chaos indicators, who's performing vs documenting

2. 🔗 SIGNAL AGGREGATION
   Cross-references all batches
   Outputs: social dynamic, dominant photographer, peak cooked moment

3. ✍️ LORE GENERATION
   Trip title, tagline, cooked score, verdict, season recap, 3 trip eras
   Hinglish-native · A24-toned · internet-culture-aware

4. 🃏 CHARACTER ROLES (parallel per member)
   Role title, description, chaos rating, defining moment
   Types: Chaos Source · Black Cat · Golden Retriever · Main Character · NPC

5. 🏆 SUPERLATIVES
   "Most likely to..." — assigned to actual members with evidence
   Validated: winner IDs must match real member UUIDs

6. 🎯 COOKED SCORING
   Cross-validated against all behavioral signals
   0-25: Mildly Simmering · 26-50: Getting Cooked · 51-75: Fully Cooked
   76-90: Peak Delusion · 91-100: Historically Cooked

7. ✅ VALIDATION
   Rejects generic AI writing (auto-blocked phrases: "unforgettable memories",
   "bonds that last", "magical experience", etc.)

8. 💾 PERSISTENCE
   Writes lore_json to Supabase, sets lore_status='ready'
   SQL trigger fires → anniversary email scheduled for 1 year later
```

---

## 🚀 Running Locally

### 1. Clone & Install

```bash
git clone https://github.com/bansalbhunesh/Woh-wala-trip
cd Woh-wala-trip
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUz...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUz...

# Email via Resend (free: 3,000/month)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# AI Worker
AI_WORKER_URL=http://localhost:8000
AI_WORKER_SECRET=your-secret

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Run Database Migrations

In Supabase SQL Editor, run files from `supabase/migrations/` in order:

```
20260515_auto_profile.sql          ← auto-create profile on signup
20260515_fix_trip_members_rls.sql  ← RLS for trip members
20260515_otp_codes.sql             ← OTP rate limiting table
20260515_storage_rls.sql           ← photo storage policies
20260516_anniversary_and_reactions.sql ← reactions + anniversary tables + trigger
20260516_profiles_rls.sql          ← profile read/write policies
```

### 4. Start the AI Worker

```bash
cd ai-worker
pip install -r requirements.txt

# Create ai-worker/.env
ANTHROPIC_API_KEY=sk-ant-api03-xxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciO...
AI_WORKER_SECRET=your-secret

uvicorn src.main:app --reload --port 8000
```

### 5. Run the App

```bash
npm run dev
```

Open `http://localhost:3000` — enter the universe.

---

## 🌍 Deploy to Production

### Frontend → Vercel

```bash
npx vercel deploy --prod
```

Add all `.env.local` variables in Vercel Dashboard → Project → Settings → Environment Variables.

The `vercel.json` cron config is already included:
```json
{
  "crons": [{ "path": "/api/cron/anniversaries", "schedule": "0 6 * * *" }]
}
```

### AI Worker → Render / Railway / Fly.io

1. New Web Service → connect the repo
2. **Root Directory:** `ai-worker` · **Runtime:** Docker (or Python 3.12)
3. Add env vars: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_WORKER_SECRET`
4. After deploy, set `AI_WORKER_URL=https://your-worker.onrender.com` in Vercel

---

## 🗺️ What's Next

- [ ] 📸 **Google Photos integration** — auto-import trip albums
- [ ] ⚔️ **Battle Mode** — two trips compete for highest cooked score
- [ ] 💌 **Character card downloads** — shareable PNG for every member
- [ ] 🔔 **Push notifications** — get notified the second lore drops
- [ ] 🤫 **Group confessions** — anonymous pre-trip questions that feed the AI
- [ ] 📅 **Full friendship timeline** — every trip, every era, in one archive

---

## 🧩 Project Philosophy

**The AI is instructed to never produce generic travel writing.**

The prompt system is Hinglish-native, internet-culture-aware, and built to roast with love. It knows the difference between "historically cooked" and "mildly simmering." It assigns blame where blame is due.

The UI treats your trip like a film — dark backgrounds, cinematic typography, particle systems that respond to state. Every interaction is a moment. Nothing is instant. Everything is revealed.

Want to improve the lore quality? → `ai-worker/src/lore/prompts.py`  
Want to adjust the chaos scoring? → `ai-worker/src/lore/validators.py`  
Want to retheme the design? → `src/app/globals.css` + `tailwind.config.ts`

---

<div align="center">

---

**Some trips deserve to be documented properly.**

*This is how.*

---

[**Try it live →**](https://yaarlore.app)

*Season 2026 · AI Friendship Archive · Built with chaos, documented with care*

</div>
