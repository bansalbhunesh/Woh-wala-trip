import asyncio
import json
import logging
from datetime import datetime, timezone

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from ..clients import supabase, anthropic_client
from ..config import settings
from . import prompts
from .validators import validate_lore_json, scan_forbidden_phrases

log = logging.getLogger("wwt.lore")


class LoreOrchestrator:
    """Full lore generation pipeline.

    Steps:
      1. Fetch trip + photos + members
      2. Vision analysis in parallel batches (real Claude vision calls)
      3. Signal aggregation
      4. Core lore generation (with retry + validation)
      5. Per-member character roles (parallel)
      6. Receipt stats
      7. Superlatives
      8. Persist everything to Supabase
    """

    async def run_full_pipeline(self, trip_id: str):
        log.info(f"[{trip_id}] pipeline start — model={settings.CLAUDE_MODEL} proxy={bool(settings.ANTHROPIC_BASE_URL)}")
        try:
            supabase.table("trips").update({"lore_status": "processing"}).eq("id", trip_id).execute()

            # Fetch trip, photos, members in parallel
            import asyncio as _asyncio
            trip, photos, members = await _asyncio.gather(
                _asyncio.to_thread(self._get_trip, trip_id),
                _asyncio.to_thread(self._get_photos, trip_id),
                _asyncio.to_thread(self._get_members, trip_id),
            )
            log.info(f"[{trip_id}] fetched: {len(photos)} photos, {len(members)} members")
            # Sync total_photos from real count so lore reflects accurate data
            if trip and len(photos) != trip.get("total_photos", 0):
                supabase.table("trips").update({"total_photos": len(photos), "member_count": len(members)}).eq("id", trip_id).execute()
                trip["total_photos"] = len(photos)
                trip["member_count"] = len(members)

            if len(photos) < 5:
                log.warning(f"[{trip_id}] only {len(photos)} photos — need 5+")
                supabase.table("trips").update({"lore_status": "failed"}).eq("id", trip_id).execute()
                return

            # Step 2: vision analysis
            batch_signals = await self._analyze_photo_batches(trip, photos)

            # Step 3: aggregate signals
            aggregated = await self._aggregate_signals(trip, batch_signals, members)

            # Step 4: core lore
            confessions = self._get_confessions(trip_id)
            lore = await self._generate_lore_with_retry(trip, aggregated, confessions)

            # Steps 5-7: parallel enrichment
            roles_task = self._generate_all_roles(trip, lore, members, aggregated)
            stats_task = self._generate_receipt_stats(trip, lore, aggregated)
            superlatives_task = self._generate_superlatives(lore, members)

            roles, stats, superlatives = await asyncio.gather(
                roles_task, stats_task, superlatives_task,
                return_exceptions=True
            )

            # Merge superlatives + stats into lore_json
            if isinstance(superlatives, list):
                lore["superlatives"] = superlatives
            if isinstance(stats, dict):
                lore["receipt_stats"] = stats.get("receipt_stats", [])
                lore["receipt_rating"] = stats.get("receipt_rating", "★★★★★")
                lore["receipt_review"] = stats.get("receipt_review", "")

            # Step 8: persist
            self._save_lore(trip_id, lore)
            if not isinstance(roles, Exception):
                self._save_roles(trip_id, roles)
            if not isinstance(stats, Exception):
                self._save_stats(trip_id, stats.get("receipt_stats", []) if isinstance(stats, dict) else [])

            supabase.table("trips").update({"lore_status": "ready"}).eq("id", trip_id).execute()
            log.info(f"[{trip_id}] pipeline complete")

        except Exception as e:
            log.exception(f"[{trip_id}] pipeline failed: {e}")
            supabase.table("trips").update({"lore_status": "failed"}).eq("id", trip_id).execute()
            raise

    # -------------------------------------------------------------------------
    # Data fetching
    # -------------------------------------------------------------------------

    def _get_trip(self, trip_id: str) -> dict:
        return supabase.table("trips").select("*").eq("id", trip_id).single().execute().data

    def _get_photos(self, trip_id: str) -> list[dict]:
        return supabase.table("photos").select("*").eq("trip_id", trip_id).execute().data

    def _get_members(self, trip_id: str) -> list[dict]:
        return (
            supabase.table("trip_members")
            .select("*, profiles:user_id(display_name)")
            .eq("trip_id", trip_id)
            .execute()
            .data
        )

    def _get_confessions(self, trip_id: str) -> list[str]:
        # confession_text column may not exist — return empty list safely
        try:
            rows = (
                supabase.table("trip_members")
                .select("confession_text")
                .eq("trip_id", trip_id)
                .not_.is_("confession_text", "null")
                .execute()
                .data
            )
            return [r["confession_text"] for r in (rows or []) if r.get("confession_text")]
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
        bs = settings.MAX_PHOTOS_PER_VISION_CALL
        batches = [photos[i:i+bs] for i in range(0, len(photos), bs)]
        log.info(f"[{trip['id']}] analyzing {len(photos)} photos in {len(batches)} batches")
        tasks = [self._analyze_one_batch(trip, batch, i+1, len(batches)) for i, batch in enumerate(batches)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        valid = [r for r in results if not isinstance(r, Exception)]
        log.info(f"[{trip['id']}] {len(valid)}/{len(batches)} batches succeeded")
        return valid or [{"raw_cooked_score": 60, "recurring_behaviors": [], "emotional_arc": {}}]

    async def _analyze_one_batch(self, trip: dict, batch: list[dict], bn: int, total: int) -> dict:
        image_blocks = []
        for photo in batch:
            try:
                url_resp = supabase.storage.from_("trip-photos").create_signed_url(
                    photo["storage_path"], 600
                )
                # supabase-py 2.x returns SignedURLResponse object or dict — handle both
                # supabase-py 2.x wraps response in .data — handle both old and new formats
                signed_url = None
                if isinstance(url_resp, dict):
                    # New: {"data": {"signedUrl": "..."}, "error": None}
                    if "data" in url_resp and isinstance(url_resp["data"], dict):
                        d = url_resp["data"]
                        signed_url = d.get("signedUrl") or d.get("signedURL") or d.get("signed_url")
                    else:
                        # Old: {"signedURL": "..."} or {"signedUrl": "..."}
                        signed_url = url_resp.get("signedUrl") or url_resp.get("signedURL") or url_resp.get("signed_url")
                else:
                    # Object-style response
                    data = getattr(url_resp, "data", None)
                    if isinstance(data, dict):
                        signed_url = data.get("signedUrl") or data.get("signedURL")
                    else:
                        signed_url = (getattr(url_resp, "signedUrl", None)
                                      or getattr(url_resp, "signedURL", None)
                                      or getattr(url_resp, "signed_url", None))
                if signed_url:
                    image_blocks.append({
                        "type": "image",
                        "source": {"type": "url", "url": signed_url},
                    })
                else:
                    log.warning(f"Empty signed URL for photo {photo.get('id')} — resp type:{type(url_resp)} keys:{list(url_resp.keys()) if isinstance(url_resp, dict) else '?'}")
            except Exception as e:
                log.warning(f"Failed to get signed URL for photo {photo.get('id')}: {e}")

        if not image_blocks:
            return {"raw_cooked_score": 60, "recurring_behaviors": [], "photo_count": 0}

        user_prompt = prompts.PHOTO_BATCH_ANALYSIS_USER.format(
            trip_name=trip["name"],
            start_date=trip.get("trip_start_date", "unknown"),
            end_date=trip.get("trip_end_date", "unknown"),
            member_count=trip.get("member_count", 0),
            batch_num=bn,
            total_batches=total,
            batch_id=f"{trip['id']}-batch-{bn}",
        )

        content = image_blocks + [{"type": "text", "text": user_prompt}]

        response = await self._call_claude(
            system=prompts.PHOTO_BATCH_ANALYSIS_SYSTEM,
            messages=[{"role": "user", "content": content}],
            max_tokens=1500,
        )
        return self._parse_json(response)

    # -------------------------------------------------------------------------
    # Signal aggregation
    # -------------------------------------------------------------------------

    async def _aggregate_signals(self, trip: dict, batches: list[dict], members: list[dict]) -> dict:
        # Safe null check — profiles join may return None if user has no profile row
        member_names = [
            m["profiles"]["display_name"]
            for m in members
            if m.get("profiles") and isinstance(m["profiles"], dict) and m["profiles"].get("display_name")
        ]

        user_prompt = prompts.SIGNAL_AGGREGATION_USER.format(
            trip_name=trip["name"],
            duration_days=self._calculate_duration(trip),
            total_photos=sum(b.get("photo_count", 0) for b in batches),
            member_names_json=json.dumps(member_names),
            trip_id=trip["id"],
            all_batch_jsons_concatenated=json.dumps(batches, indent=2),
        )

        response = await self._call_claude(
            system=prompts.SIGNAL_AGGREGATION_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=2000,
        )
        return self._parse_json(response)

    # -------------------------------------------------------------------------
    # Core lore generation
    # -------------------------------------------------------------------------

    async def _generate_lore_with_retry(self, trip: dict, aggregated: dict, confessions: list[str]) -> dict:
        last_err = None
        for attempt in range(settings.MAX_LORE_RETRIES):
            try:
                extra = ""
                if attempt > 0:
                    extra = "\n\nYour last response was rejected. Return ONLY raw JSON. Be more specific and roasty. Avoid generic phrases."
                lore = await self._generate_lore(trip, aggregated, confessions, extra)
                validate_lore_json(lore)
                forbidden = scan_forbidden_phrases(lore)
                if forbidden:
                    raise ValueError(f"Forbidden phrases found: {forbidden}")
                return lore
            except Exception as e:
                log.warning(f"[{trip['id']}] lore attempt {attempt+1} failed: {e}")
                last_err = e
        raise RuntimeError(f"Lore generation failed after {settings.MAX_LORE_RETRIES} retries: {last_err}")

    async def _generate_lore(self, trip: dict, aggregated: dict, confessions: list[str], extra: str = "") -> dict:
        system = prompts.LORE_GENERATION_SYSTEM + extra

        user_prompt = prompts.LORE_GENERATION_USER.format(
            trip_name=trip["name"],
            destination=trip.get("destination", "an unspecified location"),
            start_date=trip.get("trip_start_date", "unknown"),
            end_date=trip.get("trip_end_date", "unknown"),
            duration_days=self._calculate_duration(trip),
            member_count=trip.get("member_count", 0),
            total_photos=trip.get("total_photos", 0),
            aggregated_signal_json=json.dumps(aggregated, indent=2),
            confessions_json=json.dumps(confessions),
        )

        # Use cache_control on system prompt — saves ~70% tokens on retries
        response = await self._call_claude(
            system=system,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=3000,
            cache_system=True,
        )
        return self._parse_json(response)

    # -------------------------------------------------------------------------
    # Character roles
    # -------------------------------------------------------------------------

    async def _generate_all_roles(self, trip: dict, lore: dict, members: list[dict], aggregated: dict) -> list[dict]:
        tasks = [self._generate_one_role(trip, lore, m, members, aggregated) for m in members]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        roles = []
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                log.warning(f"Role gen failed for member {i}: {r}")
                # Fallback role so nobody is missing
                m = members[i]
                roles.append({
                    "user_id": m["user_id"],
                    "role_title": "The Mysterious One",
                    "role_description": "The archive doesn't have enough evidence. Suspicious.",
                    "chaos_rating": 5,
                })
            else:
                roles.append(r)
        return roles

    async def _generate_one_role(self, trip: dict, lore: dict, member: dict, all_members: list[dict], aggregated: dict) -> dict:
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

        user_prompt = prompts.CHARACTER_ROLE_USER.format(
            person_label=name,
            appearance_count=member.get("appearance_count", 0),
            total_photos=trip.get("total_photos", 0),
            appearance_pct=int((member.get("appearance_ratio", 0) or 0) * 100),
            upload_count=member.get("photos_uploaded", 0),
            in_group_shots=bool(member.get("appearance_ratio", 0) and member["appearance_ratio"] > 0.5),
            confession_text=member.get("confession_text") or "null",
            trip_personality_type=lore.get("trip_personality_type", "unknown vibe"),
            social_dynamic=aggregated.get("social_dynamic", "undefined group dynamic"),
            cooked_level=lore.get("cooked_level", 60),
            trip_eras_json=json.dumps(lore.get("trip_eras", [])),
            other_upload_counts_json=json.dumps(other_uploads),
        )

        response = await self._call_claude(
            system=prompts.CHARACTER_ROLE_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=800,
        )
        role = self._parse_json(response)
        role["user_id"] = member["user_id"]
        return role

    # -------------------------------------------------------------------------
    # Receipt stats
    # -------------------------------------------------------------------------

    async def _generate_receipt_stats(self, trip: dict, lore: dict, aggregated: dict) -> dict:
        user_prompt = prompts.STATS_USER.format(
            total_photos=trip.get("total_photos", 0),
            duration_days=self._calculate_duration(trip),
            duration_nights=max(0, self._calculate_duration(trip) - 1),
            member_count=trip.get("member_count", 0),
            late_night_ratio=aggregated.get("dominant_time_pattern", "unknown"),
            food_ratio=aggregated.get("food_obsession_level", "moderate"),
            cooked_level=lore.get("cooked_level", 60),
            peak_cooked_window=aggregated.get("peak_cooked_moment", "null"),
            most_photographed_ratio=0.4,
            dominant_photographer=aggregated.get("photographer_dynamic", ""),
            group_shots_ratio=0.3,
            trip_personality=lore.get("trip_personality_type", ""),
            social_dynamic=aggregated.get("social_dynamic", ""),
            recurring_behaviors_json=json.dumps(aggregated.get("recurring_behaviors_merged", [])),
        )

        response = await self._call_claude(
            system=prompts.STATS_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=1200,
        )
        result = self._parse_json(response)
        # Handle both list and dict shapes
        if isinstance(result, list):
            return {"receipt_stats": result, "receipt_rating": "★★★★★", "receipt_review": ""}
        return result

    # -------------------------------------------------------------------------
    # Superlatives
    # -------------------------------------------------------------------------

    async def _generate_superlatives(self, lore: dict, members: list[dict]) -> list[dict]:
        members_payload = [
            {
                "user_id": m["user_id"],
                "display_name": (m["profiles"].get("display_name") if isinstance(m.get("profiles"), dict) else None) or "Unknown",
            }
            for m in members
        ]
        lore_summary = f"Trip: {lore.get('trip_title')}. Tagline: {lore.get('tagline')}. Cooked: {lore.get('cooked_level')}/100. Verdict: {lore.get('cooked_verdict')}"

        user_prompt = prompts.SUPERLATIVES_USER.format(
            lore_summary=lore_summary,
            members_json=json.dumps(members_payload),
            confessions_json=json.dumps([]),
        )

        response = await self._call_claude(
            system=prompts.SUPERLATIVES_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=1200,
        )
        result = self._parse_json(response)
        superlatives = result if isinstance(result, list) else result.get("superlatives", [])

        # Validate — every winner_user_id must exist
        valid_ids = {m["user_id"] for m in members}
        return [s for s in superlatives if s.get("winner_user_id") in valid_ids or not s.get("winner_user_id")]

    # -------------------------------------------------------------------------
    # Persistence
    # -------------------------------------------------------------------------

    def _save_lore(self, trip_id: str, lore: dict):
        supabase.table("trips").update({
            "lore_json": lore,
            "chaos_score": lore.get("cooked_level", 60),
            # lore_generated_at column does not exist in schema — removed
        }).eq("id", trip_id).execute()

        if lore.get("trip_eras"):
            era_rows = [
                {
                    "trip_id": trip_id,
                    "era_name": era["era_name"],
                    "timeframe": era.get("timeframe"),
                    "description": era.get("description"),
                    # defining_moment column does not exist in schema
                    "display_order": i,
                }
                for i, era in enumerate(lore["trip_eras"])
            ]
            supabase.table("trip_eras").upsert(era_rows).execute()

    def _save_roles(self, trip_id: str, roles: list[dict]):
        for role in roles:
            if not role.get("user_id"):
                continue
            supabase.table("trip_members").update({
                "role_title": role.get("role_title"),
                "role_description": role.get("role_description"),
                "role_chaos_rating": role.get("chaos_rating"),
                # role_signature_move, role_most_likely_said, role_archetype_tag not in schema
            }).eq("trip_id", trip_id).eq("user_id", role["user_id"]).execute()

    def _save_stats(self, trip_id: str, stats: list[dict]):
        if not stats:
            return
        stat_rows = [
            {
                "trip_id": trip_id,
                "label": s["label"],
                "value": str(s["value"]),
                "unit": s.get("unit"),
                # note column does not exist in schema
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
        lore = trip["lore_json"]
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
                {"name": m["profiles"]["display_name"] if m.get("profiles") else "?",
                 "role": m.get("role_title")}
                for m in all_members
            ]),
            trip_verdict=lore.get("cooked_verdict", ""),
        )

        response = await self._call_claude(
            system=prompts.MISSING_PERSON_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=1200,
        )
        card = self._parse_json(response)

        supabase.table("trip_members").update({
            # missing_person_card_json may not exist in schema — silently skip
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
        trip_a, trip_b = battle["trip_a"], battle["trip_b"]

        user_prompt = prompts.TRIP_VS_TRIP_USER.format(
            trip_a_title=trip_a["lore_json"].get("trip_title", trip_a["name"]),
            trip_a_destination=trip_a.get("destination", "unknown"),
            trip_a_cooked_score=trip_a.get("chaos_score", 50),
            trip_a_personality=trip_a["lore_json"].get("trip_personality_type", ""),
            trip_a_tagline=trip_a["lore_json"].get("tagline", ""),
            trip_a_verdict=trip_a["lore_json"].get("cooked_verdict", ""),
            trip_a_members=trip_a.get("member_count", 0),
            trip_b_title=trip_b["lore_json"].get("trip_title", trip_b["name"]),
            trip_b_destination=trip_b.get("destination", "unknown"),
            trip_b_cooked_score=trip_b.get("chaos_score", 50),
            trip_b_personality=trip_b["lore_json"].get("trip_personality_type", ""),
            trip_b_tagline=trip_b["lore_json"].get("tagline", ""),
            trip_b_verdict=trip_b["lore_json"].get("cooked_verdict", ""),
            trip_b_members=trip_b.get("member_count", 0),
        )

        response = await self._call_claude(
            system=prompts.TRIP_VS_TRIP_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
            max_tokens=1500,
        )
        verdict = self._parse_json(response)
        ai_winner_id = trip_a["id"] if verdict.get("winner") == "trip_a" else trip_b["id"]

        supabase.table("trip_vs_trip").update({
            "ai_verdict_json": verdict,
            "ai_winner": ai_winner_id,
            "status": "voting",
        }).eq("id", battle_id).execute()

    # -------------------------------------------------------------------------
    # Claude API call wrapper
    # -------------------------------------------------------------------------

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((Exception,)),
    )
    async def _call_claude(
        self,
        system: str,
        messages: list,
        max_tokens: int = 1500,
        cache_system: bool = False,
    ) -> str:
        system_content: list | str = system
        # cache_control only works with official Anthropic API — skip for proxies
        if cache_system and not settings.ANTHROPIC_BASE_URL:
            system_content = [{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}]

        # AsyncAnthropic — no thread pool, truly non-blocking
        response = await anthropic_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=max_tokens,
            system=system_content,
            messages=messages,
        )
        return response.content[0].text

    def _parse_json(self, raw: str) -> dict | list:
        cleaned = raw.strip()
        # Strip any markdown code fence variant (```json, ```python, ```, etc.)
        if "```" in cleaned:
            parts = cleaned.split("```")
            for part in parts:
                stripped = part.strip()
                # Skip the language tag line
                if stripped.startswith("json") or stripped.startswith("python"):
                    stripped = stripped.split("\n", 1)[-1].strip()
                if stripped.startswith("{") or stripped.startswith("["):
                    cleaned = stripped
                    break
        cleaned = cleaned.strip()
        # Find first { or [ to skip any preamble text
        start = min(
            (cleaned.find("{") if "{" in cleaned else len(cleaned)),
            (cleaned.find("[") if "[" in cleaned else len(cleaned)),
        )
        if start > 0:
            cleaned = cleaned[start:]
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            log.error(f"JSON parse failed: {e}\nRaw (first 800 chars):\n{raw[:800]}")
            raise ValueError(f"Claude returned invalid JSON: {e}")
