from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel
from contextlib import asynccontextmanager
import logging

from .lore.orchestrator import LoreOrchestrator
from .thumbnails import generate_thumbnail
from .config import settings

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s — %(message)s'
)
log = logging.getLogger("wwt")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("WWT AI Worker starting...")
    yield
    log.info("WWT AI Worker shutting down.")


app = FastAPI(lifespan=lifespan, title="WWT AI Worker v2")


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


@app.post("/generate-lore")
async def generate_lore(req: LoreRequest, bg: BackgroundTasks, authorization: str = Header(...)):
    verify_auth(authorization)
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

        # 8. Final status update
        try:
            supabase.table("trips").update({"lore_status": "debug_done"}).eq("id", trip["id"]).execute()
            step("set_ready", True, "lore_status=debug_done")
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
