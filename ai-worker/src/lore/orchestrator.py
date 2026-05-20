import asyncio
import json
import logging
import random
import re
import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any

import anthropic as _anthropic

from ..clients import supabase, anthropic_client
from ..config import settings
from . import prompts
from .validators import validate_lore_json, scan_forbidden_phrases


# ---------------------------------------------------------------------------
# Prompt injection defense
# ---------------------------------------------------------------------------

def sanitize_for_prompt(value: str, max_length: int = 200) -> str:
    """Strip prompt injection attempts from user-supplied strings.

    Applies six layers of defense:
    1. Truncation to max_length.
    2. Unicode normalization — converts lookalike characters to ASCII equivalents.
    3. XML/HTML tag stripping — prevents tag-based injection.
    4. Instruction keyword removal — covers exact, spaced, and hyphenated variants.
    5. Base64 detection — removes embedded base64 strings (common injection vector).
    6. Newline/carriage return collapse — prevents injected prompt turns.
    """
    if not value:
        return ""

    # 1. Truncate before any processing to limit attack surface
    value = value[:max_length]

    # 2. Unicode normalization: NFKC maps lookalike codepoints to canonical ASCII.
    #    Covers: ı→i (Turkish dotless i), ᴏ→o (small caps), ℐ→I, etc.
    import unicodedata
    value = unicodedata.normalize("NFKC", value)

    # 3. Remove XML/HTML tags (including nested and malformed variants)
    value = re.sub(r'<\s*/?[a-zA-Z][^>]*>', '[removed]', value)
    # Also remove CDATA sections and processing instructions
    value = re.sub(r'<!\[CDATA\[.*?\]\]>', '[removed]', value, flags=re.DOTALL)

    # 4. Instruction keyword removal.
    #    Covers: exact ("ignore"), spaced ("i g n o r e"), hyphenated ("i-g-n-o-r-e").
    #    The separator-variant pattern allows any non-alpha character between letters.
    _INJECTION_KEYWORDS = [
        "ignore", "disregard", "forget", "override", "bypass", "jailbreak",
        "system prompt", "systemprompt", "developer mode", "devmode",
        "do anything now", "dan", "act as", "pretend", "roleplay",
        "you are now", "new instructions", "initial instructions",
    ]
    for kw in _INJECTION_KEYWORDS:
        # Exact word boundary match (case-insensitive)
        value = re.sub(rf'(?i)\b{re.escape(kw)}\b', '[removed]', value)
        # Separator injection: letters of keyword separated by non-alpha chars (e.g. "i-g-n-o-r-e")
        if len(kw) > 3 and " " not in kw:
            spaced_pattern = r'[^a-zA-Z0-9]?'.join(re.escape(c) for c in kw)
            value = re.sub(rf'(?i){spaced_pattern}', '[removed]', value)

    # 5. Base64 detection — remove long base64-looking strings (potential encoded instructions)
    #    Base64 strings are 20+ chars of [A-Za-z0-9+/=]
    value = re.sub(r'[A-Za-z0-9+/]{20,}={0,2}', '[removed]', value)

    # 6. Collapse all whitespace variants that could break prompt structure
    value = value.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
    # Collapse multiple spaces into one
    value = re.sub(r'  +', ' ', value)

    return value.strip()

log = logging.getLogger("wwt.lore")


# ---------------------------------------------------------------------------
# Phase 2: Error taxonomy
# ---------------------------------------------------------------------------

class FailoverReason(str, Enum):
    RATE_LIMIT     = "rate_limit"
    OVERLOAD       = "overload"
    TIMEOUT        = "timeout"
    CONNECTION     = "connection"
    CONTENT_POLICY = "content_policy"
    UNKNOWN        = "unknown"


class LoreApiError(Exception):
    def __init__(self, reason: FailoverReason, original: Exception, step: str):
        super().__init__(f"LoreApiError({reason}, step={step}): {original}")
        self.reason   = reason
        self.original = original
        self.step     = step


def classify_api_error(exc: Exception) -> FailoverReason:
    if isinstance(exc, _anthropic.RateLimitError):
        return FailoverReason.RATE_LIMIT
    if isinstance(exc, _anthropic.InternalServerError):
        return FailoverReason.OVERLOAD
    if isinstance(exc, _anthropic.APITimeoutError):
        return FailoverReason.TIMEOUT
    if isinstance(exc, _anthropic.APIConnectionError):
        return FailoverReason.CONNECTION
    return FailoverReason.UNKNOWN


# ---------------------------------------------------------------------------
# Phase 2: Rate limiter + budget
# ---------------------------------------------------------------------------

class PipelineRateLimiter:
    """Global semaphore — limits concurrent LLM calls across all pipeline instances."""
    def __init__(self, max_concurrent: int = 8):
        self._sem = asyncio.Semaphore(max_concurrent)

    async def __aenter__(self):
        await self._sem.acquire()
        return self

    async def __aexit__(self, *_):
        self._sem.release()


class PipelineBudget:
    """Hard token ceiling for one pipeline run. Raises before a call that would exceed it."""
    def __init__(self, max_tokens: int = 60_000):
        self._max  = max_tokens
        self._used = 0

    def check(self, step: str, requested: int):
        if self._used + requested > self._max:
            raise RuntimeError(
                f"[budget] step={step} would exceed limit: "
                f"used={self._used} + requested={requested} > max={self._max}"
            )

    def record(self, tokens: int):
        self._used += tokens

    @property
    def used(self) -> int:
        return self._used


# ---------------------------------------------------------------------------
# Phase 3: Lore quality evaluator
# ---------------------------------------------------------------------------

_EVAL_SYSTEM = """You are a lore quality evaluator for a Gen Z travel app called Yaarlore.
Score the given lore summary on five dimensions (0.0–1.0 each):
- specificity: Are events, moments, and behaviors specific to THIS trip, or generic?
- coherence: Do the narrative arc, eras, and character roles form a consistent story?
- tone: Is it the right balance of chaotic, warm, and roasty — not corporate, not cringe?
- differentiation: Could this lore be mistaken for another trip's, or is it unmistakably unique?
- schema_completeness: Are all required fields present with real content (no placeholders)?

Return ONLY valid JSON — no markdown, no preamble:
{"scores": {"specificity": 0.0, "coherence": 0.0, "tone": 0.0, "differentiation": 0.0, "schema_completeness": 0.0}, "overall": 0.0, "weakest_dimension": "...", "feedback": "one sentence on the biggest gap"}"""


class LoreEvaluator:
    """Lightweight Haiku-based quality scorer for generated lore."""

    async def evaluate(self, trip_id: str, lore: dict) -> dict:
        prompt = (
            f"Trip title: {lore.get('trip_title', '')} | "
            f"Tagline: {lore.get('tagline', '')} | "
            f"Cooked level: {lore.get('cooked_level', 0)}/100 | "
            f"Cooked verdict: {lore.get('cooked_verdict', '')} | "
            f"Narrative excerpt: {str(lore.get('season_recap', {}).get('full_narrative', ''))[:600]} | "
            f"Era names: {json.dumps([e.get('era_name') for e in lore.get('trip_eras', [])])} | "
            f"Core memory: {lore.get('trip_lore_awards', {}).get('core_memory', '')} | "
            f"Trip personality: {lore.get('trip_personality_type', '')}"
        )
        try:
            response = await anthropic_client.messages.create(
                model=settings.CLAUDE_HAIKU_MODEL,
                max_tokens=400,
                system=_EVAL_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            start = raw.find("{")
            result = json.loads(raw[start:] if start >= 0 else raw)
            scores = result.get("scores", {})
            if "overall" not in result and scores:
                result["overall"] = round(sum(scores.values()) / len(scores), 3)
            return result
        except Exception as e:
            log.error(f"[{trip_id}] LoreEvaluator failed: {e}")
            return {
                "scores": {},
                "overall": None,  # None = evaluator failed, not a real score
                "sampled": False,
                "error": str(e)[:200],
                "evaluation_failed": True,
            }


# ---------------------------------------------------------------------------
# Module-level singletons shared across all orchestrator instances
# ---------------------------------------------------------------------------

_GLOBAL_RATE_LIMITER = PipelineRateLimiter(max_concurrent=8)
_ACTIVE_RUNS: set[str] = set()


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

class LoreOrchestrator:
    """Full lore generation pipeline.

    Steps:
      1. Fetch trip + photos + members
      2. Vision analysis in parallel batches (real Claude vision calls)
      3. Signal aggregation (with context size guard)
      4. Core lore generation (with validation + quality gate)
      5. Per-member character roles (parallel)
      6. Receipt stats
      7. Superlatives
      8. Persist everything to Supabase
    """

    def __init__(self):
        self._step_tokens: dict[str, int] = {}
        # OBS-02: per-step start/end timestamps for pipeline duration tracking.
        # Populated by _update_pipeline_state and written to lore_pipeline_state at completion.
        self._step_timings: dict[str, dict[str, str]] = {}
        self._rate_limiter = _GLOBAL_RATE_LIMITER
        self._budget: PipelineBudget | None = None
        self._current_step: str = "init"

    # -------------------------------------------------------------------------
    # Public: main pipeline entry point
    # -------------------------------------------------------------------------

    async def run_full_pipeline(self, trip_id: str):
        trace_id = str(uuid.uuid4())
        self._budget = PipelineBudget(max_tokens=60_000)
        self._current_step = "init"

        log.info(f"[{trip_id}][{trace_id}] pipeline start — model={settings.CLAUDE_MODEL} proxy={bool(settings.ANTHROPIC_BASE_URL)}")

        if trip_id in _ACTIVE_RUNS:
            log.info(f"[{trip_id}][{trace_id}] skipping — already processing this trip_id in-flight in this worker")
            return

        _ACTIVE_RUNS.add(trip_id)
        try:
            try:
                # Idempotency guard: skip only if already completed
                current = supabase.table("trips").select("lore_status").eq("id", trip_id).single().execute().data
                if current and current.get("lore_status") == "ready":
                    log.info(f"[{trip_id}][{trace_id}] skipping — lore_status is already ready")
                    return

                supabase.table("trips").update({
                    "lore_status": "processing",
                    "lore_trace_id": trace_id,
                    "processing_started_at": datetime.now(timezone.utc).isoformat(),
                }).eq("id", trip_id).execute()

            # Step 1: fetch
            self._update_pipeline_state(trip_id, "fetch", "running")
            self._current_step = "fetch"
            import asyncio as _asyncio
            trip, photos, members = await _asyncio.gather(
                _asyncio.to_thread(self._get_trip, trip_id),
                _asyncio.to_thread(self._get_photos, trip_id),
                _asyncio.to_thread(self._get_members, trip_id),
            )
            self._update_pipeline_state(trip_id, "fetch", "done")
            log.info(f"[{trip_id}][{trace_id}] fetched: {len(photos)} photos, {len(members)} members")
            member_user_ids = [m["user_id"] for m in members if m.get("user_id")]

            if trip and len(photos) != trip.get("total_photos", 0):
                supabase.table("trips").update({"total_photos": len(photos), "member_count": len(members)}).eq("id", trip_id).execute()
                trip["total_photos"] = len(photos)
                trip["member_count"] = len(members)

            photo_count = len(photos)
            LOW_PHOTO_THRESHOLD = 8

            if photo_count < 5:
                log.warning(f"[{trip_id}][{trace_id}] only {photo_count} photos — need 5+")
                supabase.table("trips").update({"lore_status": "failed"}).eq("id", trip_id).execute()
                return

            low_confidence = photo_count < LOW_PHOTO_THRESHOLD
            if low_confidence:
                log.info(
                    f"[{trip_id}][{trace_id}] low-confidence mode: {photo_count} photos "
                    f"(threshold={LOW_PHOTO_THRESHOLD})"
                )

            # Step 2: structural signals + vision in parallel
            self._update_pipeline_state(trip_id, "vision", "running")
            self._current_step = "vision"
            signals_task = _asyncio.to_thread(self._compute_trip_signals, trip, photos, members)
            vision_task  = self._analyze_photo_batches(trip, photos)
            trip_signals, batch_signals = await _asyncio.gather(signals_task, vision_task)
            self._update_pipeline_state(trip_id, "vision", "done")

            try:
                supabase.table("trips").update({"trip_signals": trip_signals}).eq("id", trip_id).execute()
            except Exception:
                pass  # trip_signals column may not exist on older schemas

            log.info(f"[{trip_id}][{trace_id}] signals: {trip_signals.get('cluster_count')} scenes, "
                     f"diversity={trip_signals.get('contributor_diversity')}, "
                     f"night={trip_signals.get('night_photo_count')}")

            # Step 3: aggregate
            self._update_pipeline_state(trip_id, "aggregate", "running")
            self._current_step = "aggregate"
            aggregated = await self._aggregate_signals(trip, batch_signals, members, trip_signals)
            self._update_pipeline_state(trip_id, "aggregate", "done")

            # Step 4: core lore + quality gate
            self._update_pipeline_state(trip_id, "lore", "running")
            self._current_step = "lore"
            confessions = self._get_confessions(trip_id)

            # Fetch callback context — past mythology from this group.
            # Injected into the lore prompt for returning groups so the AI
            # can reference past incidents and recurring patterns.
            # Non-blocking: empty string if first trip or fetch fails.
            callback_context = await self._get_callback_context(trip_id, member_user_ids)

            lore = await self._generate_lore_with_retry(
                trip, aggregated, confessions,
                low_confidence=low_confidence,
                callback_context=callback_context
            )
            lore, eval_result, retry_meta = await self._quality_gate(trip, aggregated, confessions, lore, low_confidence=low_confidence)
            self._update_pipeline_state(trip_id, "lore", "done")

            # Steps 5-7: parallel enrichment
            self._update_pipeline_state(trip_id, "enrichment", "running")
            self._current_step = "enrichment"
            roles_task        = self._generate_all_roles(trip, lore, members, aggregated, confessions)
            stats_task        = self._generate_receipt_stats(trip, lore, aggregated)
            superlatives_task = self._generate_superlatives(lore, members, confessions)

            roles, stats, superlatives = await asyncio.gather(
                roles_task, stats_task, superlatives_task,
                return_exceptions=True,
            )
            self._update_pipeline_state(trip_id, "enrichment", "done")

            if isinstance(superlatives, list):
                lore["superlatives"] = superlatives
            if isinstance(stats, dict):
                lore["receipt_stats"]   = stats.get("receipt_stats", [])
                lore["receipt_rating"]  = stats.get("receipt_rating", "★★★★★")
                lore["receipt_review"]  = stats.get("receipt_review", "")

            # Step 8: persist
            self._update_pipeline_state(trip_id, "persist", "running")
            self._current_step = "persist"
            self._save_lore(trip_id, lore)
            if not isinstance(roles, Exception):
                self._save_roles(trip_id, roles)
            if not isinstance(stats, Exception):
                self._save_stats(trip_id, stats.get("receipt_stats", []) if isinstance(stats, dict) else [])

            # Mark persist step done before final write
            persist_end = datetime.now(timezone.utc).isoformat()
            if "persist" in self._step_timings:
                self._step_timings["persist"]["end_time"] = persist_end

            total_tokens = sum(self._step_tokens.values())

            # OBS-02: build per-step duration summary for lore_pipeline_state.
            # Each step entry has start_time, end_time, and duration_seconds.
            step_durations: dict[str, Any] = {}
            for sname, timing in self._step_timings.items():
                entry: dict[str, Any] = {"start_time": timing.get("start_time")}
                end_t = timing.get("end_time")
                if end_t:
                    entry["end_time"] = end_t
                    try:
                        from datetime import datetime as _dt
                        start_dt = _dt.fromisoformat(timing["start_time"].replace("Z", "+00:00"))
                        end_dt   = _dt.fromisoformat(end_t.replace("Z", "+00:00"))
                        entry["duration_seconds"] = round((end_dt - start_dt).total_seconds(), 2)
                    except Exception:
                        pass
                step_durations[sname] = entry

            # OBS-04: generation_cost_by_step already holds token counts per step;
            # merge them into step_durations so Langfuse traces surface both
            # timing and token cost in a single JSONB column.
            for sname, tokens in self._step_tokens.items():
                if sname in step_durations:
                    step_durations[sname]["tokens"] = tokens
                else:
                    step_durations[sname] = {"tokens": tokens}

            update_payload: dict[str, Any] = {
                "lore_status": "ready",
                "generation_cost_by_step": self._step_tokens,
                "lore_pipeline_state": {
                    "step": "complete",
                    "status": "done",
                    "trace_id": trace_id,
                    "step_durations": step_durations,
                },
                "lore_eval_json": eval_result,
                "lore_prompt_version": prompts.PROMPT_VERSION,
                # overall=None means the evaluator itself crashed — don't flag for review,
                # since we have no signal to act on.  Only flag when a real score is low.
                "lore_needs_review": (
                    eval_result.get("overall") is not None
                    and eval_result["overall"] < 0.55
                ),
            }
            if total_tokens > 0:
                update_payload["generation_cost_tokens"] = total_tokens
            # Merge retry metadata if a quality retry fired — empty dict is a no-op
            update_payload.update(retry_meta)
            supabase.table("trips").update(update_payload).eq("id", trip_id).execute()
            log.info(
                f"[{trip_id}][{trace_id}] pipeline complete — tokens={total_tokens} "
                f"by_step={self._step_tokens} durations={step_durations} "
                f"prompt_version={prompts.PROMPT_VERSION}"
            )

            # Notify trip creator by email — non-blocking, never crashes the pipeline
            self._notify_lore_ready(trip_id)

            # Phase 2: durable image generation job (no fire-and-forget asyncio.create_task)
            self._enqueue_image_job(trip_id, trace_id)

            # ── Post-processing: ALL steps run as background tasks ────────────
            # CRITICAL: These must NOT block lore delivery. The user's phone
            # is waiting for lore_status='ready'. Every second of post-processing
            # feels like the product is broken. Fire-and-forget all enrichment.
            #
            # The lore is already written to the DB above (lore_status='ready').
            # These tasks enrich the data model — they are not user-facing delays.

            async def _run_enrichment():
                """All post-generation enrichment in background — never blocks lore delivery."""
                try:
                    self._record_identity_snapshots(trip_id, lore)
                except Exception as e:
                    log.warning(f"[{trip_id}] identity snapshots failed: {e}")
                try:
                    await self._extract_incidents(trip_id, lore, trip)
                except Exception as e:
                    log.warning(f"[{trip_id}] incident extraction failed: {e}")
                try:
                    await self._update_social_graph(trip_id, lore)
                except Exception as e:
                    log.warning(f"[{trip_id}] social graph update failed: {e}")
                try:
                    from datetime import timedelta
                    review_deadline = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
                    supabase.table("trips").update({
                        "memory_review_closes_at": review_deadline
                    }).eq("id", trip_id).execute()
                except Exception as e:
                    log.warning(f"[{trip_id}] memory review window failed: {e}")

            # Schedule enrichment as a background task — returns immediately
            asyncio.create_task(_run_enrichment())

            except Exception as e:
                log.exception(f"[{trip_id}][{trace_id}] pipeline failed at step={self._current_step}: {e}")
                supabase.table("trips").update({
                    "lore_status": "failed",
                    "lore_error": {
                        "step": self._current_step,
                        "message": str(e)[:1000],
                        "trace_id": trace_id,
                    },
                    "lore_pipeline_state": {
                        "step": self._current_step,
                        "status": "failed",
                        "trace_id": trace_id,
                    },
                }).eq("id", trip_id).execute()
                raise
        finally:
            _ACTIVE_RUNS.discard(trip_id)

    # -------------------------------------------------------------------------
    # Retention Machine: identity snapshots
    # -------------------------------------------------------------------------

    async def _extract_incidents(self, trip_id: str, lore: dict, trip: dict) -> None:
        """Extract structured incidents from the generated lore using Haiku.

        Produces: trip_incidents, evidence_gaps, recurring_references records.
        These power the explorable incident log — discrete, navigable memory records
        instead of a single consumable narrative blob.

        Architecture: Uses Haiku (cheap) because it's extraction not generation.
        Non-fatal: any failure is logged and swallowed.
        """
        try:
            # Build a summarized lore input (avoid sending the entire lore JSON)
            lore_summary = {
                "trip_title": lore.get("trip_title", ""),
                "opening_line": lore.get("opening_line", ""),
                "full_narrative": lore.get("season_recap", {}).get("full_narrative", ""),
                "eras": [
                    {"name": e.get("era_name"), "timeframe": e.get("timeframe"), "defining_moment": e.get("defining_moment")}
                    for e in (lore.get("trip_eras") or [])
                ],
                "core_memory": lore.get("trip_lore_awards", {}).get("core_memory", ""),
                "chaos_source": lore.get("friendship_dynamics", {}).get("chaos_source", ""),
                "what_really_about": lore.get("what_this_trip_was_really_about", ""),
            }
            lore_summary_str = json.dumps(lore_summary, indent=2)[:3000]  # cap for token budget

            prompt = prompts.INCIDENT_EXTRACTION_USER.format(
                trip_name=trip.get("name", ""),
                destination=trip.get("destination", ""),
                duration_days=(trip.get("duration_days") or 3),
                lore_json_summary=lore_summary_str,
            )

            response = await anthropic_client.messages.create(
                model=settings.CLAUDE_HAIKU_MODEL,
                max_tokens=2048,
                system=prompts.INCIDENT_EXTRACTION_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )

            raw = response.content[0].text
            # Strip any accidental markdown fences
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

            extracted = json.loads(raw)

            # Persist incidents
            incidents = extracted.get("incidents") or []
            for inc in incidents:
                try:
                    supabase.table("trip_incidents").insert({
                        "trip_id": trip_id,
                        "incident_ref": inc.get("incident_ref", "INC-?"),
                        "title": inc.get("title", "Unnamed incident"),
                        "timeframe": inc.get("timeframe"),
                        "confidence": inc.get("confidence", "INFERRED"),
                        "verified_facts": inc.get("verified_facts") or [],
                        "inferred_elements": inc.get("inferred_elements") or [],
                        "unknown_elements": inc.get("unknown_elements") or [],
                        "participant_names": inc.get("participant_names") or [],
                        "is_contested": bool(inc.get("is_contested", False)),
                        "callback_potential": inc.get("callback_potential", "LOW"),
                        "mythology_status": "contested" if inc.get("is_contested") else "pending",
                        "investigator_note": inc.get("investigator_note"),
                    }).execute()
                except Exception as e:
                    log.warning(f"[{trip_id}] failed to insert incident {inc.get('incident_ref')}: {e}")

            # Persist evidence gaps
            gaps = extracted.get("evidence_gaps") or []
            for gap in gaps:
                try:
                    supabase.table("evidence_gaps").insert({
                        "trip_id": trip_id,
                        "gap_ref": gap.get("gap_ref", "GAP-?"),
                        "timeframe": gap.get("timeframe", ""),
                        "what_we_know": gap.get("what_we_know"),
                        "what_we_dont": gap.get("what_we_dont", ""),
                        "significance": gap.get("significance", "LOW"),
                    }).execute()
                except Exception as e:
                    log.warning(f"[{trip_id}] failed to insert gap {gap.get('gap_ref')}: {e}")

            # Persist recurring references
            refs = extracted.get("recurring_references") or []
            for ref in refs:
                if not ref.get("phrase"):
                    continue
                try:
                    supabase.table("recurring_references").insert({
                        "origin_trip_id": trip_id,
                        "phrase": ref.get("phrase", ""),
                        "context": ref.get("context"),
                        "activation_condition": ref.get("activation_condition"),
                    }).execute()
                except Exception as e:
                    log.warning(f"[{trip_id}] failed to insert recurring ref: {e}")

            log.info(
                f"[{trip_id}] incident extraction complete: "
                f"{len(incidents)} incidents, {len(gaps)} gaps, {len(refs)} refs"
            )

        except Exception as e:
            log.warning(f"[{trip_id}] incident extraction failed (non-blocking): {e}")

    def _record_identity_snapshots(self, trip_id: str, lore: dict) -> None:
        """After lore is finalised, write one identity snapshot per trip member.

        This is the cross-trip behavioral data layer — the platform moat.
        After N trips, each user has a longitudinal behavioral record that
        enables: character arc updates, 'who changed?' engine, dispute history,
        pre-trip prophecies, and archetype evolution tracking.

        Non-fatal: any failure here is logged but never surfaces to the user.
        """
        try:
            # Fetch trip members with their current character role data
            members_result = supabase.table("trip_members") \
                .select("id, user_id, role_title, role_description, role_chaos_rating, archetype") \
                .eq("trip_id", trip_id) \
                .execute()

            members = members_result.data or []
            if not members:
                return

            snapshots = []
            for m in members:
                user_id = m.get("user_id")
                if not user_id:
                    continue

                archetype = m.get("archetype") or "Unknown"
                chaos_rating = m.get("role_chaos_rating") or 5
                role_title = m.get("role_title") or ""

                # Extract signature behavior from lore if available
                signature_behavior = None
                if lore.get("superlatives"):
                    for sup in lore["superlatives"]:
                        if sup.get("winner_user_id") == user_id:
                            signature_behavior = sup.get("question", "")[:200]
                            break

                snapshots.append({
                    "user_id": user_id,
                    "trip_id": trip_id,
                    "archetype": archetype,
                    "chaos_rating": min(10, max(0, int(chaos_rating))),
                    "role_title": role_title[:200] if role_title else None,
                    "signature_behavior": signature_behavior,
                })

            if snapshots:
                # ON CONFLICT (user_id, trip_id) DO UPDATE — idempotent
                supabase.table("user_identity_snapshots").upsert(
                    snapshots,
                    on_conflict="user_id,trip_id"
                ).execute()

                log.info(f"[{trip_id}] recorded {len(snapshots)} identity snapshots")

            # Also emit a group pulse event so the home feed updates
            member_ids = [m["user_id"] for m in members if m.get("user_id")]
            if member_ids:
                supabase.table("group_pulse_events").insert({
                    "trip_id": trip_id,
                    "event_type": "lore_generated",
                    "actor_user_id": None,
                    "payload": {
                        "chaos_score": lore.get("cooked_level"),
                        "verdict": lore.get("cooked_verdict"),
                        "tagline": (lore.get("tagline") or "")[:100],
                    },
                    "visible_to": member_ids,
                }).execute()

        except Exception as e:
            # Non-fatal — identity snapshots are additive, not blocking
            log.warning(f"[{trip_id}] identity snapshot recording failed (non-blocking): {e}")

    # -------------------------------------------------------------------------
    # Social Graph: relationship dynamics + Group Lore OS update
    # -------------------------------------------------------------------------

    async def _update_social_graph(self, trip_id: str, lore: dict) -> None:
        """Build relationship dynamics between all member pairs and update the
        Group Lore OS — the living mythology document for this friend group.

        This is the long-term defensibility layer: after 5 years, these tables
        contain the documented behavioral history of specific human relationships
        that cannot be reproduced without the full trip history.

        Non-fatal — any failure is logged and swallowed.
        """
        try:
            # Fetch members with their role/archetype data
            members_result = supabase.table("trip_members") \
                .select("user_id, role_title, role_chaos_rating, archetype") \
                .eq("trip_id", trip_id) \
                .execute()
            members = members_result.data or []
            if len(members) < 2:
                return  # Need at least 2 people for relationship dynamics

            member_ids = [m["user_id"] for m in members if m.get("user_id")]

            # ── 1. Build pairwise relationship dynamics ────────────────────
            pairs_inserted = 0
            for i, m_a in enumerate(members):
                for j, m_b in enumerate(members):
                    if j <= i:
                        continue  # canonical ordering: user_a < user_b
                    uid_a = m_a.get("user_id")
                    uid_b = m_b.get("user_id")
                    if not uid_a or not uid_b:
                        continue

                    # Ensure canonical ordering
                    if uid_a > uid_b:
                        uid_a, uid_b = uid_b, uid_a
                        m_a, m_b = m_b, m_a

                    chaos_a = m_a.get("role_chaos_rating") or 5
                    chaos_b = m_b.get("role_chaos_rating") or 5
                    chaos_delta = abs(chaos_a - chaos_b)

                    arch_a = (m_a.get("archetype") or "").lower()
                    arch_b = (m_b.get("archetype") or "").lower()
                    if arch_a == arch_b and arch_a:
                        similarity = "same"
                    elif arch_a and arch_b:
                        similarity = "complementary"  # simplified; AI could refine
                    else:
                        similarity = "unknown"

                    try:
                        supabase.table("relationship_dynamics").upsert({
                            "user_a": uid_a,
                            "user_b": uid_b,
                            "trip_id": trip_id,
                            "chaos_delta": chaos_delta,
                            "archetype_similarity": similarity,
                        }, on_conflict="user_a,user_b,trip_id").execute()
                        pairs_inserted += 1
                    except Exception as e:
                        log.warning(f"[{trip_id}] rel dynamics insert failed for {uid_a}/{uid_b}: {e}")

            # ── 2. Assign social roles based on lore evidence ──────────────
            roles_to_insert = []
            chaos_source = lore.get("friendship_dynamics", {}).get("chaos_source", "")
            emotional_center = lore.get("friendship_dynamics", {}).get("emotional_center", "")
            villain = (lore.get("trip_lore_awards") or {}).get("trip_villain", "")
            mvp = (lore.get("trip_lore_awards") or {}).get("trip_mvp", "")

            for m in members:
                uid = m.get("user_id")
                if not uid:
                    continue
                name = (m.get("role_title") or "").lower()
                chaos = m.get("role_chaos_rating") or 5

                # Assign roles based on chaos rating and lore context
                if chaos >= 8:
                    roles_to_insert.append({"trip_id": trip_id, "user_id": uid, "role_type": "chaos_initiator", "confidence": 0.9})
                if chaos <= 3:
                    roles_to_insert.append({"trip_id": trip_id, "user_id": uid, "role_type": "social_glue", "confidence": 0.8})
                if m.get("archetype") and "camera" in m.get("archetype", "").lower():
                    roles_to_insert.append({"trip_id": trip_id, "user_id": uid, "role_type": "documenter", "confidence": 0.85})

            for role in roles_to_insert:
                try:
                    supabase.table("social_role_assignments").upsert(
                        role, on_conflict="trip_id,user_id,role_type"
                    ).execute()
                except Exception:
                    pass  # Non-fatal

            # ── 3. Update Group Lore OS ────────────────────────────────────
            # Find or create the Group Lore OS for this member set
            sorted_ids = sorted(member_ids)
            group_hash = await asyncio.to_thread(
                lambda: supabase.rpc("canonical_group_hash", {"member_ids": sorted_ids}).execute()
            )
            hash_val = group_hash.data if group_hash else None

            if hash_val:
                # Fetch existing OS
                existing = await asyncio.to_thread(
                    lambda: supabase.table("group_lore_os")
                        .select("id, mythology_state, trip_count")
                        .eq("group_hash", hash_val)
                        .maybeSingle()
                        .execute()
                )

                existing_record = existing.data if existing else None

                # Build updated mythology state snippet
                current_state = (existing_record or {}).get("mythology_state") or {}
                current_incidents = current_state.get("canon_incidents") or []

                # Add this trip's high-callback incidents
                high_cb_incidents = await asyncio.to_thread(
                    lambda: supabase.table("trip_incidents")
                        .select("incident_ref, title, callback_potential, invocation_count")
                        .eq("trip_id", trip_id)
                        .in_("callback_potential", ["HIGH"])
                        .execute()
                )

                new_incidents = [
                    {"ref": i["incident_ref"], "title": i["title"], "trip_id": trip_id}
                    for i in (high_cb_incidents.data or [])
                ]
                all_incidents = current_incidents + new_incidents

                # Upsert Group Lore OS — group_hash must be in payload for ON CONFLICT to match
                upsert_payload = {
                    "group_hash": hash_val,
                    "canonical_members": sorted_ids,
                    "last_trip_id": trip_id,
                    "trip_count": (existing_record or {}).get("trip_count", 0) + 1,
                    "mythology_state": {
                        **current_state,
                        "canon_incidents": all_incidents[-20:],  # keep most recent 20
                        "era_current": lore.get("trip_personality_type", ""),
                        "mythology_arc": lore.get("what_this_trip_was_really_about", ""),
                    },
                    "last_updated": datetime.now(timezone.utc).isoformat(),
                }
                await asyncio.to_thread(
                    lambda: supabase.table("group_lore_os")
                        .upsert(upsert_payload, on_conflict="group_hash")
                        .execute()
                )

            log.info(
                f"[{trip_id}] social graph updated: "
                f"{pairs_inserted} pairs, {len(roles_to_insert)} roles"
            )

        except Exception as e:
            log.warning(f"[{trip_id}] social graph update failed (non-blocking): {e}")

    async def _get_callback_context(self, trip_id: str, member_ids: list[str]) -> str:
        """Fetch callback context for lore generation — past incidents + recurring
        references from this group's mythology history.

        Returns a formatted string injected into the lore generation prompt.
        Empty string if this is the group's first trip together.
        """
        try:
            # Find past trips where a majority of these members were together
            # (any trip where at least 2/3 of current members were present)
            min_overlap = max(2, len(member_ids) * 2 // 3)

            # Get all trip_ids these members have been on
            trip_member_rows = await asyncio.to_thread(
                lambda: supabase.table("trip_members")
                    .select("trip_id, user_id")
                    .in_("user_id", member_ids)
                    .neq("trip_id", trip_id)
                    .execute()
            )

            # Count overlap per trip
            from collections import Counter
            trip_overlaps = Counter(row["trip_id"] for row in (trip_member_rows.data or []))
            shared_trips = [t for t, count in trip_overlaps.items() if count >= min_overlap]

            if not shared_trips:
                return ""  # First trip together

            # Fetch high-callback incidents from shared trips
            incidents = await asyncio.to_thread(
                lambda: supabase.table("trip_incidents")
                    .select("incident_ref, title, investigator_note, callback_potential, invocation_count")
                    .in_("trip_id", shared_trips)
                    .in_("callback_potential", ["HIGH", "MEDIUM"])
                    .order("invocation_count", desc=True)
                    .limit(5)
                    .execute()
            )

            # Fetch recurring references
            refs = await asyncio.to_thread(
                lambda: supabase.table("recurring_references")
                    .select("phrase, context, activation_condition")
                    .in_("origin_trip_id", shared_trips)
                    .order("invocation_count", desc=True)
                    .limit(5)
                    .execute()
            )

            incidents_data = incidents.data or []
            refs_data = refs.data or []

            if not incidents_data and not refs_data:
                return ""

            ctx = "\n\nCALLBACK CONTEXT — This group's documented mythology (use if applicable):\n"

            if incidents_data:
                ctx += "\nPast incidents with callback potential:\n"
                for inc in incidents_data:
                    note = (inc.get("investigator_note") or "")[:80]
                    ctx += f"  • [{inc['incident_ref']}] \"{inc['title']}\" — {note}\n"
                ctx += "\nIf this trip echoes any of these patterns, reference them explicitly.\n"
                ctx += "A callback must be genuinely applicable — do not force it.\n"

            if refs_data:
                ctx += "\nRecurring group vocabulary:\n"
                for ref in refs_data:
                    ctx += f"  • \"{ref['phrase']}\" (from: {ref['context'][:60]}) — invoke when: {ref['activation_condition']}\n"

            return ctx

        except Exception as e:
            log.warning(f"callback context fetch failed (non-blocking): {e}")
            return ""

    # -------------------------------------------------------------------------
    # Lore-ready notification — fires after status is written to Supabase
    # -------------------------------------------------------------------------

    def _notify_lore_ready(self, trip_id: str) -> None:
        """Schedule a non-blocking POST to Next.js /api/notify/lore-ready.

        Fires as an asyncio background task so it never stalls the pipeline.
        Any exception is logged and swallowed.
        """
        base_url = settings.NEXTJS_BASE_URL.rstrip("/")
        if not base_url:
            log.debug(f"[{trip_id}] NEXTJS_BASE_URL not set — skipping lore-ready notification")
            return

        async def _post():
            import httpx
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.post(
                        f"{base_url}/api/notify/lore-ready",
                        json={"trip_id": trip_id},
                        headers={"Authorization": f"Bearer {settings.AI_WORKER_SECRET}"},
                    )
                    log.info(f"[{trip_id}] lore-ready notification sent — status={resp.status_code}")
            except Exception as exc:
                log.warning(f"[{trip_id}] lore-ready notification failed (non-fatal): {exc}")

        asyncio.create_task(_post())

    # -------------------------------------------------------------------------
    # Phase 1 / OBS-02: Pipeline state tracking with per-step timestamps
    # -------------------------------------------------------------------------

    def _update_pipeline_state(self, trip_id: str, step: str, status: str):
        """Update lore_pipeline_state for real-time UI polling and step duration tracking.

        OBS-02: records start_time when status='running' and end_time when
        status='done' or 'failed', storing both in self._step_timings so
        the final lore_pipeline_state write at pipeline completion includes
        full per-step duration data.
        """
        now = datetime.now(timezone.utc).isoformat()

        if status == "running":
            self._step_timings[step] = {"start_time": now}
        elif status in ("done", "failed"):
            timing = self._step_timings.get(step, {})
            timing["end_time"] = now
            self._step_timings[step] = timing

        try:
            supabase.table("trips").update({
                "lore_pipeline_state": {
                    "step": step,
                    "status": status,
                    "updated_at": now,
                },
            }).eq("id", trip_id).execute()
        except Exception as upd_err:
            log.warning(f"[{trip_id}] pipeline state update failed: {upd_err}")

    # -------------------------------------------------------------------------
    # Phase 1: Stuck pipeline recovery
    # -------------------------------------------------------------------------

    @staticmethod
    async def reset_stuck_pipelines():
        """Find trips stuck in 'processing' for >30 min and mark them failed."""
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        try:
            result = await asyncio.to_thread(
                lambda: supabase.table("trips")
                    .select("id, processing_started_at")
                    .eq("lore_status", "processing")
                    .lt("processing_started_at", cutoff)
                    .execute()
            )
            stuck = result.data or []
            for t in stuck:
                log.warning(f"[{t['id']}] resetting stuck pipeline (started={t.get('processing_started_at')})")
                await asyncio.to_thread(
                    lambda tid=t["id"]: supabase.table("trips").update({
                        "lore_status": "failed",
                        "lore_error": {"step": "stuck", "message": "pipeline exceeded 30-minute timeout"},
                    }).eq("id", tid).execute()
                )
            if stuck:
                log.info(f"reset_stuck_pipelines: recovered {len(stuck)} trips")
        except Exception as e:
            log.error(f"reset_stuck_pipelines error: {e}")

    # -------------------------------------------------------------------------
    # Phase 2: Durable image generation job
    # -------------------------------------------------------------------------

    def _enqueue_image_job(self, trip_id: str, trace_id: str):
        try:
            supabase.table("background_jobs").insert({
                "trip_id":    trip_id,
                "job_type":   "image_generation",
                "status":     "pending",
                "trace_id":   trace_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
            log.info(f"[{trip_id}][{trace_id}] image generation job enqueued")
        except Exception as e:
            log.error(f"[{trip_id}] failed to enqueue image job (non-blocking): {e}")

    # -------------------------------------------------------------------------
    # Phase 3: Quality gate — evaluate after core lore, retry once if too low
    # -------------------------------------------------------------------------

    async def _quality_gate(
        self,
        trip: dict,
        aggregated: dict,
        confessions: list[str],
        lore: dict,
        low_confidence: bool = False,
    ) -> tuple[dict, dict, dict]:
        """Evaluate lore quality. If overall < 0.55, retry once with dimension feedback.

        Returns (lore, eval_result, retry_meta) where retry_meta records whether a
        quality retry fired and the before/after scores. retry_meta is empty dict when
        no retry occurred so callers can always unpack safely.

        COST-03: LoreEvaluator.evaluate() is only called on a sampled fraction of
        pipeline runs (controlled by settings.LORE_EVAL_SAMPLE_RATE).  In production
        this is set to 0.2, reducing Haiku evaluation cost by ~80% at scale.
        Skipped runs return a neutral placeholder so downstream consumers always
        receive a valid eval_result dict.
        """
        retry_meta: dict = {}

        if random.random() >= settings.LORE_EVAL_SAMPLE_RATE:
            log.debug(
                f"[{trip['id']}] quality gate skipped by sampling "
                f"(rate={settings.LORE_EVAL_SAMPLE_RATE})"
            )
            return lore, {
                "scores": {},
                "overall": 0.75,
                "weakest_dimension": "sampled_out",
                "feedback": "Evaluation skipped by LORE_EVAL_SAMPLE_RATE",
                "sampled": False,
            }, retry_meta

        evaluator   = LoreEvaluator()
        eval_result = await evaluator.evaluate(trip["id"], lore)
        overall     = eval_result.get("overall")  # None means evaluator itself failed

        # Skip quality retry if evaluator failed (overall is None) to avoid masking
        # the real error with a fabricated retry.
        if overall is not None and overall < 0.55:
            weakest  = eval_result.get("weakest_dimension", "unknown")
            feedback = eval_result.get("feedback", "be more specific")
            log.warning(
                f"[{trip['id']}] quality gate fail: overall={overall:.2f} weakest={weakest} — retrying once"
            )
            quality_extra = (
                f"\n\nQuality evaluation of your previous response: {overall:.2f}/1.0 overall. "
                f"The weakest dimension was '{weakest}'. Evaluator feedback: {feedback}. "
                f"Return ONLY raw JSON. Be highly specific to THIS trip's actual events and moments."
            )
            try:
                lore2 = await self._generate_lore(trip, aggregated, confessions, quality_extra, low_confidence=low_confidence)
                validate_lore_json(lore2)
                forbidden = scan_forbidden_phrases(lore2)
                if forbidden:
                    raise ValueError(f"Forbidden phrases: {forbidden}")
                lore        = lore2
                eval_result = await evaluator.evaluate(trip["id"], lore)
                retry_overall = eval_result.get("overall")
                log.info(f"[{trip['id']}] quality retry result: overall={retry_overall}")
                retry_meta = {
                    "lore_quality_retried": True,
                    "lore_quality_retry_score_before": overall,
                    "lore_quality_retry_score_after": retry_overall,
                }
            except Exception as qe:
                log.warning(f"[{trip['id']}] quality retry failed ({qe}) — keeping original lore")

        return lore, eval_result, retry_meta

    # -------------------------------------------------------------------------
    # Data fetching
    # -------------------------------------------------------------------------

    def _get_trip(self, trip_id: str) -> dict:
        from ..clients import supabase
        data = supabase.table("trips").select("*").eq("id", trip_id).execute().data
        if not data:
            return {}
        trip = data[0]
        # Sanitize user-supplied fields before they enter any prompt string.
        # sanitize_for_prompt handles XML tags, instruction-injection patterns, and newlines.
        trip["name"] = sanitize_for_prompt(trip.get("name") or "", max_length=80)
        trip["destination"] = sanitize_for_prompt(trip.get("destination") or "", max_length=100)
        return trip

    def _get_photos(self, trip_id: str) -> list[dict]:
        return supabase.table("photos").select("*").eq("trip_id", trip_id).execute().data

    def _get_members(self, trip_id: str) -> list[dict]:
        data = (
            supabase.table("trip_members")
            .select("*, profiles:user_id(display_name)")
            .eq("trip_id", trip_id)
            .execute()
            .data
        )
        for member in (data or []):
            if member.get("profiles") and member["profiles"].get("display_name"):
                member["profiles"]["display_name"] = sanitize_for_prompt(
                    member["profiles"]["display_name"], max_length=60
                )
            if member.get("confession_text"):
                member["confession_text"] = sanitize_for_prompt(
                    member["confession_text"], max_length=500
                )
        return data

    def _get_confessions(self, trip_id: str) -> list[str]:
        try:
            rows = (
                supabase.table("trip_members")
                .select("confession_text")
                .eq("trip_id", trip_id)
                .not_.is_("confession_text", "null")
                .execute()
                .data
            )
            return [
                sanitize_for_prompt(r["confession_text"], max_length=500)
                for r in (rows or [])
                if r.get("confession_text")
            ]
        except Exception:
            return []

    def _calculate_duration(self, trip: dict) -> int:
        if not trip.get("trip_start_date") or not trip.get("trip_end_date"):
            return 3
        s = datetime.fromisoformat(trip["trip_start_date"])
        e = datetime.fromisoformat(trip["trip_end_date"])
        return max(1, (e - s).days + 1)

    # -------------------------------------------------------------------------
    # Vision analysis
    # -------------------------------------------------------------------------

    async def _analyze_photo_batches(self, trip: dict, photos: list[dict]) -> list[dict]:
        bs         = settings.MAX_PHOTOS_PER_VISION_CALL
        max_batches = settings.MAX_VISION_BATCHES
        max_photos  = bs * max_batches

        if len(photos) > max_photos:
            original_count = len(photos)
            step_size = original_count / max_photos
            photos    = [photos[int(i * step_size)] for i in range(max_photos)]
            log.info(f"[{trip['id']}] sampled {max_photos}/{original_count} photos for vision (cap={max_photos})")

        batches = [photos[i:i + bs] for i in range(0, len(photos), bs)]
        log.info(f"[{trip['id']}] analyzing {len(photos)} photos in {len(batches)} batches")
        tasks   = [self._analyze_one_batch(trip, batch, i + 1, len(batches)) for i, batch in enumerate(batches)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        valid   = [r for r in results if not isinstance(r, Exception)]
        failed  = len(batches) - len(valid)
        log.info(f"[{trip['id']}] {len(valid)}/{len(batches)} batches succeeded")
        if not valid:
            log.warning(
                f"[{trip['id']}] ALL vision batches failed — using fabricated defaults. "
                f"Lore quality will be degraded."
            )
            return [{"raw_cooked_score": 60, "recurring_behaviors": [], "emotional_arc": {}, "_partial_vision": True, "_failed_batches": len(batches)}]
        if failed > 0:
            log.warning(f"[{trip['id']}] {failed}/{len(batches)} vision batches failed — lore generated with partial data")
            for v in valid:
                v["_partial_vision"] = True
                v["_failed_batches"] = failed
        return valid

    async def _analyze_one_batch(self, trip: dict, batch: list[dict], bn: int, total: int) -> dict:
        import httpx, base64 as _base64
        # PERF-04: 8MB per-image cap — skip oversized images to prevent OOM on Render free tier.
        _MAX_IMAGE_BYTES = 8 * 1024 * 1024

        image_blocks = []
        for photo in batch:
            try:
                path = photo["storage_path"]
                if path.startswith("trip-photos/"):
                    path = path[len("trip-photos/"):]

                url_resp   = supabase.storage.from_("trip-photos").create_signed_url(path, 600)
                signed_url = None
                if isinstance(url_resp, dict):
                    if "data" in url_resp and isinstance(url_resp["data"], dict):
                        d          = url_resp["data"]
                        signed_url = d.get("signedUrl") or d.get("signedURL") or d.get("signed_url")
                    else:
                        signed_url = url_resp.get("signedUrl") or url_resp.get("signedURL") or url_resp.get("signed_url")
                else:
                    data = getattr(url_resp, "data", None)
                    if isinstance(data, dict):
                        signed_url = data.get("signedUrl") or data.get("signedURL")
                    else:
                        signed_url = (
                            getattr(url_resp, "signedUrl", None)
                            or getattr(url_resp, "signedURL", None)
                            or getattr(url_resp, "signed_url", None)
                        )

                if not signed_url:
                    log.error(f"[batch {bn}] empty signed URL for photo {photo.get('id')} path={path!r} — resp:{type(url_resp)}")
                    continue

                # PERF-04: use httpx.AsyncClient directly — eliminates asyncio.to_thread overhead.
                try:
                    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                        img_resp = await client.get(signed_url)
                    img_resp.raise_for_status()
                    # PERF-04: size cap — skip images that would blow Render's 1GB RAM.
                    if len(img_resp.content) > _MAX_IMAGE_BYTES:
                        log.warning(
                            f"[batch {bn}] skipping oversized image photo={photo.get('id')} "
                            f"size={len(img_resp.content) // 1024}KB "
                            f"(>{_MAX_IMAGE_BYTES // (1024 * 1024)}MB cap)"
                        )
                        continue
                    content_type = img_resp.headers.get("content-type", "image/jpeg").split(";")[0].strip()
                    if content_type not in ("image/jpeg", "image/png", "image/webp", "image/gif"):
                        content_type = "image/jpeg"
                    b64_data = _base64.standard_b64encode(img_resp.content).decode()
                    image_blocks.append({
                        "type": "image",
                        "source": {"type": "base64", "media_type": content_type, "data": b64_data},
                    })
                    log.info(f"[batch {bn}] photo {photo.get('id')} loaded ({len(img_resp.content) // 1024}KB)")
                except Exception as fetch_err:
                    log.error(f"[batch {bn}] failed to download photo {photo.get('id')}: {fetch_err}")

            except Exception as e:
                log.error(f"[batch {bn}] signed URL failed for photo {photo.get('id')} path={photo.get('storage_path')!r}: {e}")

        log.info(f"[batch {bn}/{total}] {len(image_blocks)}/{len(batch)} photos loaded for Claude")
        if not image_blocks:
            raise RuntimeError(f"batch {bn}: 0/{len(batch)} photos loaded — check storage_path and Supabase RLS")

        user_prompt = prompts.PHOTO_BATCH_ANALYSIS_USER.format(
            trip_name=trip["name"],
            start_date=trip.get("trip_start_date", "unknown"),
            end_date=trip.get("trip_end_date", "unknown"),
            member_count=trip.get("member_count", 0),
            batch_num=bn,
            total_batches=total,
            batch_id=f"{trip['id']}-batch-{bn}",
        )

        content  = image_blocks + [{"type": "text", "text": user_prompt}]
        response = await self._call_claude(
            system=prompts.PHOTO_BATCH_ANALYSIS_SYSTEM,
            messages=[{"role": "user", "content": content}],
            max_tokens=1500,
            step=f"vision_batch_{bn}",
        )
        return self._parse_json(response)

    # -------------------------------------------------------------------------
    # Trip signals: structural pre-computation (fast, no LLM)
    # -------------------------------------------------------------------------

    def _compute_trip_signals(self, trip: dict, photos: list[dict], members: list[dict]) -> dict:
        clusters = self._cluster_photos_by_time(photos)

        uploaders      = {p.get("user_id", "") for p in photos if p.get("user_id")}
        member_ids     = {m.get("user_id", "") for m in members}
        contributor_diversity = round(len(uploaders & member_ids) / max(len(member_ids), 1), 2)

        uploader_counts: dict[str, int] = {}
        for p in photos:
            uid = p.get("user_id", "")
            if uid:
                uploader_counts[uid] = uploader_counts.get(uid, 0) + 1
        dominant_count         = max(uploader_counts.values(), default=0)
        dominant_uploader_ratio = round(dominant_count / max(len(photos), 1), 2)

        night_count = 0
        for p in photos:
            ts = p.get("created_at", "")
            if ts:
                try:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    if dt.hour >= 22 or dt.hour <= 4:
                        night_count += 1
                except (ValueError, TypeError):
                    pass

        dwell_data: dict[str, int] = {}
        try:
            view_rows = (
                supabase.table("photo_views")
                .select("photo_id, view_duration_ms")
                .eq("trip_id", trip["id"])
                .execute()
                .data or []
            )
            for r in view_rows:
                pid = r.get("photo_id", "")
                ms  = r.get("view_duration_ms", 0) or 0
                if pid:
                    dwell_data[pid] = max(dwell_data.get(pid, 0), ms)
        except Exception:
            pass

        high_dwell_photos = sum(1 for ms in dwell_data.values() if ms >= 9000)

        reaction_data: dict[str, int] = {}
        try:
            rx_rows = (
                supabase.table("lore_reactions")
                .select("emoji")
                .eq("trip_id", trip["id"])
                .execute()
                .data or []
            )
            for r in rx_rows:
                emoji               = r.get("emoji", "?")
                reaction_data[emoji] = reaction_data.get(emoji, 0) + 1
        except Exception:
            pass

        return {
            "scene_clusters":          clusters,
            "cluster_count":           len(clusters),
            "contributor_diversity":   contributor_diversity,
            "dominant_uploader_ratio": dominant_uploader_ratio,
            "unique_uploaders":        len(uploaders),
            "night_photo_count":       night_count,
            "night_photo_ratio":       round(night_count / max(len(photos), 1), 2),
            "high_dwell_photo_count":  high_dwell_photos,
            "reaction_summary":        reaction_data,
            "total_reactions":         sum(reaction_data.values()),
        }

    def _cluster_photos_by_time(self, photos: list[dict]) -> list[dict]:
        from datetime import timedelta

        dated = []
        for p in photos:
            ts = p.get("created_at", "")
            if ts:
                try:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                    dated.append((p, dt))
                except (ValueError, TypeError):
                    pass

        if not dated:
            return []

        dated.sort(key=lambda x: x[1])
        clusters = []
        current  = [dated[0]]

        for item in dated[1:]:
            if item[1] - current[-1][1] <= timedelta(hours=2):
                current.append(item)
            else:
                clusters.append(self._summarize_cluster(current))
                current = [item]

        clusters.append(self._summarize_cluster(current))
        return clusters

    def _summarize_cluster(self, items: list) -> dict:
        photos_in_cluster = [p for p, _ in items]
        times             = [t for _, t in items]
        uploaders         = list({p.get("user_id", "") for p in photos_in_cluster if p.get("user_id")})
        duration_min      = int((times[-1] - times[0]).total_seconds() / 60)
        return {
            "start_time":       times[0].isoformat(),
            "end_time":         times[-1].isoformat(),
            "duration_minutes": duration_min,
            "photo_count":      len(photos_in_cluster),
            "uploader_count":   len(uploaders),
            "is_night_session": times[0].hour >= 22 or times[0].hour <= 5,
        }

    # -------------------------------------------------------------------------
    # Signal aggregation (with Phase 2 context size guard)
    # -------------------------------------------------------------------------

    async def _aggregate_signals(
        self,
        trip: dict,
        batches: list[dict],
        members: list[dict],
        trip_signals: dict | None = None,
    ) -> dict:
        member_names = [
            m["profiles"]["display_name"]
            for m in members
            if m.get("profiles") and isinstance(m["profiles"], dict) and m["profiles"].get("display_name")
        ]

        # Phase 2: context size guard — cap batch JSON at ~4000 tokens (≈16 000 chars)
        _CONTEXT_CHAR_LIMIT = 16_000
        full_batch_json     = json.dumps(batches, indent=2)
        if len(full_batch_json) > _CONTEXT_CHAR_LIMIT:
            # Preserve temporal spread: keep first, last, and evenly-spaced middle batches
            # so the aggregator sees coverage across the whole trip, not just the densest batches.
            if len(batches) <= 2:
                trimmed = batches
            else:
                step = max(1, (len(batches) - 1) / (len(batches) - 1))
                indices = list(dict.fromkeys(
                    [0]
                    + [round(i * (len(batches) - 1) / max(len(batches) - 1, 1)) for i in range(1, len(batches) - 1)]
                    + [len(batches) - 1]
                ))
                trimmed = [batches[i] for i in sorted(indices)]

            kept: list[dict] = []
            used_chars = 0
            for b in trimmed:
                s = json.dumps(b)
                if used_chars + len(s) <= _CONTEXT_CHAR_LIMIT:
                    kept.append(b)
                    used_chars += len(s)
                else:
                    break
            log.info(
                f"[{trip['id']}] context guard: {len(batches)} → {len(kept)} batches "
                f"({len(full_batch_json)} → {used_chars} chars)"
            )
            batch_json_str = json.dumps(kept, indent=2)
        else:
            batch_json_str = full_batch_json

        user_prompt = prompts.SIGNAL_AGGREGATION_USER.format(
            trip_name=trip["name"],
            duration_days=self._calculate_duration(trip),
            total_photos=sum(b.get("photo_count", 0) for b in batches),
            member_names_json=json.dumps(member_names),
            trip_id=trip["id"],
            all_batch_jsons_concatenated=batch_json_str,
        )

        if trip_signals:
            clusters     = trip_signals.get("scene_clusters", [])
            user_prompt += (
                f"\n\n--- STRUCTURAL SIGNALS (computed from photo metadata) ---\n"
                f"Scene clusters: {trip_signals.get('cluster_count', 0)} distinct scenes "
                f"({len(clusters)} time-gap clusters over {self._calculate_duration(trip)} days)\n"
                f"Contributor diversity: {trip_signals.get('contributor_diversity', 'unknown')} "
                f"({trip_signals.get('unique_uploaders', 0)} unique uploaders / {len(members)} members)\n"
                f"Dominant uploader ratio: {trip_signals.get('dominant_uploader_ratio', 'unknown')}\n"
                f"Night photos (10pm–5am): {trip_signals.get('night_photo_count', 0)} "
                f"({round(trip_signals.get('night_photo_ratio', 0) * 100)}% of total)\n"
                f"High-dwell photos (viewed 9s+): {trip_signals.get('high_dwell_photo_count', 0)}\n"
                f"Total reactions: {trip_signals.get('total_reactions', 0)}\n"
                f"Reaction breakdown: {json.dumps(trip_signals.get('reaction_summary', {}))}\n"
                f"Scene cluster detail: {json.dumps(clusters[:6], indent=2)}\n"
                f"--- END STRUCTURAL SIGNALS ---\n\n"
                f"Use scene clusters for chapter breaks. High-dwell photos = emotionally significant. "
                f"Low contributor diversity = single POV — adjust narrative voice accordingly."
            )

        response = await self._call_claude(
            system=prompts.SIGNAL_AGGREGATION_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=2000,
            cache_system=True,
            step="aggregate",
        )
        return self._parse_json(response)

    # -------------------------------------------------------------------------
    # Core lore generation
    # -------------------------------------------------------------------------

    async def _generate_lore_with_retry(
        self,
        trip: dict,
        aggregated: dict,
        confessions: list[str],
        low_confidence: bool = False,
        callback_context: str = "",
    ) -> dict:
        last_err = None
        for attempt in range(settings.MAX_LORE_RETRIES):
            try:
                extra = callback_context  # inject mythology callbacks
                if attempt > 0:
                    extra += (
                        f"\n\nYour last response was rejected with this error: {last_err!s:.300}. "
                        "Return ONLY raw JSON. Fix the specific issue above. Be more specific to this trip's actual events."
                    )
                lore     = await self._generate_lore(trip, aggregated, confessions, extra, low_confidence=low_confidence)
                validate_lore_json(lore)
                forbidden = scan_forbidden_phrases(lore)
                if forbidden:
                    raise ValueError(f"Forbidden phrases found: {forbidden}")
                return lore
            except Exception as e:
                log.warning(f"[{trip['id']}] lore attempt {attempt + 1} failed: {e}")
                last_err = e
        raise RuntimeError(f"Lore generation failed after {settings.MAX_LORE_RETRIES} retries: {last_err}")

    async def _generate_lore(
        self,
        trip: dict,
        aggregated: dict,
        confessions: list[str],
        extra: str = "",
        low_confidence: bool = False,
    ) -> dict:
        system = prompts.LORE_GENERATION_SYSTEM

        if low_confidence:
            system = (
                "Note: This trip has fewer than 8 photos. Generate lore that reflects genuine moments "
                "without fabricating specific behavioral patterns. Use more universal friendship archetypes and "
                "soften specific behavioral claims. Mark confidence as \"limited\".\n\n"
                + system
            )

        system = system + extra

        hints              = aggregated.get("lore_writing_hints", {})
        lead_with          = hints.get("lead_with", "the group's collective chaos energy")
        avoid              = hints.get("avoid", "generic travel blog tropes")
        hinglish_intensity = hints.get("hinglish_intensity", "medium")

        duration_days     = self._calculate_duration(trip)
        recommended_eras  = max(1, min(6, duration_days // 2 or 1))

        user_prompt = prompts.LORE_GENERATION_USER.format(
            trip_name=trip["name"],
            destination=trip.get("destination", "an unspecified location"),
            start_date=trip.get("trip_start_date", "unknown"),
            end_date=trip.get("trip_end_date", "unknown"),
            duration_days=duration_days,
            recommended_eras=recommended_eras,
            member_count=trip.get("member_count", 0),
            total_photos=trip.get("total_photos", 0),
            aggregated_signal_json=json.dumps(aggregated, indent=2),
            lead_with=lead_with,
            avoid=avoid,
            hinglish_intensity=hinglish_intensity,
            confessions_json=json.dumps(confessions) if confessions else "[]",
        )

        response = await self._call_claude(
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=4500,
            cache_system=True,
            step="lore",
        )
        lore = self._parse_json(response)

        # Annotate confidence level so downstream consumers and the UI can surface it.
        if isinstance(lore, dict):
            lore["confidence_level"] = "low" if low_confidence else "high"
            # With fewer data points, clamp chaos score to a softer range (20–65).
            if low_confidence and "cooked_level" in lore:
                lore["cooked_level"] = max(20, min(65, lore["cooked_level"]))

        return lore

    # -------------------------------------------------------------------------
    # Character roles
    # -------------------------------------------------------------------------

    async def _generate_all_roles(
        self,
        trip: dict,
        lore: dict,
        members: list[dict],
        aggregated: dict,
        confessions: list[str] | None = None,
    ) -> list[dict]:
        sem = asyncio.Semaphore(settings.MAX_CONCURRENT_ROLES)

        async def _guarded(m):
            async with sem:
                return await self._generate_one_role(trip, lore, m, members, aggregated, confessions or [])

        tasks   = [_guarded(m) for m in members]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        roles   = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                log.warning(f"Role gen failed for member {i}: {r}")
                m = members[i]
                roles.append({
                    "user_id":          m["user_id"],
                    "role_title":       "The Mysterious One",
                    "role_description": "The archive doesn't have enough evidence. Suspicious.",
                    "chaos_rating":     5,
                })
            else:
                roles.append(r)
        return roles

    async def _generate_one_role(
        self,
        trip: dict,
        lore: dict,
        member: dict,
        all_members: list[dict],
        aggregated: dict,
        confessions: list[str] | None = None,
    ) -> dict:
        other_uploads = {
            m["profiles"]["display_name"]: m.get("photos_uploaded", 0)
            for m in all_members
            if m["user_id"] != member["user_id"]
            and m.get("profiles") and isinstance(m["profiles"], dict) and m["profiles"].get("display_name")
        }
        name = (
            member["profiles"]["display_name"]
            if member.get("profiles") and isinstance(member["profiles"], dict) and member["profiles"].get("display_name")
            else "Unknown"
        )

        dynamics = lore.get("friendship_dynamics", {})
        awards   = lore.get("trip_lore_awards", {})

        user_prompt = prompts.CHARACTER_ROLE_USER.format(
            person_label=name,
            appearance_count=member.get("appearance_count", 0),
            total_photos=trip.get("total_photos", 0),
            appearance_pct=int((member.get("appearance_ratio", 0) or 0) * 100),
            upload_count=member.get("photos_uploaded", 0),
            in_group_shots=bool(member.get("appearance_ratio", 0) and member["appearance_ratio"] > 0.5),
            confession_text=member.get("confession_text") or "null",
            trip_title=lore.get("trip_title", ""),
            full_narrative=lore.get("season_recap", {}).get("full_narrative", ""),
            group_structure=dynamics.get("group_structure", "undefined group dynamic"),
            chaos_source=dynamics.get("chaos_source", "unclear"),
            cooked_verdict=lore.get("cooked_verdict", ""),
            cooked_level=lore.get("cooked_level", 60),
            core_memory=awards.get("core_memory", ""),
            trip_personality_type=lore.get("trip_personality_type", "unknown vibe"),
            social_dynamic=aggregated.get("social_dynamic", "undefined group dynamic"),
            trip_eras_json=json.dumps(lore.get("trip_eras", [])),
            other_upload_counts_json=json.dumps(other_uploads),
            peer_confessions_json=json.dumps(confessions or []),
        )

        response = await self._call_claude(
            system=prompts.CHARACTER_ROLE_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=900,
            cache_system=True,
            model=settings.CLAUDE_HAIKU_MODEL,
            step="roles",
        )
        role            = self._parse_json(response)
        role["user_id"] = member["user_id"]
        return role

    # -------------------------------------------------------------------------
    # Receipt stats
    # -------------------------------------------------------------------------

    async def _generate_receipt_stats(self, trip: dict, lore: dict, aggregated: dict) -> dict:
        most_photographed_ratio = aggregated.get("most_photographed_ratio_avg", 0.4)
        group_shots_ratio       = aggregated.get("group_shots_ratio_avg", 0.3)
        late_night_ratio        = aggregated.get("late_night_ratio_avg", aggregated.get("dominant_time_pattern", "unknown"))
        food_ratio              = aggregated.get("food_ratio_avg", aggregated.get("food_obsession_level", "moderate"))

        user_prompt = prompts.STATS_USER.format(
            total_photos=trip.get("total_photos", 0),
            duration_days=self._calculate_duration(trip),
            duration_nights=max(0, self._calculate_duration(trip) - 1),
            member_count=trip.get("member_count", 0),
            late_night_ratio=late_night_ratio,
            food_ratio=food_ratio,
            cooked_level=lore.get("cooked_level", 60),
            peak_cooked_window=aggregated.get("peak_cooked_moment", "unknown"),
            most_photographed_ratio=most_photographed_ratio,
            dominant_photographer=aggregated.get("photographer_dynamic", ""),
            group_shots_ratio=group_shots_ratio,
            trip_personality=lore.get("trip_personality_type", ""),
            social_dynamic=aggregated.get("social_dynamic", ""),
            peak_cooked_moment=aggregated.get("peak_cooked_moment", ""),
            recurring_behaviors_json=json.dumps(aggregated.get("recurring_behaviors_merged", [])),
        )

        response = await self._call_claude(
            system=prompts.STATS_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=1200,
            model=settings.CLAUDE_HAIKU_MODEL,
            step="stats",
        )
        result = self._parse_json(response)
        if isinstance(result, list):
            return {"receipt_stats": result, "receipt_rating": "★★★★★", "receipt_review": ""}
        return result

    # -------------------------------------------------------------------------
    # Superlatives
    # -------------------------------------------------------------------------

    async def _generate_superlatives(
        self,
        lore: dict,
        members: list[dict],
        confessions: list[str] | None = None,
    ) -> list[dict]:
        members_payload = [
            {
                "user_id":      m["user_id"],
                "display_name": (m["profiles"].get("display_name") if isinstance(m.get("profiles"), dict) else None) or "Unknown",
            }
            for m in members
        ]
        dynamics     = lore.get("friendship_dynamics", {})
        awards       = lore.get("trip_lore_awards", {})
        lore_summary = (
            f"Trip title: {lore.get('trip_title', '')}. "
            f"Tagline: {lore.get('tagline', '')}. "
            f"Cooked: {lore.get('cooked_level', 0)}/100. "
            f"Verdict: {lore.get('cooked_verdict', '')}. "
            f"Full narrative: {lore.get('season_recap', {}).get('full_narrative', '')}. "
            f"Group structure: {dynamics.get('group_structure', '')}. "
            f"Chaos source: {dynamics.get('chaos_source', '')}. "
            f"Core memory: {awards.get('core_memory', '')}. "
            f"Trip villain: {awards.get('trip_villain', '')}. "
            f"Trip MVP: {awards.get('trip_mvp', '')}."
        )

        user_prompt = prompts.SUPERLATIVES_USER.format(
            lore_summary=lore_summary,
            members_json=json.dumps(members_payload),
            confessions_json=json.dumps(confessions or []),
        )

        response = await self._call_claude(
            system=prompts.SUPERLATIVES_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=1200,
            model=settings.CLAUDE_HAIKU_MODEL,
            step="superlatives",
        )
        result       = self._parse_json(response)
        superlatives = result if isinstance(result, list) else result.get("superlatives", [])

        valid_ids = {m["user_id"] for m in members}
        return [s for s in superlatives if s.get("winner_user_id") in valid_ids or not s.get("winner_user_id")]

    # -------------------------------------------------------------------------
    # Persistence
    # -------------------------------------------------------------------------

    def _save_lore(self, trip_id: str, lore: dict):
        supabase.table("trips").update({
            "lore_json":   lore,
            "chaos_score": lore.get("cooked_level", 60),
        }).eq("id", trip_id).execute()

        if lore.get("trip_eras"):
            era_rows = [
                {
                    "trip_id":       trip_id,
                    "era_name":      era["era_name"],
                    "timeframe":     era.get("timeframe"),
                    "description":   era.get("description"),
                    "display_order": i,
                }
                for i, era in enumerate(lore["trip_eras"])
            ]
            # Delete before insert — idempotent on retries, avoids duplicate rows
            # when there is no reliable unique constraint on (trip_id, display_order).
            supabase.table("trip_eras").delete().eq("trip_id", trip_id).execute()
            supabase.table("trip_eras").insert(era_rows).execute()

    def _save_roles(self, trip_id: str, roles: list[dict]):
        for role in roles:
            if not role.get("user_id"):
                continue
            supabase.table("trip_members").update({
                "role_title":        role.get("role_title"),
                "role_description":  role.get("role_description"),
                "role_chaos_rating": role.get("chaos_rating"),
                "role_archetype_tag": role.get("archetype_tag") or role.get("archetype"),
            }).eq("trip_id", trip_id).eq("user_id", role["user_id"]).execute()

    def _save_stats(self, trip_id: str, stats: list[dict]):
        if not stats:
            return
        stat_rows = [
            {
                "trip_id":       trip_id,
                "label":         s["label"],
                "value":         str(s["value"]),
                "unit":          s.get("unit"),
                "display_order": i,
            }
            for i, s in enumerate(stats)
        ]
        supabase.table("trip_stats").upsert(stat_rows).execute()

    # -------------------------------------------------------------------------
    # Missing person card
    # -------------------------------------------------------------------------

    async def generate_missing_person(self, trip_id: str, absent_user_id: str):
        trip = self._get_trip(trip_id)
        if not trip.get("lore_json"):
            log.warning(f"[{trip_id}] can't generate missing person card — no lore yet")
            return

        absent = (
            supabase.table("trip_members")
            .select("*, profiles:user_id(display_name)")
            .eq("trip_id", trip_id)
            .eq("user_id", absent_user_id)
            .single()
            .execute()
            .data
        )
        lore        = trip["lore_json"]
        all_members = self._get_members(trip_id)
        absent_name = absent["profiles"]["display_name"] if absent.get("profiles") else "Someone"

        user_prompt = prompts.MISSING_PERSON_USER.format(
            absent_name=absent_name,
            relationship="member of the group",
            absence_reason=absent.get("absence_reason") or "couldn't make it",
            trip_title=lore.get("trip_title", ""),
            trip_personality_type=lore.get("trip_personality_type", ""),
            act_2=lore.get("season_recap", {}).get("act_2", ""),
            cooked_level=lore.get("cooked_level", 60),
            recurring_behaviors_json=json.dumps([]),
            character_roles_json=json.dumps([
                {"name": m["profiles"]["display_name"] if m.get("profiles") else "?", "role": m.get("role_title")}
                for m in all_members
            ]),
            trip_verdict=lore.get("cooked_verdict", ""),
        )

        response = await self._call_claude(
            system=prompts.MISSING_PERSON_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=1200,
            step="missing_person",
        )
        card = self._parse_json(response)
        supabase.table("trip_members").update({
            "role_title": card.get("role_title", "The Missing One"),
        }).eq("trip_id", trip_id).eq("user_id", absent_user_id).execute()

    # -------------------------------------------------------------------------
    # Trip vs Trip battle judge
    # -------------------------------------------------------------------------

    async def judge_battle(self, battle_id: str):
        battle = (
            supabase.table("trip_vs_trip")
            .select("*, trip_a:trip_a_id(*), trip_b:trip_b_id(*)")
            .eq("id", battle_id)
            .single()
            .execute()
            .data
        )
        if not battle:
            log.error(f"[{battle_id}] battle not found")
            return
        trip_a, trip_b = battle["trip_a"], battle["trip_b"]
        if not trip_a or not trip_b:
            log.error(f"[{battle_id}] battle trip references missing")
            return
        if not trip_a.get("lore_json"):
            raise ValueError(f"[{battle_id}] trip_a has no lore_json — generate lore first")
        if not trip_b.get("lore_json"):
            raise ValueError(f"[{battle_id}] trip_b has no lore_json — generate lore first")

        lore_a, lore_b = trip_a["lore_json"], trip_b["lore_json"]
        user_prompt = prompts.TRIP_VS_TRIP_USER.format(
            trip_a_title=lore_a.get("trip_title", trip_a.get("name", "Unknown")),
            trip_a_destination=trip_a.get("destination", "unknown"),
            trip_a_cooked_score=trip_a.get("chaos_score", 50),
            trip_a_personality=lore_a.get("trip_personality_type", ""),
            trip_a_tagline=lore_a.get("tagline", ""),
            trip_a_verdict=lore_a.get("cooked_verdict", ""),
            trip_a_members=trip_a.get("member_count", 0),
            trip_b_title=lore_b.get("trip_title", trip_b.get("name", "Unknown")),
            trip_b_destination=trip_b.get("destination", "unknown"),
            trip_b_cooked_score=trip_b.get("chaos_score", 50),
            trip_b_personality=lore_b.get("trip_personality_type", ""),
            trip_b_tagline=lore_b.get("tagline", ""),
            trip_b_verdict=lore_b.get("cooked_verdict", ""),
            trip_b_members=trip_b.get("member_count", 0),
        )

        response = await self._call_claude(
            system=prompts.TRIP_VS_TRIP_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=1500,
            step="battle",
        )
        verdict       = self._parse_json(response)
        ai_winner_id  = trip_a["id"] if verdict.get("winner") == "trip_a" else trip_b["id"]

        supabase.table("trip_vs_trip").update({
            "ai_verdict_json": verdict,
            "ai_winner":       ai_winner_id,
            "status":          "voting",
        }).eq("id", battle_id).execute()

    # -------------------------------------------------------------------------
    # Claude API call wrapper — per-reason retry, rate limiter, budget
    # -------------------------------------------------------------------------

    # Retry config per FailoverReason: (max_attempts, base_wait_seconds)
    _RETRY_CONFIG: dict[FailoverReason, tuple[int, float]] = {
        FailoverReason.RATE_LIMIT:     (4, 8.0),
        FailoverReason.OVERLOAD:       (3, 5.0),
        FailoverReason.TIMEOUT:        (3, 3.0),
        FailoverReason.CONNECTION:     (3, 2.0),
        FailoverReason.CONTENT_POLICY: (1, 0.0),  # never retry content policy
        FailoverReason.UNKNOWN:        (2, 2.0),
    }

    async def _call_claude(
        self,
        system: str,
        messages: list,
        max_tokens: int = 1500,
        cache_system: bool = False,
        model: str | None = None,
        step: str = "unknown",
    ) -> str:
        chosen_model   = model or settings.CLAUDE_MODEL
        system_content: list | str = system
        if cache_system and not settings.ANTHROPIC_BASE_URL:
            system_content = [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}]

        if self._budget:
            self._budget.check(step, max_tokens)

        attempt = 0
        while True:
            try:
                async with self._rate_limiter:
                    response = await anthropic_client.messages.create(
                        model=chosen_model,
                        max_tokens=max_tokens,
                        system=system_content,
                        messages=messages,
                    )
                used = response.usage.input_tokens + response.usage.output_tokens
                self._step_tokens[step] = self._step_tokens.get(step, 0) + used
                if self._budget:
                    self._budget.record(used)
                log.debug(
                    f"[claude] step={step} model={chosen_model} "
                    f"in={response.usage.input_tokens} out={response.usage.output_tokens} "
                    f"step_total={self._step_tokens[step]}"
                )
                return response.content[0].text

            except Exception as exc:
                reason                   = classify_api_error(exc)
                max_attempts, base_wait  = self._RETRY_CONFIG.get(reason, (2, 2.0))
                attempt                 += 1
                if attempt >= max_attempts:
                    # Fallback: if Sonnet is overloaded and we are not already on the fallback
                    # model, retry once with Haiku instead of failing the pipeline.
                    if (
                        reason == FailoverReason.OVERLOAD
                        and chosen_model != settings.CLAUDE_FALLBACK_MODEL
                    ):
                        log.warning(
                            f"[claude] step={step} Sonnet overloaded after {attempt} attempts — "
                            f"falling back to {settings.CLAUDE_FALLBACK_MODEL}"
                        )
                        return await self._call_claude(
                            system=system,
                            messages=messages,
                            max_tokens=max_tokens,
                            cache_system=cache_system,
                            model=settings.CLAUDE_FALLBACK_MODEL,
                            step=step,
                        )
                    log.error(f"[claude] step={step} giving up after {attempt} attempts: {reason} — {exc}")
                    raise LoreApiError(reason=reason, original=exc, step=step) from exc
                wait = min(base_wait * (2 ** (attempt - 1)), 60.0)
                log.warning(f"[claude] step={step} attempt={attempt}/{max_attempts} reason={reason} wait={wait:.1f}s — {exc}")
                await asyncio.sleep(wait)

    # -------------------------------------------------------------------------
    # JSON parsing
    # -------------------------------------------------------------------------

    def _parse_json(self, raw: str) -> dict | list:
        cleaned = raw.strip()
        if "```" in cleaned:
            parts = cleaned.split("```")
            for part in parts:
                stripped = part.strip()
                if stripped.startswith("json") or stripped.startswith("python"):
                    stripped = stripped.split("\n", 1)[-1].strip()
                if stripped.startswith("{") or stripped.startswith("["):
                    cleaned = stripped
                    break
        cleaned = cleaned.strip()
        start   = min(
            (cleaned.find("{") if "{" in cleaned else len(cleaned)),
            (cleaned.find("[") if "[" in cleaned else len(cleaned)),
        )
        if start > 0:
            cleaned = cleaned[start:]
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Claude occasionally returns Python-style literals (True/False/None).
            # ast.literal_eval handles these safely with no arbitrary code execution.
            import ast
            try:
                result = ast.literal_eval(cleaned)
                if isinstance(result, (dict, list)):
                    return result
            except (ValueError, SyntaxError):
                pass
            log.error(f"JSON parse failed\nRaw (first 800 chars):\n{raw[:800]}")
            raise ValueError(f"Claude returned invalid JSON — not parseable as JSON or Python literal")
