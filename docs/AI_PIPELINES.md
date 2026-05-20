# AI Pipelines — Yaarlore

## Overview

All AI work runs in the Python FastAPI worker (`ai-worker/`) on Render. The TypeScript Next.js layer triggers jobs and reads results; it does not call the Anthropic API directly (except via the Langfuse tracing client which makes HTTP calls to Langfuse, not Anthropic).

**Models used:**

- `claude-sonnet-4-6` (default): vision analysis, signal aggregation, core lore generation, yearly wrap, battle judging
- `claude-haiku-4-5-20251001`: character role generation, receipt stats, superlatives, lore quality evaluation, incident extraction
- `claude-haiku-4-5-20251001` as fallback: when Sonnet is overloaded (`CLAUDE_FALLBACK_MODEL`)

---

## Main Lore Generation Pipeline (8 Steps)

**Entry point:** `ai-worker/src/lore/orchestrator.py:LoreOrchestrator.run_full_pipeline(trip_id)`

**Token budget:** 60,000 tokens max per run (hard ceiling via `PipelineBudget`)  
**Concurrency limit:** 8 simultaneous LLM calls across all pipeline instances (`PipelineRateLimiter`)

### Step 1: Fetch

**Status update:** `lore_pipeline_state.step = 'fetch'`  
**Model:** None (DB queries only)

```python
trip, photos, members = await gather(
    to_thread(_get_trip, trip_id),
    to_thread(_get_photos, trip_id),
    to_thread(_get_members, trip_id),
)
```

- Fetches trip row (sanitizes name + destination for prompt injection)
- Fetches all photos for the trip
- Fetches trip_members with profile display_names (sanitized)
- Reconciles `total_photos` / `member_count` if DB counts are stale
- Aborts if <5 photos: sets `lore_status = 'failed'`
- Sets `low_confidence = True` if <8 photos (softer tone mode)

**Input:** trip_id  
**Output:** trip dict, photos list, members list

---

### Step 2: Vision Analysis (in parallel with structural signals)

**Status update:** `lore_pipeline_state.step = 'vision'`  
**Model:** Claude Sonnet 4.6 (vision batches)

Runs in parallel:

- `_compute_trip_signals(trip, photos, members)` — no LLM, fast structural analysis
- `_analyze_photo_batches(trip, photos)` — LLM vision calls

**Vision batching logic:**

- Max 20 photos per batch (`MAX_PHOTOS_PER_VISION_CALL=20`)
- Max 4 batches (`MAX_VISION_BATCHES=4`) → 80 photos analyzed max
- If >80 photos: evenly-spaced sampling (covers full trip timeline)
- Each batch: downloads photos via httpx (async), base64-encodes them, sends to Claude vision
- Per-image 8MB size cap — oversized images skipped (PERF-04)
- Batch failures: partial failure tolerated; ALL batches failing → fabricated default signals

**Structural signals computed (no LLM):**

- Time-gap clusters (2-hour threshold for scene boundaries)
- Contributor diversity (uploaders / members ratio)
- Dominant uploader ratio
- Night photo count/ratio (10pm–5am hours)
- High-dwell photos (viewed ≥9 seconds)
- Reaction emoji summary

**Input:** Photos (base64), trip metadata  
**Output per batch:** JSON with `raw_cooked_score`, `recurring_behaviors`, `emotional_arc`, `photo_count`, `group_shots_ratio`, `late_night_ratio`, etc.

**Token cost:** ~1,000–1,500 tokens per batch × up to 4 batches = ~4,000–6,000 tokens

---

### Step 3: Signal Aggregation

**Status update:** `lore_pipeline_state.step = 'aggregate'`  
**Model:** Claude Sonnet 4.6  
**Cache:** System prompt cached (Anthropic prompt caching)

Context size guard: if batch JSONs exceed 16,000 chars (~4,000 tokens), trimmed to temporal spread (first + last + evenly-spaced middle batches).

Aggregation prompt includes:

- All vision batch results (as JSON)
- Structural signals (clusters, diversity, night ratio, reactions)
- Member names list

**Input:** batch signals JSON, structural signals, member names  
**Output:** Aggregated dict with `peak_cooked_moment`, `social_dynamic`, `lore_writing_hints` (lead_with, avoid, hinglish_intensity), average ratios, etc.

**Token cost:** ~1,500–2,000 tokens

---

### Step 4: Core Lore Generation (with quality gate)

**Status update:** `lore_pipeline_state.step = 'lore'`  
**Model:** Claude Sonnet 4.6  
**Cache:** System prompt cached

Two sub-steps:

**4a. Lore generation:**

- Fetches confessions (from `trip_members.confession_text`, sanitized)
- Fetches callback context (past incidents + recurring references from this group's history)
- Calls `_generate_lore_with_retry()` — up to `MAX_LORE_RETRIES=3` attempts
- Each failure includes the error message as additional context in the next attempt
- If `low_confidence`: system prompt modified to soften specific claims; chaos clamped to 20–65
- Validates output via `validate_lore_json()` (schema check) + `scan_forbidden_phrases()` (content check)

**Schema of generated lore_json:**

```
{
  trip_title, tagline, cooked_level (0-100), cooked_verdict,
  opening_line, closing_line, what_this_trip_was_really_about,
  trip_personality_type, trip_personality_tagline,
  friendship_dynamics: { chaos_source, collective_energy, emotional_center },
  season_recap: { full_narrative, opening_hook, emotional_peak, closing_summary },
  trip_eras: [{ era_name, era_subtitle, era_summary, era_vibe, key_moment, timeframe }],
  trip_lore_awards: { core_memory, plot_twist, golden_moment, trip_villain, trip_mvp },
  top_moments: [{ title, description }],
  confidence_level: "high" | "low"
}
```

**4b. Quality gate (sampled):**

- `LoreEvaluator` (Haiku) scores on: specificity, coherence, tone, differentiation, schema_completeness
- `LORE_EVAL_SAMPLE_RATE=1.0` (all runs in current config)
- If `overall < 0.55`: retry once with feedback injected into system prompt
- Result stored in `lore_eval_json` + `lore_needs_review` flag

**Token cost:** ~3,000–4,500 tokens for lore generation + ~400 tokens for eval = ~4,000–5,000 tokens

---

### Steps 5–7: Parallel Enrichment

**Status update:** `lore_pipeline_state.step = 'enrichment'`

Runs in parallel using `asyncio.gather`:

**Step 5: Character Roles** (per member, parallel with semaphore MAX_CONCURRENT_ROLES=3)  
**Model:** Claude Haiku 4.5  
**Cache:** System prompt cached

For each trip member:

- Input: member stats (appearance count, upload count, confession), full lore, other member data
- Output: `{ role_title, role_description, chaos_rating, archetype, catchphrase }`
- Fallback: "The Mysterious One" if role generation fails

**Token cost:** ~700–900 tokens per member × N members (e.g., 6 members = ~5,000 tokens)

**Step 6: Receipt Stats**  
**Model:** Claude Haiku 4.5

- Generates "Spotify Wrapped"-style trip statistics
- Input: photo count, duration, member count, cooked level, social dynamic
- Output: `{ receipt_stats: [{ label, value, emoji }], receipt_rating, receipt_review }`

**Token cost:** ~500–800 tokens

**Step 7: Superlatives**  
**Model:** Claude Haiku 4.5

- Generates trip-specific "awards" for members
- Input: lore JSON, members, confessions
- Output: `[{ title, question, winner, winner_user_id, reason }]`

**Token cost:** ~500–800 tokens

---

### Step 8: Persist

**Status update:** `lore_pipeline_state.step = 'persist'`  
**Model:** None (DB writes only)

Writes:

- `trips.lore_json` ← full lore JSON
- `trips.lore_status = 'ready'`
- `trips.generation_cost_by_step` ← token counts per step
- `trips.lore_pipeline_state` ← step durations + trace_id
- `trips.lore_eval_json`, `trips.lore_needs_review`
- `trips.lore_prompt_version` ← `prompts.PROMPT_VERSION`
- `trips.chaos_score` ← `lore.cooked_level`
- `trip_members.role_title/role_description/role_chaos_rating/archetype` (per member)
- `trip_stats` rows

Then as **background tasks (non-blocking):**

- `_record_identity_snapshots()` → `user_identity_snapshots` upsert
- `_extract_incidents()` → `trip_incidents`, `evidence_gaps`, `recurring_references`
- `_update_social_graph()` → `relationship_dynamics`, `social_role_assignments`, `group_lore_os`
- Sets `memory_review_closes_at = now + 7 days` on trip
- `_notify_lore_ready()` → POST /api/notify/lore-ready → triggers push notifications
- `_enqueue_image_job()` → inserts `background_jobs {job_type: 'image_generation'}`

**CRITICAL:** These background tasks run AFTER `lore_status='ready'` is written to DB. The user's phone sees lore immediately. Background enrichment never blocks delivery.

---

## Total Token Budget Breakdown (Typical)

| Step                               | Model      | Tokens (approx)            |
| ---------------------------------- | ---------- | -------------------------- |
| Vision (4 batches × ~1,250)        | Sonnet 4.6 | ~5,000                     |
| Aggregation                        | Sonnet 4.6 | ~2,000                     |
| Core lore                          | Sonnet 4.6 | ~4,500                     |
| Quality eval                       | Haiku 4.5  | ~400                       |
| Character roles (6 members × ~800) | Haiku 4.5  | ~4,800                     |
| Receipt stats                      | Haiku 4.5  | ~600                       |
| Superlatives                       | Haiku 4.5  | ~700                       |
| Incident extraction (post-lore)    | Haiku 4.5  | ~2,048                     |
| **TOTAL**                          |            | **~20,000–22,000 typical** |

Hard budget ceiling: 60,000 tokens (not typically reached).

---

## Image Generation Pipeline (fal.ai Sana Sprint)

**Entry point:** `ai-worker/src/image_gen.py:generate_all_images(trip_id)`  
**Trigger:** Enqueued as `background_jobs {job_type: 'image_generation'}` after lore completes

Three generators run in parallel:

| Generator                        | Output                        | Storage Bucket                               | Format         |
| -------------------------------- | ----------------------------- | -------------------------------------------- | -------------- |
| `generate_trip_cover()`          | Cinematic landscape poster    | `trip-covers/{trip_id}/cover.png`            | 16:9 landscape |
| `generate_character_portraits()` | Per-member archetype art card | `trip-portraits/{trip_id}/{user_id}.png`     | Square         |
| `generate_era_thumbnails()`      | Chapter thumbnail per era     | `trip-era-thumbnails/{trip_id}/{era_id}.png` | 16:9 landscape |

**Prompt engineering:**

- Cover: destination + trip personality + chaos verdict → cinematic travel poster style
- Portraits: role title + chaos rating → abstract character art (no faces, no text)
- Era thumbnails: era name + timeframe + description → documentary scene still

**Settings:** 18 inference steps, 4.5 guidance scale, no people/faces/text in negative prompt

**Budget controls:**

- `claim_fal_budget_slot` RPC: atomic daily counter in `fal_budget` table
- `FAL_DAILY_BUDGET=200` (platform-wide)
- `FAL_TRIP_DAILY_LIMIT=2` (per-trip per day, in-memory)
- `FAL_MAX_ERAS=5` (max era thumbnails per trip)
- Idempotency: skip assets that already have URLs (unless `force=True`)

---

## Battle Judging Pipeline

**Entry point:** `LoreOrchestrator.judge_battle(battle_id)` (referenced but full implementation not shown in excerpts)  
**Trigger:** `background_jobs {job_type: 'judge_battle', payload: {battle_id}}`  
**Model:** Claude Sonnet 4.6

Reads both trip lore JSONs, generates a verdict picking the "winner" with reasoning.

---

## Yearly Wrap Pipeline

**Entry point:** `generate_yearly_wrap(trip_ids, user_id, year)` in `main.py`  
**Trigger:** HTTP `POST /generate-yearly-wrap` OR `background_jobs {job_type: 'yearly_wrap'}`  
**Model:** Claude Sonnet 4.6 (direct single-call, not full orchestrator)

Single-shot generation:

- Fetches all trip lore JSONs for the year
- One Claude call: returns `{ headline, chaos_average, trip_count, top_destination, year_verdict, era_title, superlative, chaos_tier }`
- Upserts into `yearly_wraps` table

---

## Photo Embedding Pipeline (CLIP)

**Entry point:** `ai-worker/src/embeddings.py:embed_photo(photo_id)`  
**Trigger:** `background_jobs {job_type: 'embed_photo', payload: {photo_id}}`  
**Service:** Voyage AI multimodal API (`VOYAGE_API_KEY`)

- Downloads photo from Supabase Storage
- Sends to Voyage AI for CLIP embedding
- Stores embedding in `photos` table (pgvector column)
- Updates `photos.embedding_status = 'complete'`
- If `VOYAGE_API_KEY` not set: silently skips

Powers: `find_similar_photos` RPC, nostalgia feed, similar public trips discovery.

---

## Trigger Mechanism Summary

```
Primary path (HTTP):
  Next.js tRPC → HMAC-signed POST → FastAPI /endpoint → BackgroundTask runs pipeline

Fallback path (DB queue):
  Next.js tRPC → INSERT generation_jobs/background_jobs row
  FastAPI poll_job_queue() / poll_background_jobs() → pick up within 60s
  Atomic claim with FOR UPDATE SKIP LOCKED (prevents double-processing)
```

---

## Error Handling Strategy

| Failure                          | Behavior                                                                 |
| -------------------------------- | ------------------------------------------------------------------------ |
| All vision batches fail          | Fabricated default signals → degraded lore quality (logged, not crashed) |
| Some vision batches fail         | Continue with partial data; `_partial_vision=True` in signals            |
| Lore generation fails            | Retry up to 3 times with error context injected                          |
| Quality gate retry fails         | Keep original lore (don't crash)                                         |
| Character role gen fails         | Default to "The Mysterious One"                                          |
| Individual enrichment step fails | Log warning; swallowed; other steps continue                             |
| Full pipeline crash              | `lore_status = 'failed'`, error written to `lore_error` JSONB            |
| Stuck pipeline (>30 min)         | `reset_stuck_pipelines()` marks failed; user can retry                   |
| Image gen fails                  | Silent skip; no retry; `fal.ai` logs only                                |
