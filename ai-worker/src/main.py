from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from pydantic import BaseModel
from contextlib import asynccontextmanager
import os
import logging

from .lore.orchestrator import LoreOrchestrator
from .thumbnails import generate_thumbnail
from .config import settings

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(name)s — %(message)s')
log = logging.getLogger("wwt")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting AI worker...")
    yield
    log.info("Shutting down...")


app = FastAPI(lifespan=lifespan, title="WWT AI Worker")


def verify_auth(authorization: str = Header(...)):
    expected = f"Bearer {settings.AI_WORKER_SECRET}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="invalid auth")


class GenerateLoreRequest(BaseModel):
    trip_id: str


class ThumbnailRequest(BaseModel):
    photo_id: str


@app.post("/generate-lore")
async def generate_lore(
    req: GenerateLoreRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
):
    verify_auth(authorization)
    bg.add_task(LoreOrchestrator().run_full_pipeline, req.trip_id)
    return {"status": "queued"}


@app.post("/generate-thumbnail")
async def thumbnail(
    req: ThumbnailRequest,
    bg: BackgroundTasks,
    authorization: str = Header(...),
):
    verify_auth(authorization)
    bg.add_task(generate_thumbnail, req.photo_id)
    return {"status": "queued"}


@app.get("/health")
async def health():
    return {"ok": True}
