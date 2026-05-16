"""
Nostalgia engine: surfaces emotionally resonant memories from the past.

Two modes:
  1. today()  — "This day in history" based on calendar date
  2. echo()   — visually similar photos across trips (memory echo)

Scoring combines chaos_score (raw chaos) + recency_penalty (older = more
weight, because nostalgia intensifies with time) + member_overlap (shared
memories with the same people hit harder).
"""

import logging
from datetime import datetime, timezone
from .clients import supabase

log = logging.getLogger("wwt.nostalgia")


class NostalgiaEngine:
    def get_today_moments(self, user_id: str, limit: int = 10) -> list[dict]:
        """
        Pull photos from the same calendar date (±3 days) in past trips.
        Ordered by our nostalgia score: chaos × years_ago_bonus.
        """
        try:
            result = (
                supabase.rpc(
                    "get_nostalgia_moments",
                    {"p_user_id": user_id, "p_limit": limit * 2},
                )
                .execute()
                .data
            ) or []

            scored = [self._score(row) for row in result]
            scored.sort(key=lambda x: x["nostalgia_score"], reverse=True)
            return scored[:limit]

        except Exception:
            log.exception("[nostalgia] get_today_moments failed")
            return []

    def get_memory_echo(self, photo_id: str, user_id: str, limit: int = 5) -> list[dict]:
        """
        Find visually similar photos from other trips using CLIP embeddings.
        Returns empty list if the photo hasn't been embedded yet.
        """
        try:
            result = (
                supabase.rpc(
                    "find_similar_photos",
                    {"p_photo_id": photo_id, "p_user_id": user_id, "p_limit": limit},
                )
                .execute()
                .data
            ) or []
            return result
        except Exception:
            log.exception("[nostalgia] get_memory_echo failed")
            return []

    def _score(self, row: dict) -> dict:
        chaos = row.get("chaos_score") or 50
        years_ago = row.get("years_ago") or 1

        # Older memories get a log-scale boost (1yr=1x, 3yr=1.5x, 7yr=2x)
        import math
        age_bonus = 1 + math.log1p(years_ago) * 0.5

        row["nostalgia_score"] = round(chaos * age_bonus, 1)
        return row
