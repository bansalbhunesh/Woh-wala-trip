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
    return {"ok": True, "version": "2.1", "model": settings.CLAUDE_MODEL,
            "proxy": bool(settings.ANTHROPIC_BASE_URL), "base_url": settings.ANTHROPIC_BASE_URL}


@app.get("/debug-pipeline/{trip_id}")
async def debug_pipeline(trip_id: str, authorization: str = Header(...)):
    """Step-by-step pipeline debug — no Claude calls, just DB + storage."""
    verify_auth(authorization)
    from .clients import supabase, anthropic_client
    results = {}
    try:
        # Step 1: fetch trip
        trip = supabase.table("trips").select("*").eq("id", trip_id).single().execute().data
        results["trip"] = trip["name"] if trip else "NULL"

        # Step 2: fetch photos
        photos = supabase.table("photos").select("*").eq("trip_id", trip_id).execute().data
        results["photo_count"] = len(photos) if photos else 0

        # Step 3: fetch members
        members = supabase.table("trip_members").select("*, profiles:user_id(display_name)").eq("trip_id", trip_id).execute().data
        results["member_count"] = len(members) if members else 0

        # Step 4: test signed URL on first photo
        if photos:
            url_resp = supabase.storage.from_("trip-photos").create_signed_url(photos[0]["storage_path"], 60)
            # Handle response format
            if isinstance(url_resp, dict):
                signed = url_resp.get("signedURL") or url_resp.get("signedUrl") or url_resp.get("signed_url")
            else:
                signed = getattr(url_resp, "signed_url", None) or getattr(url_resp, "signedURL", None)
                if not signed and hasattr(url_resp, "data") and isinstance(url_resp.data, dict):
                    signed = url_resp.data.get("signedURL") or url_resp.data.get("signedUrl")
            results["signed_url"] = "OK" if signed else f"FAIL: {url_resp}"

        # Step 5: tiny Claude call
        msg = anthropic_client.messages.create(
            model="claude-sonnet-4-20250514", max_tokens=3,
            messages=[{"role": "user", "content": "ok"}]
        )
        results["claude"] = msg.content[0].text

        results["status"] = "ALL STEPS PASSED"
    except Exception as e:
        import traceback
        results["error"] = str(e)
        results["traceback"] = traceback.format_exc()[-500:]
        results["status"] = "FAILED"
    return results


@app.get("/test-claude")
async def test_claude(authorization: str = Header(...)):
    """Debug endpoint — tests Anthropic API call from Render environment."""
    verify_auth(authorization)
    from .clients import anthropic_client
    try:
        msg = anthropic_client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=5,
            messages=[{"role": "user", "content": "say ok"}]
        )
        return {"ok": True, "response": msg.content[0].text,
                "model": msg.model, "usage": dict(msg.usage)}
    except Exception as e:
        return {"ok": False, "error": str(e), "type": type(e).__name__}
