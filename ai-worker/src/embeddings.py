"""
CLIP ViT-B/32 embedding extraction for the photo memory echo system.

Model: openai/clip-vit-base-patch32
Dim:   512
Cost:  ~50ms CPU per photo (no GPU required)
Storage: vector(512) in Postgres via pgvector

Embeddings are L2-normalized before storage so cosine similarity =
dot product, which works correctly with pgvector's <=> cosine operator.
"""

import io
import asyncio
import logging
import numpy as np
from .clients import supabase

log = logging.getLogger("wwt.embeddings")

_clip_processor = None
_clip_model = None


def _load_clip():
    global _clip_processor, _clip_model
    if _clip_model is None:
        from transformers import CLIPProcessor, CLIPModel
        log.info("[clip] loading openai/clip-vit-base-patch32 ...")
        _clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
        _clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        _clip_model.eval()
        log.info("[clip] model ready")
    return _clip_processor, _clip_model


def _extract_sync(image_bytes: bytes) -> list[float]:
    import torch
    from PIL import Image

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    processor, model = _load_clip()
    inputs = processor(images=img, return_tensors="pt")
    with torch.no_grad():
        features = model.get_image_features(**inputs)
    vec = features[0].numpy().astype(np.float32)
    # L2-normalize so pgvector <=> gives true cosine similarity
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm
    return vec.tolist()


async def embed_photo(photo_id: str) -> None:
    """Download photo from storage, extract CLIP embedding, persist to DB."""
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

        raw = supabase.storage.from_("trip-photos").download(photo["storage_path"])
        embedding = await asyncio.to_thread(_extract_sync, raw)

        supabase.table("photos").update({"clip_embedding": embedding}).eq("id", photo_id).execute()
        log.info(f"[embed] {photo_id}: stored {len(embedding)}-dim embedding")

    except Exception:
        log.exception(f"[embed] {photo_id}: failed")


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
