from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager
from collections import defaultdict
import asyncio
import httpx
import os
import time
import logging
from datetime import datetime, timezone

from .auth import verify_hmac_signature
from .lore.orchestrator import LoreOrchestrator
from .thumbnails import generate_thumbnail
from .config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s — %(message)s'
)
log = logging.getLogger("wwt")


def _mark_job_done(trip_id: str):
    from .clients import supabase
    supabase.table("generation_jobs").update({
        "status": "done",
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("trip_id", trip_id).eq("status", "claimed").execute()


def _mark_job_failed(trip_id: str, error: str):
    from .clients import supabase
    supabase.table("generation_jobs").update({
        "status": "failed",
        "error": error[:500],
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("trip_id", trip_id).eq("status", "claimed").execute()


async def poll_job_queue():
    """Poll generation_jobs every 60s for jobs that the HTTP trigger couldn't start.
    Uses claim_generation_job() Postgres function (FOR UPDATE SKIP LOCKED) to prevent
    double-processing when multiple worker instances run concurrently."""
    from .clients import supabase
    # Wait 10s on startup to let the server fully boot before polling
    await asyncio.sleep(10)
    _tick = 0
    while True:
        try:
            result = await asyncio.to_thread(
                lambda: supabase.rpc("claim_generation_job").execute()
            )
            trip_id: str | None = result.data
            if trip_id:
                log.info(f"[job-queue] claimed trip {trip_id} from DB queue")
                try:
                    await LoreOrchestrator().run_full_pipeline(trip_id)
                    await asyncio.to_thread(lambda: _mark_job_done(trip_id))
                except Exception as e:
                    log.exception(f"[job-queue] pipeline failed for {trip_id}: {e}")
                    await asyncio.to_thread(lambda: _mark_job_failed(trip_id, str(e)))
        except asyncio.CancelledError:
            break
        except Exception as e:
            log.exception(f"[job-queue] poll error: {e}")

        # Phase 1: reset stuck pipelines every ~30 min (every 30 poll ticks)
        _tick += 1
        if _tick % 30 == 0:
            try:
                await LoreOrchestrator.reset_stuck_pipelines()
            except Exception as e:
                log.error(f"[job-queue] reset_stuck_pipelines error: {e}")

        await asyncio.sleep(60)


async def poll_background_jobs():
    """Poll background_jobs every 60s for pending jobs.
    REL-01/REL-02: extended to handle missing_person_card and judge_battle in addition to image_generation.
    Survives worker cold-starts — jobs inserted while worker was down are claimed on next poll tick."""
    from .clients import supabase
    await asyncio.sleep(15)  # offset from main queue poll
    while True:
        try:
            # Claim one pending job of any supported type (FIFO by created_at)
            result = await asyncio.to_thread(
                lambda: supabase.table("background_jobs")
                    .select("id, trip_id, job_type, payload, trace_id")
                    .eq("status", "pending")
                    .in_("job_type", ["image_generation", "missing_person_card", "judge_battle", "embed_photo", "yearly_wrap"])
                    .order("created_at")
                    .limit(1)
                    .execute()
            )
            rows = result.data or []
            if rows:
                job = rows[0]
                jid = job["id"]
                trip_id = job["trip_id"]
                job_type = job["job_type"]
                payload = job.get("payload") or {}

                # Atomic claim — only proceeds if still pending (guard against duplicate workers)
                await asyncio.to_thread(
                    lambda: supabase.table("background_jobs").update({
                        "status":     "claimed",
                        "claimed_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("id", jid).eq("status", "pending").execute()
                )
                log.info(f"[bg-jobs] claimed {job_type} job {jid} for trip {trip_id}")

                try:
                    if job_type == "image_generation":
                        from .image_gen import generate_all_images
                        await generate_all_images(trip_id)

                    elif job_type == "missing_person_card":
                        # REL-01: payload.absent_user_id inserted by trips.markAbsent
                        absent_user_id = payload.get("absent_user_id")
                        if not absent_user_id:
                            raise ValueError(
                                "missing_person_card job missing absent_user_id in payload"
                            )
                        await LoreOrchestrator().generate_missing_person(trip_id, absent_user_id)

                    elif job_type == "judge_battle":
                        # REL-02: payload.battle_id inserted by battles.challenge
                        battle_id = payload.get("battle_id")
                        if not battle_id:
                            raise ValueError(
                                "judge_battle job missing battle_id in payload"
                            )
                        await LoreOrchestrator().judge_battle(battle_id)

                    elif job_type == "embed_photo":
                        # PERF-05: queued by confirmUpload instead of HTTP fire-and-forget.
                        # Prevents 40 rapid-fire HTTP requests on a 20-photo bulk upload.
                        photo_id = payload.get("photo_id")
                        if not photo_id:
                            raise ValueError("embed_photo job missing photo_id in payload")
                        from .embeddings import embed_photo
                        await embed_photo(photo_id)

                    elif job_type == "yearly_wrap":
                        # Queue fallback for trips.generateYearlyWrap when the HTTP
                        # trigger fails (cold start, transient network, missing env).
                        # payload carries user_id / year / trip_ids inserted by the tRPC mutation.
                        wrap_user_id = payload.get("user_id")
                        wrap_year = payload.get("year")
                        wrap_trip_ids = payload.get("trip_ids") or []
                        if not wrap_user_id or not wrap_year or not wrap_trip_ids:
                            raise ValueError("yearly_wrap job missing user_id / year / trip_ids in payload")
                        await generate_yearly_wrap(wrap_trip_ids, wrap_user_id, int(wrap_year))

                    else:
                        # Unknown job type — mark failed so it doesn't block the queue
                        raise ValueError(f"Unknown job_type: {job_type!r}")

                    await asyncio.to_thread(
                        lambda: supabase.table("background_jobs").update({
                            "status":       "done",
                            "completed_at": datetime.now(timezone.utc).isoformat(),
                        }).eq("id", jid).execute()
                    )
                    log.info(f"[bg-jobs] {job_type} done for trip {trip_id}")

                except Exception as e:
                    log.error(f"[bg-jobs] {job_type} failed for {trip_id}: {e}")
                    await asyncio.to_thread(
                        lambda: supabase.table("background_jobs").update({
                            "status":       "failed",
                            "error":        str(e)[:500],
                            "completed_at": datetime.now(timezone.utc).isoformat(),
                        }).eq("id", jid).execute()
                    )

        except asyncio.CancelledError:
            break
        except Exception as e:
            log.exception(f"[bg-jobs] poll error: {e}")
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup validation ---
    required = [
        "ANTHROPIC_API_KEY",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "AI_WORKER_SECRET",
        "AI_WORKER_HMAC_SECRET",
    ]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        log.critical(f"FATAL: Missing required env vars: {missing}. Worker cannot start.")
        raise SystemExit(1)
    log.info("All required environment variables present")
    log.info(f"Worker starting — model={settings.CLAUDE_MODEL}")

    poll_task    = asyncio.create_task(poll_job_queue())
    bg_jobs_task = asyncio.create_task(poll_background_jobs())
    yield
    poll_task.cancel()
    bg_jobs_task.cancel()
    for task in (poll_task, bg_jobs_task):
        try:
            await task
        except asyncio.CancelledError:
            pass
    log.info("WWT AI Worker shutting down.")


# Disable auto-docs in production to hide debug/internal endpoint metadata.
# Only expose Swagger UI + ReDoc when DEBUG_ENABLED is set.
_is_debug = settings.DEBUG_ENABLED == "true"
app = FastAPI(
    lifespan=lifespan,
    title="WWT AI Worker v2",
    docs_url="/docs" if _is_debug else None,
    redoc_url="/redoc" if _is_debug else None,
    openapi_url="/openapi.json" if _is_debug else None,
)

# In-memory per-trip cooldown — prevents hammering a single trip through the HTTP trigger.
# 5-minute window; resets on successful completion via mark_job_done.
# Single-instance fallback when Redis is not configured.
_lore_last_triggered: dict[str, float] = defaultdict(float)
_LORE_COOLDOWN_SEC = 300


def _check_memory_cooldown(trip_id: str, cooldown_seconds: int) -> bool:
    """In-process cooldown check. Returns True if OK to proceed, False if in cooldown."""
    now = time.time()
    last = _lore_last_triggered[trip_id]
    if last and now - last < cooldown_seconds:
        return False
    _lore_last_triggered[trip_id] = now
    return True


async def check_and_set_cooldown(trip_id: str, cooldown_seconds: int = _LORE_COOLDOWN_SEC) -> bool:
    """Cross-instance cooldown using Redis SET NX EX via Upstash REST API.

    Returns True if OK to proceed (no recent trigger from any instance),
    False if already in cooldown window.

    Falls back to in-memory check if Redis is not configured (single-instance mode).
    """
    redis_url = settings.REDIS_URL
    redis_token = settings.REDIS_TOKEN

    if not redis_url or not redis_token:
        # No Redis configured — fall back to in-process dict (single instance only)
        return _check_memory_cooldown(trip_id, cooldown_seconds)

    key = f"lore_cooldown:{trip_id}"
    # Upstash REST: POST /set/<key>/<value>/EX/<ttl>/NX
    # Returns "OK" if the key was newly set (not in cooldown), or null if already existed.
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.post(
                f"{redis_url}/set/{key}/1/EX/{cooldown_seconds}/NX",
                headers={"Authorization": f"Bearer {redis_token}"},
            )
            result = resp.json()
            return result == "OK"
    except Exception as e:
        # Redis unavailable — fall back to in-memory so generation isn't blocked
        log.warning(f"[redis-cooldown] Redis check failed ({e!r}), falling back to in-memory")
        return _check_memory_cooldown(trip_id, cooldown_seconds)


def verify_auth(authorization: str = Header(...)):
    expected = f"Bearer {settings.AI_WORKER_SECRET}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid auth token")


class LoreRequest(BaseModel):
    trip_id: str

class ThumbnailRequest(BaseModel):
    photo_id: str

class MissingPersonRequest(BaseModel):
    trip_id: str
    absent_user_id: str

class BattleRequest(BaseModel):
    battle_id: str

class EmbedRequest(BaseModel):
    photo_id: str

class BackfillEmbedRequest(BaseModel):
    trip_id: str

class NostalgiaRequest(BaseModel):
    user_id: str
    limit: int = 10

class MemoryEchoRequest(BaseModel):
    photo_id: str
    user_id: str
    limit: int = 5

class ImageGenRequest(BaseModel):
    trip_id: str

class YearlyWrapRequest(BaseModel):
    trip_ids: list[str]
    user_id: str
    year: int = 2025


async def generate_yearly_wrap(trip_ids: list[str], user_id: str, year: int):
    """Generate a yearly wrap summary for a user based on their trips from that year."""
    from .clients import supabase, anthropic_client
    from .config import settings
    import json

    log.info(f"[yearly-wrap] generating for user={user_id} year={year} trips={len(trip_ids)}")
    try:
        # Fetch trip lore data
        trips_data = []
        for tid in trip_ids:
            row = supabase.table("trips").select("id, name, destination, chaos_score, lore_json").eq("id", tid).single().execute().data
            if row:
                trips_data.append(row)

        if not trips_data:
            log.warning(f"[yearly-wrap] no trip data found for user={user_id}")
            return

        avg_chaos = round(sum(t.get("chaos_score") or 0 for t in trips_data) / len(trips_data))
        destinations = [t.get("destination") or "Unknown" for t in trips_data]

        prompt = f"""You are Yaarlore's yearly wrap generator. Analyze these {len(trips_data)} trips from {year} and create a cinematic yearly wrap.

Trips: {json.dumps([{"name": t["name"], "destination": t.get("destination"), "chaos_score": t.get("chaos_score")} for t in trips_data], indent=2)}

Return a JSON object with these exact keys:
- headline: string (e.g. "The Year You Lost Your Mind in 3 States")
- chaos_average: number (average chaos score)
- trip_count: number
- top_destination: string (most chaotic or memorable)
- year_verdict: string (1 cinematic sentence summarizing the year)
- era_title: string (give this year a name, e.g. "The Unhinged Arc")
- superlative: string (e.g. "Most Cooked Friend Group of {year}")
- chaos_tier: string (one of: "Chill", "Simmering", "Cooked", "Certified Unhinged")

Return only the JSON object, no markdown."""

        resp = await anthropic_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}]
        )
        # Tolerate Claude wrapping JSON in a ```json ... ``` fence.
        raw = resp.content[0].text.strip()
        if raw.startswith("```"):
            # Strip the first line (```json or ```) and the trailing fence
            lines = raw.split("\n")
            raw = "\n".join(lines[1:]).rstrip("` \n")
        wrap_json = json.loads(raw)
        wrap_json["chaos_average"] = avg_chaos
        wrap_json["trip_count"] = len(trips_data)
        wrap_json["destinations"] = destinations

        # Upsert into yearly_wraps
        supabase.table("yearly_wraps").upsert({
            "user_id": user_id,
            "year": year,
            "trip_ids": trip_ids,
            "wrap_json": wrap_json,
            "status": "ready",
        }, on_conflict="user_id,year").execute()
        log.info(f"[yearly-wrap] done for user={user_id} year={year}")
    except Exception as e:
        log.exception(f"[yearly-wrap] failed for user={user_id} year={year}: {e}")
        try:
            supabase.table("yearly_wraps").upsert({
                "user_id": user_id,
                "year": year,
                "trip_ids": trip_ids,
                "wrap_json": None,
                "status": "failed",
            }, on_conflict="user_id,year").execute()
        except Exception:
            pass


@app.post("/generate-yearly-wrap")
async def generate_yearly_wrap_endpoint(
    req: YearlyWrapRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),
):
    verify_auth(authorization)
    bg.add_task(generate_yearly_wrap, req.trip_ids, req.user_id, req.year)
    return {"status": "processing", "user_id": req.user_id, "year": req.year}


@app.post("/generate-lore")
async def generate_lore(
    req: LoreRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),
):
    verify_auth(authorization)
    ok = await check_and_set_cooldown(req.trip_id, _LORE_COOLDOWN_SEC)
    if not ok:
        raise HTTPException(
            status_code=429,
            detail=f"Generation already triggered. Retry in {_LORE_COOLDOWN_SEC}s.",
        )
    bg.add_task(LoreOrchestrator().run_full_pipeline, req.trip_id)
    return {"status": "queued", "trip_id": req.trip_id}


@app.post("/generate-thumbnail")
async def thumbnail(
    req: ThumbnailRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),
):
    verify_auth(authorization)
    bg.add_task(generate_thumbnail, req.photo_id)
    return {"status": "queued", "photo_id": req.photo_id}


@app.post("/generate-missing-person-card")
async def missing_person(
    req: MissingPersonRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),
):
    verify_auth(authorization)
    bg.add_task(LoreOrchestrator().generate_missing_person, req.trip_id, req.absent_user_id)
    return {"status": "queued", "trip_id": req.trip_id, "user_id": req.absent_user_id}


@app.post("/judge-battle")
async def judge_battle(
    req: BattleRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),
):
    verify_auth(authorization)
    bg.add_task(LoreOrchestrator().judge_battle, req.battle_id)
    return {"status": "queued", "battle_id": req.battle_id}


@app.post("/embed-photo")
async def embed_photo_endpoint(
    req: EmbedRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),
):
    verify_auth(authorization)
    from .embeddings import embed_photo
    bg.add_task(embed_photo, req.photo_id)
    return {"status": "queued", "photo_id": req.photo_id}


@app.post("/backfill-embeddings")
async def backfill_embeddings(
    req: BackfillEmbedRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),
):
    verify_auth(authorization)
    from .embeddings import backfill_trip_embeddings
    bg.add_task(backfill_trip_embeddings, req.trip_id)
    return {"status": "queued", "trip_id": req.trip_id}


@app.post("/nostalgia/today")
async def nostalgia_today(req: NostalgiaRequest, authorization: str = Header(...)):
    verify_auth(authorization)
    from .nostalgia import NostalgiaEngine
    moments = NostalgiaEngine().get_today_moments(req.user_id, req.limit)
    return {"moments": moments}


@app.post("/nostalgia/echo")
async def memory_echo(req: MemoryEchoRequest, authorization: str = Header(...)):
    verify_auth(authorization)
    from .nostalgia import NostalgiaEngine
    echoes = NostalgiaEngine().get_memory_echo(req.photo_id, req.user_id, req.limit)
    return {"echoes": echoes}


@app.post("/generate-trip-cover")
async def gen_trip_cover(
    req: ImageGenRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),
):
    verify_auth(authorization)
    from .image_gen import generate_trip_cover
    bg.add_task(generate_trip_cover, req.trip_id, True)   # force=True bypasses idempotency
    return {"status": "queued", "trip_id": req.trip_id}


@app.post("/generate-character-portraits")
async def gen_portraits(
    req: ImageGenRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),
):
    verify_auth(authorization)
    from .image_gen import generate_character_portraits
    bg.add_task(generate_character_portraits, req.trip_id, True)
    return {"status": "queued", "trip_id": req.trip_id}


@app.post("/generate-era-thumbnails")
async def gen_era_thumbnails(
    req: ImageGenRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
    _hmac: None = Depends(verify_hmac_signature),
):
    verify_auth(authorization)
    from .image_gen import generate_era_thumbnails
    bg.add_task(generate_era_thumbnails, req.trip_id, True)
    return {"status": "queued", "trip_id": req.trip_id}


@app.get("/health")
async def health():
    # Don't expose proxy config — only confirm worker is alive
    return {"ok": True, "version": "2.3", "model": settings.CLAUDE_MODEL}


@app.get("/debug-pipeline/{trip_id}")
async def debug_pipeline(trip_id: str, authorization: str = Header(...)):
    """Full pipeline trace — runs every step and reports exact failure. Disabled in production."""
    verify_auth(authorization)
    if settings.DEBUG_ENABLED != "true":
        raise HTTPException(status_code=404, detail="Not found")
    import traceback, asyncio, json
    from .clients import supabase, anthropic_client
    from .lore.orchestrator import LoreOrchestrator
    from .config import settings
    results = {"steps": []}

    def step(name, ok, detail=""):
        results["steps"].append({"step": name, "ok": ok, "detail": str(detail)[:200]})
        log.info(f"[debug] {name}: {'OK' if ok else 'FAIL'} {detail}")

    try:
        orch = LoreOrchestrator()

        # 1. Trip
        trip = supabase.table("trips").select("*").eq("id", trip_id).single().execute().data
        step("get_trip", bool(trip), trip["name"] if trip else "null")

        # 2. Photos
        photos = supabase.table("photos").select("*").eq("trip_id", trip_id).execute().data or []
        step("get_photos", len(photos) >= 5, f"{len(photos)} photos")

        # 3. Members
        members = supabase.table("trip_members").select("*, profiles:user_id(display_name)").eq("trip_id", trip_id).execute().data or []
        step("get_members", True, f"{len(members)} members")

        # 4a. Raw Claude call (bypasses retry/tenacity to see actual error)
        try:
            raw_resp = await anthropic_client.messages.create(
                model=settings.CLAUDE_MODEL, max_tokens=5,
                messages=[{"role": "user", "content": "say ok"}]
            )
            step("raw_claude_call", True, raw_resp.content[0].text)
        except Exception as e:
            step("raw_claude_call", False, f"{type(e).__name__}: {str(e)[:200]}")

        # 4b. Vision batch (1 photo only to test)
        try:
            one_batch = await orch._analyze_one_batch(trip, photos[:1], 1, 1)
            step("vision_batch_1photo", "error" not in str(one_batch).lower(), str(one_batch)[:100])
        except Exception as e:
            step("vision_batch_1photo", False, traceback.format_exc()[-300:])

        # 5. Aggregation
        try:
            fallback = [{"raw_cooked_score": 70, "recurring_behaviors": [], "emotional_arc": {}, "photo_count": 1}]
            agg = await orch._aggregate_signals(trip, fallback, members)
            step("aggregate_signals", isinstance(agg, dict), str(list(agg.keys()))[:100])
        except Exception as e:
            step("aggregate_signals", False, traceback.format_exc()[-300:])
            agg = None

        # 6. Lore generation with retry (full loop including validator)
        if agg:
            try:
                lore = await orch._generate_lore_with_retry(trip, agg, [])
                step("lore_with_retry", isinstance(lore, dict), f"keys:{list(lore.keys())[:6]}")
            except Exception as e:
                step("lore_with_retry", False, traceback.format_exc()[-400:])
                lore = None

        # 7. Save lore to DB (with actual lore content)
        if lore:
            try:
                orch._save_lore(trip["id"], lore)
                step("save_lore", True, "lore_json saved")
            except Exception as e:
                step("save_lore", False, traceback.format_exc()[-400:])

        # 8. Final status update — use 'ready' so trip routes correctly in frontend
        try:
            supabase.table("trips").update({"lore_status": "ready"}).eq("id", trip["id"]).execute()
            step("set_ready", True, "lore_status=ready")
        except Exception as e:
            step("set_ready", False, str(e))

        results["status"] = "DONE"
    except Exception as e:
        results["error"] = traceback.format_exc()[-500:]
        results["status"] = "CRASHED"

    return results


@app.get("/test-claude")
async def test_claude(authorization: str = Header(...)):
    """Debug endpoint — tests Anthropic API call from Render environment. Disabled in production."""
    verify_auth(authorization)
    if settings.DEBUG_ENABLED != "true":
        raise HTTPException(status_code=404, detail="Not found")
    from .clients import anthropic_client
    try:
        msg = await anthropic_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=5,
            messages=[{"role": "user", "content": "say ok"}]
        )
        return {"ok": True, "response": msg.content[0].text,
                "model": msg.model, "usage": dict(msg.usage)}
    except Exception as e:
        return {"ok": False, "error": str(e), "type": type(e).__name__}
