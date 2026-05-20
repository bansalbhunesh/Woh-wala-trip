"""
Image generation via fal.ai Sana Sprint.
Three generators: trip cover, character portraits, era thumbnails.
All are fire-and-forget — errors never block the lore pipeline.

Abuse guards:
  1. Idempotency   — skip any asset that already has a URL in the DB.
  2. Daily budget  — hard cap on total fal.ai calls per 24h (FAL_DAILY_BUDGET).
  3. Per-trip limit — max FAL_TRIP_DAILY_LIMIT full image-gen runs per trip per 24h.
  4. Era cap       — max FAL_MAX_ERAS thumbnails per trip regardless of era count.
"""

import asyncio
import logging
import time
import threading
from datetime import date

import httpx

from .clients import supabase
from .config import settings

log = logging.getLogger("wwt.image_gen")

_FAL_URL = "https://fal.run/fal-ai/sana-sprint"

_NEGATIVE = (
    "text, watermark, logo, signature, words, letters, numbers, "
    "blurry, low quality, distorted, disfigured, ugly, noise, "
    "western faces, corporate stock photo, generic travel blog"
)

_LANDSCAPE = "landscape_16_9"
_SQUARE = "square_hd"


# ---------------------------------------------------------------------------
# Abuse guards — daily budget persisted to Supabase fal_budget table
# (COST-02: survives worker restarts on Render free tier)
# ---------------------------------------------------------------------------

# In-process lock guards concurrent threads calling _budget_ok simultaneously.
# The Supabase upsert is the authoritative counter; the in-process state is
# only used to avoid redundant DB reads within the same process wake-up.
_budget_lock = threading.Lock()

# trip_id -> (call_count, window_end_ts) — still in-process; trips restart less often
_trip_window: dict[str, tuple[int, float]] = {}


def _get_today_key() -> str:
    """Return today's date string (UTC) as the fal_budget primary key."""
    return date.today().isoformat()


def _budget_ok() -> bool:
    """Claim one slot from the global daily fal.ai budget.

    Uses a single atomic Postgres UPDATE to increment the counter only when
    it is below the daily cap. Falls back to INSERT on the first call of the day.
    Thread-safe via _budget_lock. Returns False if budget is exhausted.
    """
    with _budget_lock:
        today = _get_today_key()
        try:
            # Atomic conditional increment: only increments if current count < cap.
            # Returns the updated row so we can inspect the new count.
            result = supabase.rpc(
                "claim_fal_budget_slot",
                {"p_date": today, "p_cap": settings.FAL_DAILY_BUDGET},
            ).execute()

            # RPC returns True if a slot was claimed, False if cap was reached.
            if not result.data:
                log.warning(
                    f"[image_gen] daily budget exhausted "
                    f"({settings.FAL_DAILY_BUDGET} calls) — skipping"
                )
                return False

            # Check remaining budget (best-effort; log only)
            try:
                resp = supabase.table("fal_budget").select("calls_count").eq("date", today).execute()
                rows = resp.data or []
                current = rows[0]["calls_count"] if rows else 0
                remaining = settings.FAL_DAILY_BUDGET - current
                if remaining <= 10:
                    log.warning(f"[image_gen] fal.ai budget low: {remaining} calls left today")
            except Exception:
                pass

            return True

        except Exception as e:
            # RPC not available (old schema) — fall back to read-then-increment.
            # This retains the pre-existing behaviour with a known TOCTOU window.
            log.warning(f"[image_gen] claim_fal_budget_slot RPC unavailable, using fallback: {e}")
            try:
                resp = supabase.table("fal_budget").select("calls_count").eq("date", today).execute()
                rows = resp.data or []
                current_count: int = rows[0]["calls_count"] if rows else 0
                if current_count >= settings.FAL_DAILY_BUDGET:
                    log.warning(f"[image_gen] daily budget exhausted ({settings.FAL_DAILY_BUDGET} calls) — skipping")
                    return False
                supabase.table("fal_budget").upsert(
                    {"date": today, "calls_count": current_count + 1},
                    on_conflict="date",
                ).execute()
                return True
            except Exception as e2:
                log.error(f"[image_gen] fal_budget DB check failed (failing CLOSED): {e2}")
                return False


def _trip_quota_ok(trip_id: str) -> bool:
    """Check per-trip daily limit. Returns False if the trip has hit its cap."""
    with _budget_lock:
        now = time.time()
        count, window_end = _trip_window.get(trip_id, (0, 0.0))
        if now > window_end:
            count, window_end = 0, now + 86_400
        if count >= settings.FAL_TRIP_DAILY_LIMIT:
            log.warning(
                f"[{trip_id}] per-trip image-gen limit reached "
                f"({settings.FAL_TRIP_DAILY_LIMIT}/day) — skipping"
            )
            return False
        _trip_window[trip_id] = (count + 1, window_end)
        return True


# ---------------------------------------------------------------------------
# Core helpers
# ---------------------------------------------------------------------------

async def _call_fal(prompt: str, image_size: str = _LANDSCAPE) -> bytes | None:
    """Call fal.ai Sana Sprint after passing all budget checks."""
    if not settings.FAL_API_KEY:
        log.info("[image_gen] FAL_API_KEY not set — skipping")
        return None
    if not _budget_ok():
        return None

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                _FAL_URL,
                headers={"Authorization": f"Key {settings.FAL_API_KEY}"},
                json={
                    "prompt": prompt,
                    "negative_prompt": _NEGATIVE,
                    "image_size": image_size,
                    "num_inference_steps": 18,
                    "guidance_scale": 4.5,
                    "num_images": 1,
                },
            )
            resp.raise_for_status()
            image_url = resp.json()["images"][0]["url"]

            img = await client.get(image_url, timeout=30)
            img.raise_for_status()
            return img.content
    except Exception as e:
        log.error(f"[image_gen] fal.ai failed: {e}")
        return None


def _upload(bucket: str, path: str, data: bytes) -> str | None:
    """Upload bytes to Supabase Storage. Returns public URL or None."""
    try:
        supabase.storage.from_(bucket).upload(
            path, data, {"content-type": "image/png", "upsert": "true"}
        )
        result = supabase.storage.from_(bucket).get_public_url(path)
        if isinstance(result, str):
            return result
        if isinstance(result, dict):
            return result.get("publicUrl") or result.get("publicURL")
        return str(result)
    except Exception as e:
        log.error(f"[image_gen] upload failed {bucket}/{path}: {e}")
        return None


# ---------------------------------------------------------------------------
# 1. Trip cover — cinematic landscape poster art
# ---------------------------------------------------------------------------

_COVER_MOOD = {
    "Mildly Simmering":     "golden hour warm tones, gentle soft bokeh, playful outdoor light",
    "Emotionally Unstable": "dramatic side lighting, warm ambers, deep moody shadows",
    "Peak Delusion":        "vivid saturated colors, surreal neon-tinged dusk, cinematic excess",
    "Historically Cooked":  "high contrast chiaroscuro, deep shadows, epic scale, intense drama",
}


async def generate_trip_cover(trip_id: str, force: bool = False):
    """Generate a cinematic cover image. Saves URL to trips.cover_image_url.
    Skips if cover_image_url already set (unless force=True).
    """
    trip = (
        supabase.table("trips")
        .select("id, name, destination, lore_json, chaos_score, cover_image_url")
        .eq("id", trip_id)
        .single()
        .execute()
        .data
    )
    if not trip or not trip.get("lore_json"):
        return

    # Idempotency: skip if already generated
    if not force and trip.get("cover_image_url"):
        log.info(f"[{trip_id}] cover already exists — skipping (pass force=True to regenerate)")
        return

    lore = trip["lore_json"]
    destination = trip.get("destination") or "India"
    verdict = lore.get("cooked_verdict", "Emotionally Unstable")
    personality = lore.get("trip_personality_type", "chaotic Indian friend group")
    mood = _COVER_MOOD.get(verdict, "warm dramatic Indian golden hour light")

    prompt = (
        f"Cinematic travel poster. {destination}, India. "
        f"{personality}. {mood}. "
        f"Analog film grain, vintage photography, warm saturated tones. "
        f"Environmental atmosphere — streets, lights, food stalls, landscapes, architecture. "
        f"No people. No faces. No text. No logos. "
        f"Wes Anderson meets Bollywood production design. High-resolution editorial."
    )

    log.info(f"[{trip_id}] generating trip cover")
    data = await _call_fal(prompt, _LANDSCAPE)
    if not data:
        return

    url = await asyncio.to_thread(_upload, "trip-covers", f"{trip_id}/cover.png", data)
    if url:
        supabase.table("trips").update({"cover_image_url": url}).eq("id", trip_id).execute()
        log.info(f"[{trip_id}] cover saved")


# ---------------------------------------------------------------------------
# 2. Character portraits — per-member archetype art cards
# ---------------------------------------------------------------------------

def _chaos_visual(chaos_rating: int) -> str:
    """Map chaos rating (0-10) to a visual style for portrait art generation."""
    if chaos_rating >= 9:
        return "vivid reds and electric oranges, chaotic layered composition, motion blur energy"
    if chaos_rating >= 7:
        return "bold high-contrast drama, warm ambers and deep shadows, cinematic presence"
    if chaos_rating >= 5:
        return "warm ambient golden light, dynamic but grounded composition, candid mood"
    if chaos_rating >= 3:
        return "soft muted earth tones, gentle worn textures, calm and composed atmosphere"
    return "moody cool-toned shadows, quiet indigo palette, still and observational"


async def generate_character_portraits(trip_id: str, force: bool = False):
    """Generate portrait art cards for all members with assigned roles.
    Skips members that already have portrait_url (unless force=True).
    """
    members = (
        supabase.table("trip_members")
        .select("user_id, role_title, role_archetype_tag, role_chaos_rating, portrait_url")
        .eq("trip_id", trip_id)
        .not_.is_("role_title", "null")
        .execute()
        .data or []
    )
    if not members:
        return

    # Filter out already-generated unless forced
    to_generate = [m for m in members if force or not m.get("portrait_url")]
    skipped = len(members) - len(to_generate)
    if skipped:
        log.info(f"[{trip_id}] skipping {skipped} portrait(s) already generated")
    if not to_generate:
        return

    sem = asyncio.Semaphore(3)

    async def _one(m: dict):
        async with sem:
            await _gen_portrait(trip_id, m)

    await asyncio.gather(*[_one(m) for m in to_generate], return_exceptions=True)


async def _gen_portrait(trip_id: str, member: dict):
    uid = member["user_id"]
    role = member.get("role_title", "The Mysterious One")
    chaos = member.get("role_chaos_rating") or 5
    visual = _chaos_visual(int(chaos))
    energy = "electric chaotic" if chaos >= 8 else "moderate dynamic" if chaos >= 5 else "calm composed"

    prompt = (
        f"Character art card. '{role}'. Indian trip archetype portrait. "
        f"{visual}. {energy} energy. "
        f"Symbolic objects, textures, and atmosphere representing this person. "
        f"Abstract artistic representation. No faces. No text. "
        f"Analog film grain. Square format. Rich color depth."
    )

    data = await _call_fal(prompt, _SQUARE)
    if not data:
        return

    url = await asyncio.to_thread(_upload, "trip-portraits", f"{trip_id}/{uid}.png", data)
    if url:
        supabase.table("trip_members").update({"portrait_url": url}).eq(
            "trip_id", trip_id
        ).eq("user_id", uid).execute()
        log.info(f"[{trip_id}] portrait saved for {uid}")


# ---------------------------------------------------------------------------
# 3. Era thumbnails — documentary stills for each narrative chapter
# ---------------------------------------------------------------------------

def _time_mood(timeframe: str) -> str:
    tl = (timeframe or "").lower()
    if any(k in tl for k in ("night", "midnight", "3 am", "late", "2 am")):
        return "blue-hour night, ambient street lights, moody darkness, neon spill"
    if any(k in tl for k in ("morning", "sunrise", "dawn", "early")):
        return "soft pastel morning light, hazy mist, quiet atmosphere"
    if any(k in tl for k in ("afternoon", "lunch", "midday")):
        return "harsh midday sun, bleached warmth, high-contrast shadows"
    return "golden hour, warm long shadows, cinematic dusk"


async def generate_era_thumbnails(trip_id: str, force: bool = False):
    """Generate a documentary thumbnail for each trip era.
    Skips eras that already have thumbnail_url (unless force=True).
    Caps at FAL_MAX_ERAS thumbnails per trip.
    """
    trip = (
        supabase.table("trips")
        .select("destination")
        .eq("id", trip_id)
        .single()
        .execute()
        .data
    )
    destination = (trip or {}).get("destination") or "India"

    eras = (
        supabase.table("trip_eras")
        .select("id, era_name, timeframe, description, display_order, thumbnail_url")
        .eq("trip_id", trip_id)
        .order("display_order")
        .execute()
        .data or []
    )
    if not eras:
        return

    # Filter already-generated unless forced, then apply era cap
    to_generate = [e for e in eras if force or not e.get("thumbnail_url")]
    skipped = len(eras) - len(to_generate)
    if skipped:
        log.info(f"[{trip_id}] skipping {skipped} era thumbnail(s) already generated")

    # Hard cap: never send more than FAL_MAX_ERAS calls for era thumbnails
    cap = settings.FAL_MAX_ERAS
    if len(to_generate) > cap:
        log.info(f"[{trip_id}] capping era thumbnails at {cap} (trip has {len(to_generate)} pending)")
        to_generate = to_generate[:cap]

    if not to_generate:
        return

    sem = asyncio.Semaphore(3)

    async def _one(era: dict):
        async with sem:
            await _gen_era_thumbnail(trip_id, era, destination)

    await asyncio.gather(*[_one(e) for e in to_generate], return_exceptions=True)


async def _gen_era_thumbnail(trip_id: str, era: dict, destination: str):
    era_id = era["id"]
    era_name = era.get("era_name", "")
    desc = (era.get("description") or "")[:120]
    mood = _time_mood(era.get("timeframe", ""))

    prompt = (
        f"Documentary scene thumbnail. Chapter: '{era_name}'. {destination}. "
        f"{mood}. "
        f"Scene: {desc}. "
        f"Candid travel photography. Environmental storytelling. "
        f"No people visible. No text. No logos. "
        f"16:9 cinematic frame. Film grain. Atmospheric color grade."
    )

    data = await _call_fal(prompt, _LANDSCAPE)
    if not data:
        return

    url = await asyncio.to_thread(
        _upload, "trip-era-thumbnails", f"{trip_id}/{era_id}.png", data
    )
    if url:
        supabase.table("trip_eras").update({"thumbnail_url": url}).eq("id", era_id).execute()
        log.info(f"[{trip_id}] era thumbnail saved for {era_id}")


# ---------------------------------------------------------------------------
# Entry point used by orchestrator — applies trip-level quota before any work
# ---------------------------------------------------------------------------

async def generate_all_images(trip_id: str, force: bool = False):
    """Run all 3 generators for a trip. Checks per-trip quota first."""
    if not _trip_quota_ok(trip_id):
        return
    await asyncio.gather(
        generate_trip_cover(trip_id, force=force),
        generate_character_portraits(trip_id, force=force),
        generate_era_thumbnails(trip_id, force=force),
        return_exceptions=True,
    )
