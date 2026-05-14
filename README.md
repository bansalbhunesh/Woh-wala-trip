# ✦ Woh Wala Trip ✦
> **Your trips, narrated. Your lore, archived.**

[![Tech Stack](https://img.shields.io/badge/Stack-Next.js_15_%7C_tRPC_v11_%7C_Supabase-black?style=for-the-badge)](https://nextjs.org)
[![Runtime](https://img.shields.io/badge/Runtime-Vercel_Edge-blue?style=for-the-badge)](https://vercel.com/docs/functions/edge-functions)
[![AI Engine](https://img.shields.io/badge/AI-Claude_3.5_Sonnet-orange?style=for-the-badge)](https://anthropic.com)
[![Design](https://img.shields.io/badge/Design-Glassmorphism_&_Chaos-pink?style=for-the-badge)](https://tailwindcss.com)

---

## 📖 The Vision
We don't just store photos; we archive the **lore**. 

**Woh Wala Trip** is a mobile-first PWA designed to transform messy group photo dumps into a cinematic, witty, and brutally honest narrative. Using advanced AI image analysis, we extract the "vibe" of your trip, assign character roles to your friends, and generate shareable cards that capture the *real* energy of the journey.

---

## 🚀 Key Features

### 🧠 AI Lore Engine
- **Narrative Arc**: Transforms chronological photo batches into a 3-act story.
- **Character Dossiers**: Automatically assigns roles like *"The Chaos Coordinator"* or *"The Professional Nap Taker"* based on behavior.
- **Hinglish Native**: Lore is written in authentic, specific Hinglish—the way friends actually talk.

### 📊 Chaos Meter & Viral Cards
- **Chaos Score**: A data-driven metric (0-100) reflecting the energy level of your trip.
- **Viral Share Cards**: High-fidelity 1080x1920 cards generated at the edge for Instagram Stories and WhatsApp forwards.
- **Variants**: Includes Role Cards, Superlative Awards ("Most Likely To"), Faux-Receipt Stats, and "Missing Person" alerts for those who skipped the trip.

### 📱 Premium Experience
- **Glassmorphic UI**: A high-fidelity, mobile-first design system built with Tailwind CSS.
- **Fast & Edge-Ready**: Sub-250ms OG card rendering via Vercel Edge Functions.
- **Offline Ready PWA**: Built for use in remote destinations.

---

## 🛠️ Tech Stack

### Frontend & API
- **Framework**: Next.js 15 (App Router)
- **API Layer**: tRPC v11 (End-to-end type safety)
- **Styling**: Tailwind CSS + Custom Design System
- **State Management**: TanStack Query (React Query v5)

### Backend & AI
- **Auth & DB**: Supabase (OTP Phone Auth + PostgreSQL)
- **Storage**: Supabase Storage with image optimization.
- **AI Worker**: Python FastAPI microservice using Anthropic Claude 3.5 Sonnet.
- **Image Generation**: `@vercel/og` for dynamic social card rendering.

---

## 🏁 Getting Started

### 1. Environment Setup
Create a `.env.local` (see `.env.local.example` for reference):
```bash
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
AI_WORKER_URL=http://localhost:8000
AI_WORKER_SECRET=your_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_key
```

### 2. Install & Run
```bash
# Install dependencies (using legacy-peer-deps for React 19 compatibility)
npm install --legacy-peer-deps

# Start development server
npm run dev
```

### 3. Font Management
The Viral Share Layer requires specific fonts for OG rendering. Ensure these are in `public/fonts/`:
- `Inter-Medium.ttf`, `Inter-Regular.ttf`, `Lora-Italic.ttf`

---

## 🌍 Deployment & Edge Runtime

The **Viral Share Layer** is optimized for **Vercel Edge Functions**.

- **Edge Configuration**: Routes in `src/app/api/card/` are set to `runtime = 'edge'`.
- **Absolute URLs**: Ensure `VERCEL_URL` (or your production domain) is configured so the edge function can fetch font assets reliably.

---

<p align="center">
  <b>Woh Wala Trip — Because some memories deserve a better narrator.</b><br>
  <i>Made with ❤️ for the chaotic Indian traveler.</i>
</p>
