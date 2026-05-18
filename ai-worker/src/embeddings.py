"""
Photo embedding extraction via Voyage AI multimodal API.

Model: voyage-multimodal-3 (replaces on-device CLIP ViT-B/32)
Dim:   1024 (voyage-multimodal-3 default)
Cost:  API call per photo — skipped entirely when VOYAGE_API_KEY is not set.

Embeddings are stored in the clip_embedding column so downstream
pgvector queries (<=> cosine operator) continue to work unchanged.

Graceful degradation: if VOYAGE_API_KEY is absent or the API call fails,
embed_photo sets embedding_status="failed" so the frontend can hide the
findSimilar UI for trips where >20% of photos couldn't be embedded.
"""

import os
import logging
import httpx
from .clients import supabase

log = logging.getLogger("wwt.embeddings")

_VOYAGE_API_URL = "https://api.voyageai.com/v1/multimodalembeddings"
_VOYAGE_MODEL   = "voyage-multimodal-3"


async def _embed_image_url(image_url: str) -> list[float] | None:
    """Call Voyage AI multimodal embeddings API. Returns None on any failure."""
    api_key = os.environ.get("VOYAGE_API_KEY")
    if not api_key:
        log.debug("[embed] VOYAGE_API_KEY not set — skipping embedding")
        return None
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                _VOYAGE_API_URL,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "inputs": [{"content": [{"type": "image_url", "url": image_url}]}],
                    "model": _VOYAGE_MODEL,
                },
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
    except Exception as e:
        log.warning(f"[embed] Voyage API call failed: {e}")
        return None


async def embed_photo(photo_id: str) -> None:
    """Fetch photo public URL, extract Voyage embedding, persist to DB."""
    try:
        photo = (
            supabase.table("photos")
            .select("id, storage_path, clip_embedding")
            .eq("id", photo_id)
            .single()
            .execute()
            .data
        )
        if not photo:
            log.error(f"[embed] {photo_id}: not found")
            return
        if photo.get("clip_embedding") is not None:
            log.debug(f"[embed] {photo_id}: already embedded, skipping")
            return

        # Build a public URL from the storage path so Voyage can fetch the image
        storage_path = photo["storage_path"]
        public_url = (
            supabase.storage.from_("trip-photos").get_public_url(storage_path)
        )

        embedding = await _embed_image_url(public_url)

        if embedding is None:
            # API unavailable or key missing — mark failed so UI can respond correctly
            supabase.table("photos").update({
                "embedding_status": "failed",
            }).eq("id", photo_id).execute()
            log.warning(f"[embed] {photo_id}: no embedding returned, marked failed")
            return

        supabase.table("photos").update({
            "clip_embedding":   embedding,
            "embedding_status": "ready",
        }).eq("id", photo_id).execute()
        log.info(f"[embed] {photo_id}: stored {len(embedding)}-dim embedding")

    except Exception:
        log.exception(f"[embed] {photo_id}: failed")
        try:
            supabase.table("photos").update({
                "embedding_status": "failed",
            }).eq("id", photo_id).execute()
        except Exception:
            log.exception(f"[embed] {photo_id}: could not write failed status")


async def backfill_trip_embeddings(trip_id: str) -> int:
    """Embed all unembedded photos for a trip. Returns count processed."""
    rows = (
        supabase.table("photos")
        .select("id")
        .eq("trip_id", trip_id)
        .is_("clip_embedding", "null")
        .execute()
        .data
    ) or []

    for row in rows:
        await embed_photo(row["id"])

    return len(rows)
