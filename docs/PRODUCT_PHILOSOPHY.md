# Product Philosophy — Yaarlore

## The Cinematic Documentary Lens

Every decision in Yaarlore passes through one question: **"Does this feel like a HBO documentary about your friend group, or does it feel like a photo album?"**

This is not a metaphor or marketing language — it is a literal design constraint. The product is called Yaarlore ("lore" as in mythology, "yaar" as in friend in Hindi/Urdu) because the output is not a recap, summary, or highlight reel. It is **mythology being created in real time**.

This philosophy manifests in:

- Terminology: "Season," not "Year"; "Era," not "Chapter"; "Chaos Score," not "Rating"; "Lore," not "Summary"; "Cooked," not "Wild"
- Visual language: Documentary-style frames, cinematic color grades, film grain, monospace type, muted high-contrast palettes
- AI tone: The lore is written like an HBO showrunner wrote it, not like a travel blog. Roasty, specific, warm, and with genuine emotional weight.
- Animation: Framer Motion transitions that feel like a documentary director cut, not a swipe navigation
- The generating page: The pipeline step descriptions ("Watching the journey...", "Writing the mythology...") are art direction, not just status updates

**This constraint must survive all refactors** (from CLAUDE.md). Any developer working on this codebase should treat the cinematic UX as a non-negotiable invariant.

---

## India-First Design Decisions

1. **Hinglish tone is not optional, it's the product.** The lore AI has a `hinglish_intensity` parameter. Medium Hinglish by default. "Yaar" in error messages ("Yaar this code is literally not working"). The product is in conversation with a specific cultural context — Indian Gen Z friend groups — and the language reflects that.

2. **WhatsApp as primary distribution channel.** Every sharing surface has a WhatsApp pre-fill button. The OG cards are designed for WhatsApp preview dimensions. The anniversary email has a WhatsApp share button as a primary CTA. This is not an afterthought.

3. **Group trip as the atomic unit.** The product is designed around 4–8 person trips, not solo travel or couples travel. The 6-member free tier cap is calibrated to this group size. The battle system only makes sense in a group context. The dispute system only has meaning when your friends can see and vote on it.

4. **Razorpay pricing.** ₹399 one-time per trip. This is ~$4.80. This is a deliberate India-first price point. The equivalent in a US-focused product would be $20–30. Yaarlore is explicitly accessible to Indian purchasing power.

---

## The "Lore" Concept — Why It's Compelling

**Lore** in internet culture means the accumulated mythology and canon of a universe — the backstory that makes a character or story feel real. Fan communities develop lore. TV shows have lore. Games have lore.

Yaarlore's thesis is that **your friend group has lore too**. You have recurring characters (The Chaos Goblin who always loses the room key), recurring incidents (The Goa Night That Must Not Be Named), running jokes (invoking a phrase that references a specific terrible decision), and character arcs (who became more chaotic, who became the responsible one).

This lore exists in memory but is never documented. Yaarlore documents it — and by documenting it, makes it feel more real and more permanent.

**The mythology system:** The callback context injection (past incidents referenced in new lore), the `group_lore_os` table (living mythology document), the identity snapshots across trips — all of these are implementations of the belief that your friend group is a story with continuity, not a series of disconnected events.

---

## Emotional UX Principles

1. **The reveal is sacred.** The generating page should feel like anticipation, not waiting. The pipeline step labels are written to create emotional anticipation: "Watching the journey..." not "Processing batch 2 of 4."

2. **The chaos score is the dopamine hit.** Seeing your chaos score for the first time should feel like finding out your Spotify Wrapped. It should be instantly shareable and contextually meaningful ("84 — Historically Cooked" is specific enough to be interesting, abstract enough to be universal).

3. **Roasts must be warm.** The AI's character roles are designed to roast, not hurt. "The Chaos Goblin" is funny. "The person who ruins everything" is not. The AI tone is the voice of a loving, teasing friend, not a critic.

4. **Personal accountability is part of the value.** The confession system allows members to submit pre-trip confessions that the AI uses to assign character roles. Asking "what did you do on this trip that you won't admit to?" creates psychological engagement and produces better, more specific lore.

5. **The group context matters.** Lore is only meaningful in context. The character role "The Logistics Gremlin" is funny if your group knows who it refers to. This is why the product is group-first, not individual-first.

---

## Design Constraints (from CLAUDE.md)

The following invariants must never be broken:

- **"Cinematic UX, animations, and documentary-style storytelling must survive all refactors"** — No "clean up" should remove the Framer Motion transitions, the cinematic component layer, or the documentary visual language.

- **"Public story sharing (`/t/[code]/story`) must remain functional"** — This is the primary viral surface. Anything that breaks the public story URL breaks the growth loop.

- **"Lore generation pipeline end-to-end must work after every change"** — The AI pipeline is the core value. Test the pipeline before shipping.

- **"Razorpay payment flow must work end-to-end"** — Revenue depends on this.

---

## Anti-Patterns to Avoid

1. **Generic AI writing.** The worst possible lore is vague, could apply to any trip, and reads like a ChatGPT summary. The quality gate (LoreEvaluator) exists precisely to prevent this. The `scan_forbidden_phrases` function blocks phrases like "the group made unforgettable memories" that are the hallmarks of generic output.

2. **Sanitized social.** The product is not trying to be Instagram — polished, aspirational, and filtered. It is trying to be raw, specific, and honest. The chaos score exists because chaos is the actual truth of group travel.

3. **Over-engineering the UX.** The cinematic experience is supposed to feel effortless, not performative. Adding more animations, more transitions, more effects without emotional purpose is noise. Every animation should serve the documentary feeling.

4. **Ignoring the group context.** Features that work for solo users but don't amplify the group experience are off-brand. Every feature should ask: "Does this create more mythology? Does this create more group conversation?"

5. **Losing the lore continuity.** The callback system (past incidents referenced in new trips) is the product's long-term differentiator. Any change that breaks the cross-trip mythology system (identity snapshots, Group Lore OS, recurring references) undermines the core moat.

---

## What "Good" Looks Like for This Product

**A good lore generation:**

- Trip title is specific and surprising ("The Manali Parliament: A Study in Collective Delusion")
- Chaos score feels accurate ("I knew we were at least an 80")
- Character roles make the group laugh and say "that's exactly right"
- At least one era name that becomes an inside reference for the group
- One core memory that captures the most absurd moment of the trip
- Hinglish sentences that sound like something someone in the group would actually say

**A good viral moment:**

- Someone screenshots the chaos score and sends it to the group WhatsApp
- "74 — PEAK DELUSION" with the tagline below it
- Everyone in the group responds with their reaction to their character role
- Someone from outside the group asks "what is this, I need to do this for our trip"

**A good retention signal:**

- One year later, the anniversary email arrives
- The user forwards it to the group: "It's been one year since we were Historically Cooked in Kasol"
- Someone says "we need to do another trip so we can see if we got worse"
