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
    return {"ok": True, "version": "2.0", "model": settings.CLAUDE_MODEL}
