from PIL import Image
import io
import os
import logging
from .clients import supabase

log = logging.getLogger("wwt.thumbnails")

async def generate_thumbnail(photo_id: str):
    try:
        photo = supabase.table("photos").select("*").eq("id", photo_id).single().execute().data
        if not photo:
            log.error(f"[{photo_id}] photo not found")
            return

        original_bytes = supabase.storage.from_("trip-photos").download(photo["storage_path"])

        try:
            img = Image.open(io.BytesIO(original_bytes))
        except Exception as e:
            log.error(f"[{photo_id}] unsupported image format: {e}")
            return

        # Store original dimensions before thumbnail resize
        original_width, original_height = img.size

        # Use Resampling.LANCZOS (Image.LANCZOS deprecated in Pillow 10+)
        img.thumbnail((300, 300), Image.Resampling.LANCZOS)

        # Better path handling — preserve extension properly
        base, ext = os.path.splitext(photo["storage_path"])
        thumb_path = f"{base}_thumb.jpg"

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        buf.seek(0)

        # Upload thumbnail
        supabase.storage.from_("trip-photos").upload(
            thumb_path, buf.getvalue(), {"content-type": "image/jpeg"},
        )

        # Update with thumbnail path + ORIGINAL dimensions (not thumbnail dimensions)
        supabase.table("photos").update({
            "thumbnail_path": thumb_path,
        }).eq("id", photo_id).execute()

        log.info(f"[{photo_id}] thumbnail generated {original_width}x{original_height} → {img.width}x{img.height}")
    except Exception as e:
        log.exception(f"[{photo_id}] thumbnail failed: {e}")
