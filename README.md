# ✦ Woh Wala Trip ✦
> **Your trips, narrated.**

[![Tech Stack](https://img.shields.io/badge/Stack-Next.js_15_%7C_tRPC_%7C_Supabase-black?style=for-the-badge)](https://nextjs.org)
[![AI Engine](https://img.shields.io/badge/AI-Claude_3.5_Sonnet-orange?style=for-the-badge)](https://anthropic.com)
[![Design](https://img.shields.io/badge/Design-Premium_Glassmorphism-pink?style=for-the-badge)](https://tailwindcss.com)

---

## 📖 The Vision
We don't just store photos; we archive the **lore**. 

**Woh Wala Trip** is a mobile-first PWA designed to transform your messy group photo dumps into a cinematic, witty, and brutally honest narrative. Using advanced AI image analysis, we extract the "vibe" of your trip, assign character roles to your friends, and generate shareable cards that capture the *real* energy of the journey.

---

## 🚀 Key Features

### 🧠 AI Lore Engine
- **Narrative Arc**: Transforms chronological photo batches into a 3-act story.
- **Character Dossiers**: Automatically assigns roles like *"The Chaos Coordinator"* or *"The Professional Nap Taker"* based on behavior.
- **Hinglish Native**: Lore is written in authentic, specific Hinglish—the way friends actually talk.

### 📊 Chaos Meter
- A custom SVG-based visualization that measures the "Chaos Index" of your trip.
- From *"Zen Retreat"* to *"Peak Anarchy"*, backed by data extracted from your photos.

### 📱 Premium PWA Experience
- **Glassmorphic UI**: A high-fidelity, mobile-first design system built with Tailwind CSS.
- **Offline Ready**: Built as a Progressive Web App for use in remote destinations.
- **Viral Share Cards**: Server-side generated cards tailored for Instagram Stories and WhatsApp forwards.

---

## 🛠️ Tech Stack

### Frontend (Next.js 15)
- **App Router**: Leveraging Server Components for maximum performance.
- **tRPC v11**: End-to-end type safety between the client and server.
- **Tailwind CSS**: Custom premium theme with Inter & Outfit typography.

### Backend & Infrastructure
- **Supabase**: Handles Auth (OTP flow), PostgreSQL (with strict RLS), and Storage.
- **AI Worker (Python/FastAPI)**: A dedicated microservice for high-compute lore generation using Anthropic's Claude 3.5 Sonnet.
- **Image Processing**: On-the-fly thumbnail generation and metadata extraction.

---

## 📂 Project Structure

```bash
├── src/
│   ├── app/            # Next.js App Router (Auth, Trips, API)
│   ├── components/     # UI Design System
│   ├── lib/            # Shared clients (Supabase, tRPC)
│   └── server/         # tRPC Routers & Backend Logic
├── ai-worker/          # Python AI Lore Pipeline
│   ├── src/lore/       # Orchestrator, Prompts, & Validators
│   └── src/main.py     # FastAPI Entry point
└── supabase/           # SQL Schema & RLS Policies
```

---

## 🏁 Getting Started

### 1. Environment Setup
Create a `.env.local` in the root:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
ANTHROPIC_API_KEY=your_key
AI_WORKER_URL=http://localhost:8000
AI_WORKER_SECRET=your_secret
```

### 2. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Run Development
```bash
npm run dev
```

---

<p align="center">
  <b>Woh Wala Trip — Because some memories deserve a better narrator.</b><br>
  <i>Made with ❤️ for the chaotic Indian traveler.</i>
</p>
