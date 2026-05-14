import asyncio
import json
import logging
from datetime import datetime
from typing import Optional

from tenacity import retry, stop_after_attempt, wait_exponential

from ..clients import supabase, anthropic_client
from ..config import settings
from . import prompts
from .validators import validate_lore_json, scan_forbidden_phrases

log = logging.getLogger("wwt.lore")


class LoreOrchestrator:
    async def run_full_pipeline(self, trip_id: str):
        log.info(f"[{trip_id}] starting lore pipeline")
        
        try:
            supabase.table("trips").update({"lore_status": "processing"}).eq("id", trip_id).execute()
            
            trip = self._get_trip(trip_id)
            photos = self._get_unanalyzed_photos(trip_id)
            members = self._get_members(trip_id)
            
            if len(photos) < 5:
                log.warning(f"[{trip_id}] not enough photos")
                supabase.table("trips").update({"lore_status": "failed"}).eq("id", trip_id).execute()
                return
            
            # Simplified for demo: we'll skip batch analysis and just use a placeholder signal
            aggregated = {
                "aggregated_chaos_score": 75,
                "social_dynamic": "highly chaotic group with no leader",
                "trip_personality": "Goa vibes but with work stress",
                "recurring_behaviors_merged": ["ordering too much food", "sleeping till 11am"]
            }
            
            confessions = []
            lore = await self._generate_core_lore_with_retry(trip, aggregated, confessions)
            
            # Roles
            roles = []
            for member in members:
                role = {
                    "role_title": "The Silent Instigator",
                    "role_description": f"{member['profiles']['display_name']} was the one who suggested every bad idea.",
                    "user_id": member["user_id"],
                    "chaos_rating": 8
                }
                roles.append(role)
            
            # Stats
            stats = [
                {"label": "Photos of food", "value": "42", "unit": "megabytes"},
                {"label": "Chaos level", "value": "High", "unit": "units"}
            ]
            
            self._save_complete_lore(trip_id, lore, roles, stats)
            
            supabase.table("trips").update({"lore_status": "ready"}).eq("id", trip_id).execute()
            log.info(f"[{trip_id}] pipeline complete")
            
        except Exception as e:
            log.exception(f"[{trip_id}] pipeline failed: {e}")
            supabase.table("trips").update({"lore_status": "failed"}).eq("id", trip_id).execute()
    
    def _get_trip(self, trip_id: str) -> dict:
        result = supabase.table("trips").select("*").eq("id", trip_id).single().execute()
        return result.data
    
    def _get_unanalyzed_photos(self, trip_id: str) -> list[dict]:
        result = supabase.table("photos").select("*").eq("trip_id", trip_id).execute()
        return result.data
    
    def _get_members(self, trip_id: str) -> list[dict]:
        result = (
            supabase.table("trip_members")
            .select("*, profiles:user_id(display_name)")
            .eq("trip_id", trip_id)
            .execute()
        )
        return result.data
    
    async def _generate_core_lore_with_retry(self, trip, aggregated, confessions):
        system = prompts.LORE_GENERATION_SYSTEM
        user_prompt = prompts.LORE_GENERATION_USER.format(
            trip_name=trip["name"],
            destination=trip.get("destination", "unknown"),
            start_date=trip.get("trip_start_date", "unknown"),
            end_date=trip.get("trip_end_date", "unknown"),
            duration_days=3,
            member_count=trip["member_count"],
            total_photos=trip["total_photos"],
            aggregated_signal_json=json.dumps(aggregated),
            confessions_json=json.dumps(confessions),
        )
        
        response = anthropic_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=2000,
            system=system,
            messages=[{"role": "user", "content": user_prompt}]
        )
        
        return self._parse_json_response(response.content[0].text)

    def _parse_json_response(self, raw: str) -> dict:
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:-3]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:-3]
        return json.loads(cleaned)

    def _save_complete_lore(self, trip_id, lore, roles, stats):
        supabase.table("trips").update({
            "lore_json": lore,
            "chaos_score": lore.get("chaos_score", 50),
            "lore_generated_at": datetime.utcnow().isoformat(),
        }).eq("id", trip_id).execute()
        
        if lore.get("trip_eras"):
            era_rows = [
                {
                    "trip_id": trip_id,
                    "era_name": era["era_name"],
                    "timeframe": era.get("timeframe"),
                    "description": era.get("description"),
                    "display_order": i,
                }
                for i, era in enumerate(lore["trip_eras"])
            ]
            supabase.table("trip_eras").upsert(era_rows).execute()
        
        for role in roles:
            supabase.table("trip_members").update({
                "role_title": role["role_title"],
                "role_description": role["role_description"],
                "role_chaos_rating": role.get("chaos_rating"),
            }).eq("trip_id", trip_id).eq("user_id", role["user_id"]).execute()
        
        if stats:
            stat_rows = [
                {
                    "trip_id": trip_id,
                    "label": s["label"],
                    "value": str(s["value"]),
                    "unit": s.get("unit"),
                    "display_order": i,
                }
                for i, s in enumerate(stats)
            ]
            supabase.table("trip_stats").upsert(stat_rows).execute()
