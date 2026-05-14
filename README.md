# ✦ Woh Wala Trip ✦
> **Your trips, narrated. Your lore, archived.**

[![Build Status](https://img.shields.io/badge/Build-Production--Ready-success?style=for-the-badge)](https://nextjs.org)
[![Runtime](https://img.shields.io/badge/Runtime-Vercel_Edge-blue?style=for-the-badge)](https://vercel.com/docs/functions/edge-functions)
[![Stack](https://img.shields.io/badge/Stack-Next.js_15_%7C_tRPC_v11_%7C_Supabase-black?style=for-the-badge)](https://trpc.io)
[![AI Engine](https://img.shields.io/badge/AI-Claude_3.5_Sonnet-orange?style=for-the-badge)](https://anthropic.com)

---

## 📖 The Vision
In the age of infinite photo dumps, we’ve lost the **story**. Thousands of photos sit in WhatsApp groups and iCloud folders, never to be seen again. 

**Woh Wala Trip** changes that. We don't just store photos; we archive the **lore**. 

Using advanced AI vision and behavioral analysis, we transform your messy group uploads into a cinematic, witty, and brutally honest narrative. We identify the peak chaos, assign character roles to your friends, and generate high-fidelity social assets that capture the *real* energy of your journey.

---

## 🚀 Core Features

### 🧠 AI Lore Orchestrator
Our proprietary pipeline analyzes batches of photos to extract emotional and social signals:
- **Narrative Arc**: Automatically structures your trip into a 3-act story (The Excitement, The Peak Chaos, The Reflection).
- **Character Dossiers**: Assigns roles like *"The Professional Nap Taker"*, *"The Chaos Coordinator"*, or *"The Budget Dictator"* based on observed behavior.
- **Hinglish Native**: Lore is written in authentic, culturally resonant Hinglish—exactly how you and your friends actually talk.

### 📊 The Chaos Index
Every trip is assigned a **Chaos Score (0-100)**. 
- Backed by photo metadata (time of day, group density, lighting, transit ratio).
- Visualization shifts from *"Zen Retreat"* to *"Peak Anarchy"* based on your data.

### 🖼️ Viral Share Layer (OG Engine)
The primary growth engine of Woh Wala Trip. We generate high-fidelity 1080x1920 PNGs at the Edge:
- **Main Lore Card**: The cinematic poster of your trip.
- **Award Cards**: "Most Likely To" superlatives for every member.
- **Receipt Stats**: A faux-receipt summarizing the "damage" (late nights, photos taken, chaos contributed).
- **Missing Alerts**: Custom "Wanted" posters for friends who missed the trip.

---

## 🏗️ Technical Architecture

Woh Wala Trip is built as a distributed system designed for high performance and type safety.

### 1. Frontend & API (Next.js 15 + tRPC v11)
- **App Router**: Leveraging React Server Components (RSC) for zero-JS footprints on static content.
- **End-to-End Type Safety**: tRPC ensures that your frontend and backend are always in sync, catching errors at compile time.
- **Premium PWA**: Fully responsive, mobile-first design with glassmorphic UI elements and offline support.

### 2. Backend & Auth (Supabase)
- **OTP Auth**: Seamless phone-number login via SMS.
- **PostgreSQL**: Robust relational data storage with strict Row-Level Security (RLS).
- **Storage**: Scalable image hosting with built-in CDN distribution.

### 3. AI Lore Worker (Python/FastAPI)
- **Intelligence**: Powered by **Claude 3.5 Sonnet** for nuanced behavioral analysis and witty copy generation.
- **Pipeline**: Asynchronous processing that handles photo analysis, signal aggregation, and final lore synthesis.

### 4. Viral Asset Engine (Vercel Edge)
- **Runtime**: `@vercel/og` running on Edge Functions.
- **Performance**: Sub-250ms cold start / 40ms warm start for image generation.
- **Caching**: Intelligent CDN headers to ensure viral assets load instantly.

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 20+
- Supabase Account
- Anthropic API Key (for the AI Worker)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/woh-wala-trip.git
cd woh-wala-trip
npm install --legacy-peer-deps
```

### 2. Environment Variables
Create a `.env.local` file. Use `.env.local.example` as a guide:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role
AI_WORKER_URL=http://localhost:8000
AI_WORKER_SECRET=your-secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your-rzp-key
```

### 3. Run Development
```bash
npm run dev
```

---

## 🌍 Deployment

### Vercel Deployment
Woh Wala Trip is optimized for Vercel. 

1. **Edge Fonts**: Ensure the `.ttf` files in `public/fonts/` are committed to your repo.
2. **Environment Variables**: Mirror your `.env.local` in the Vercel Dashboard.
3. **Razorpay Webhooks**: Configure your Razorpay dashboard to point to `/api/payments/webhook`.

### Self-Hosting (Docker)
The AI Worker can be containerized using the provided `Dockerfile` in the `ai-worker` directory.

---

## 🛤️ Future Roadmap
- **[ ] AI Video Recaps**: Short, narrated video stories using Lore JSON.
- **[ ] Physical Merch**: Print your Lore Card on t-shirts and hoodies directly from the app.
- **[ ] Trip Battles**: Public leaderboards for the highest Chaos Scores.

---

<p align="center">
  <b>Woh Wala Trip — Because some memories deserve a better narrator.</b><br>
  <i>Made with ❤️ for the chaotic Indian traveler.</i>
</p>
