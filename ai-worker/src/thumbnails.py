from PIL import Image
import io
import logging
from .clients import supabase

log = logging.getLogger("wwt.thumbnails")

async def generate_thumbnail(photo_id: str):
    try:
        photo = supabase.table("photos").select("*").eq("id", photo_id).single().execute().data
        original_bytes = supabase.storage.from_("trip-photos").download(photo["storage_path"])
        
        img = Image.open(io.BytesIO(original_bytes))
        img.thumbnail((300, 300), Image.LANCZOS)
        
        thumb_path = photo["storage_path"].replace(".", "_thumb.")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        buf.seek(0)
        
        supabase.storage.from_("trip-photos").upload(
            thumb_path,
            buf.getvalue(),
            {"content-type": "image/jpeg"},
        )
        
        supabase.table("photos").update({
            "thumbnail_path": thumb_path,
            "width": img.width,
            "height": img.height,
        }).eq("id", photo_id).execute()
        
        log.info(f"[{photo_id}] thumbnail generated")
    except Exception as e:
        log.exception(f"[{photo_id}] thumbnail failed: {e}")
