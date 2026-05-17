from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel
from contextlib import asynccontextmanager
from collections import defaultdict
import asyncio
import time
import logging
from datetime import datetime, timezone

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
    """Poll background_jobs every 60s for pending image generation tasks.
    Phase 2: image gen is durable — survives worker restarts."""
    from .clients import supabase
    await asyncio.sleep(15)  # offset from main queue poll
    while True:
        try:
            # Claim one pending image_generation job
            result = await asyncio.to_thread(
                lambda: supabase.table("background_jobs")
                    .select("id, trip_id, trace_id")
                    .eq("status", "pending")
                    .eq("job_type", "image_generation")
                    .order("created_at")
                    .limit(1)
                    .execute()
            )
            rows = result.data or []
            if rows:
                job = rows[0]
                jid, trip_id = job["id"], job["trip_id"]
                # Claim it
                await asyncio.to_thread(
                    lambda: supabase.table("background_jobs").update({
                        "status":     "claimed",
                        "claimed_at": datetime.now(timezone.utc).isoformat(),
                    }).eq("id", jid).eq("status", "pending").execute()
                )
                log.info(f"[bg-jobs] claimed image_generation job {jid} for trip {trip_id}")
                try:
                    from .image_gen import generate_all_images
                    await generate_all_images(trip_id)
                    await asyncio.to_thread(
                        lambda: supabase.table("background_jobs").update({
                            "status":       "done",
                            "completed_at": datetime.now(timezone.utc).isoformat(),
                        }).eq("id", jid).execute()
                    )
                    log.info(f"[bg-jobs] image generation done for trip {trip_id}")
                except Exception as e:
                    log.error(f"[bg-jobs] image generation failed for trip {trip_id}: {e}")
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
    log.info("WWT AI Worker starting...")
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


app = FastAPI(lifespan=lifespan, title="WWT AI Worker v2")

# In-memory per-trip cooldown — prevents hammering a single trip through the HTTP trigger.
# 5-minute window; resets on successful completion via mark_job_done.
_lore_last_triggered: dict[str, float] = defaultdict(float)
_LORE_COOLDOWN_SEC = 300


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


@app.post("/generate-lore")
async def generate_lore(req: LoreRequest, bg: BackgroundTasks, authorization: str = Header(...)):
    verify_auth(authorization)
    now = time.time()
    last = _lore_last_triggered[req.trip_id]
    if last and now - last < _LORE_COOLDOWN_SEC:
        wait = int(_LORE_COOLDOWN_SEC - (now - last))
        raise HTTPException(status_code=429, detail=f"Generation already triggered. Retry in {wait}s.")
    _lore_last_triggered[req.trip_id] = now
    bg.add_task(LoreOrchestrator().run_full_pipeline, req.trip_id)
    return {"status": "queued", "trip_id": req.trip_id}


@app.post("/generate-thumbnail")
async def thumbnail(req: ThumbnailRequest, bg: BackgroundTasks, authorization: str = Header(...)):
    verify_auth(authorization)
    bg.add_task(generate_thumbnail, req.photo_id)
    return {"status": "queued", "photo_id": req.photo_id}


@app.post("/generate-missing-person-card")
async def missing_person(req: MissingPersonRequest, bg: BackgroundTasks, authorization: str = Header(...)):
    verify_auth(authorization)
    bg.add_task(LoreOrchestrator().generate_missing_person, req.trip_id, req.absent_user_id)
    return {"status": "queued", "trip_id": req.trip_id, "user_id": req.absent_user_id}


@app.post("/judge-battle")
async def judge_battle(req: BattleRequest, bg: BackgroundTasks, authorization: str = Header(...)):
    verify_auth(authorization)
    bg.add_task(LoreOrchestrator().judge_battle, req.battle_id)
    return {"status": "queued", "battle_id": req.battle_id}


@app.post("/embed-photo")
async def embed_photo_endpoint(req: EmbedRequest, bg: BackgroundTasks, authorization: str = Header(...)):
    verify_auth(authorization)
    from .embeddings import embed_photo
    bg.add_task(embed_photo, req.photo_id)
    return {"status": "queued", "photo_id": req.photo_id}


@app.post("/backfill-embeddings")
async def backfill_embeddings(req: BackfillEmbedRequest, bg: BackgroundTasks, authorization: str = Header(...)):
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
async def gen_trip_cover(req: ImageGenRequest, bg: BackgroundTasks, authorization: str = Header(...)):
    verify_auth(authorization)
    from .image_gen import generate_trip_cover
    bg.add_task(generate_trip_cover, req.trip_id, True)   # force=True bypasses idempotency
    return {"status": "queued", "trip_id": req.trip_id}


@app.post("/generate-character-portraits")
async def gen_portraits(req: ImageGenRequest, bg: BackgroundTasks, authorization: str = Header(...)):
    verify_auth(authorization)
    from .image_gen import generate_character_portraits
    bg.add_task(generate_character_portraits, req.trip_id, True)
    return {"status": "queued", "trip_id": req.trip_id}


@app.post("/generate-era-thumbnails")
async def gen_era_thumbnails(req: ImageGenRequest, bg: BackgroundTasks, authorization: str = Header(...)):
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
