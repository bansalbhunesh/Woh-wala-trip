# YC Demo Script — Yaarlore

**Core pitch (1 sentence):** "Upload your trip photos. Get an AI documentary of your friend group's behavioral patterns. Share it in WhatsApp."

**Demo duration:** 3-4 minutes max.

---

## BEFORE THE DEMO

### Seed the demo environment

1. Run the seeder once before the demo:

```bash
curl -X POST https://yaarlore.app/api/admin/seed-demo \
  -H "Content-Type: application/json" \
  -H "x-demo-seed-secret: YOUR_DEMO_SEED_SECRET" \
  -d '{"userId": "YOUR_USER_UUID"}'
```

2. The seeder creates:
   - **Manali trip** (84/100 chaos, "Historically Cooked")
   - **Goa trip** (71/100, "Peak Delusion")
   - **Open dispute** (3/5 voted — demo the deciding vote)
   - **Pre-filled incident log** (Bus Incident as LEGENDARY)
   - **Character arc** showing evolution across 2 trips

3. NEVER demo live lore generation. Use pre-seeded trips only.

---

## DEMO FLOW (3 minutes 45 seconds)

### 0:00 — The Hook (30 seconds)

Open the browser to: `yaarlore.app/t/MANALI24/story`

- **Slide 1 loads instantly:** "84/100 — Historically Cooked"
- Say: _"This is what our AI produces after analyzing your trip photos. This number is the chaos score. It went straight into my friend's WhatsApp group chat within 10 seconds of being generated."_
- Show the WhatsApp share button. Tap it. Show the pre-filled message.
- Say: _"That WhatsApp caption was written by the AI. Not us."_

### 0:30 — The "Bro This Is You" Moment (45 seconds)

Swipe to the character slide.

- Say: _"This is Rohan. The AI analyzed 127 photos from the trip and wrote his behavioral profile."_
- Read the role title: _"The Designated Planner Who Plans Too Much"_
- Read the signature move. Let it land.
- Say: _"Every single person in that group forwarded this to Rohan within 5 minutes."_

### 1:15 — The Product Demo (60 seconds)

Navigate to: `yaarlore.app/trips/[manaliTripId]`

- Scroll to show the full lore: chaos score → characters → incident log
- Open the Deeper Record. Show the Bus Incident as LEGENDARY.
- Say: _"The AI extracts structured incident records — not just narrative. This 'Bus Incident' has now been referenced in 2 subsequent trips. It's canonical group mythology."_
- Open the dispute: _"Rohan is disputing his character assessment. 3 of 5 people voted. The mythology is waiting for the last vote."_

### 2:15 — The Business (45 seconds)

- Say: _"This is a subscription product. ₹99/month for the full experience. We're focused on India first — 300 million young adults who document every trip in WhatsApp groups and have zero way to make that documentation permanent or emotionally resonant."_
- Show the upgrade page briefly.
- Say: _"The demo page — which doesn't require signup — has a 40% CTA conversion. Users who see a friend's lore link, then generate their own trip within 7 days, retain at 65% after 30 days."_
  _(Note: replace these with your actual numbers before YC)_

### 3:00 — The Vision (45 seconds)

Navigate to the Friendship Timeline.

- Say: _"Here's where it gets interesting. After two documented trips, the AI is tracking Rohan's chaos trajectory. It's declining. That's a data point nobody has. We're building the behavioral record of Indian friendship groups across years — starting with trips, but expanding to the entire social layer underneath WhatsApp."_
- Say: _"We're not building a trip recap tool. We're building persistent social memory infrastructure."_

---

## QUESTIONS TO PREPARE FOR

**"Why does this retain users?"**
→ "Three mechanisms. The dispute system — your mythology is incomplete until you vote. The prophecy — the AI predicts what will happen on your next trip based on documented history. And the character arc — users come back to see how their behavioral profile has evolved across trips."

**"What's the moat?"**
→ "After 3-4 years of documented trips, switching costs aren't technical — they're existential. You can't export the meaning we've assigned to your friend group's history. The Bus Incident has been referenced in 4 subsequent trips. That contextual chain lives only here."

**"Why India first?"**
→ "WhatsApp is the social OS for 500M Indian users. Group trip documentation is cultural infrastructure here — every group chat has 300 unedited photos from the last trip. We turn that into something emotionally permanent. India also has the cheapest CAC for this demographic."

**"How does the AI work?"**
→ "8-step pipeline: photo batch analysis (behavioral signals, not captions), signal aggregation, lore generation, character roles, quality gate with retry, structured incident extraction. Claude Sonnet for vision and lore. Haiku for evaluation. The models don't caption photos — they analyze behavioral dynamics in groups."

**"Competitors?"**
→ "Google Photos, BeReal, Instagram — all create individual/passive memories. We create group behavioral mythology. Nothing else does cross-trip identity tracking, canonical incident records, or group psychology analysis."

---

## DEMO URLS TO HAVE READY

| Surface                   | URL                                         |
| ------------------------- | ------------------------------------------- |
| Public story (share link) | `yaarlore.app/t/MANALI24/story`             |
| Trip room (full lore)     | `yaarlore.app/trips/[manaliTripId]`         |
| Demo page (no auth)       | `yaarlore.app/demo`                         |
| Upgrade page              | `yaarlore.app/trips/[manaliTripId]/upgrade` |

## WHAT NOT TO DO

- ❌ Don't show live generation — it takes 3-5 minutes
- ❌ Don't show the trips page to a YC partner on first view (too empty)
- ❌ Don't explain the tab system (it was removed — content is linear now)
- ❌ Don't demo on a slow connection — have 4G minimum
- ❌ Don't apologize for the product — just show it working

## THINGS TO SET BEFORE THE DEMO

1. `DEMO_SEED_SECRET` env var on Vercel
2. `LORE_EVAL_SAMPLE_RATE=0.2` on Render (or demo costs double)
3. Render worker on paid tier ($7/month) — no cold starts
4. `VAPID_PRIVATE_KEY` on Vercel (push notifications work during demo)
5. Chrome on mobile in landscape — or desktop Chrome

---

_Last updated: 2026-05-19_
