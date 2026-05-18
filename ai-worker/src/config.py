from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    AI_WORKER_SECRET: str
    # Required. No default. Worker crashes at startup if not set.
    # Set on both Render (AI worker) and Vercel (Next.js) before deploying.
    AI_WORKER_HMAC_SECRET: str

    # Optional: set if using a proxy (e.g. aicredits.in, openrouter, etc.)
    ANTHROPIC_BASE_URL: str = ""

    # Base URL of the Next.js deployment — used to call internal notify endpoints.
    # e.g. https://yaarlore.vercel.app  (no trailing slash)
    NEXTJS_BASE_URL: str = ""

    # Voyage AI — multimodal photo embeddings (optional; embeddings are skipped if not set)
    VOYAGE_API_KEY: str = ""  # Optional — embeddings are skipped if not set

    # fal.ai — image generation via Sana Sprint (optional; all image gen skips if absent)
    FAL_API_KEY: str = ""
    FAL_DAILY_BUDGET: int = 200      # max total fal.ai calls per 24h across all trips
    FAL_TRIP_DAILY_LIMIT: int = 2    # max full image-gen runs per trip per 24h
    FAL_MAX_ERAS: int = 5            # max era thumbnails generated per trip

    CLAUDE_MODEL: str = "claude-sonnet-4-6"              # vision + fast, current
    CLAUDE_HAIKU_MODEL: str = "claude-haiku-4-5-20251001"  # thumbnails + cheap calls
    CLAUDE_FALLBACK_MODEL: str = "claude-haiku-4-5-20251001"  # fallback when Sonnet overloaded

    MAX_PHOTOS_PER_VISION_CALL: int = 20
    MAX_VISION_BATCHES: int = 4       # hard cap: never send more than 4 batches to vision (80 photos max)
    MAX_LORE_RETRIES: int = 3
    MAX_CONCURRENT_ROLES: int = 3     # semaphore limit on parallel character role calls

    # LoreEvaluator sampling rate.
    # 1.0 = evaluate every pipeline run (production default — Haiku cost is negligible at $0.000125/run).
    # Reduce only if Anthropic rate limits become a concern at scale (>10k runs/day).
    LORE_EVAL_SAMPLE_RATE: float = 1.0

    # Redis (Upstash) — cross-instance lore-generation cooldown coordination.
    # When set, the /generate-lore cooldown uses a Redis SET NX EX check so that
    # multiple worker replicas share the same cooldown window.
    # If not set, falls back to the in-process _lore_last_triggered dict (single-instance only).
    REDIS_URL: str = ""   # Upstash Redis REST URL  (e.g. https://xxx.upstash.io)
    REDIS_TOKEN: str = "" # Upstash Redis REST token

    # Set to "true" ONLY in dev/staging — disables /debug-pipeline and /test-claude in prod
    DEBUG_ENABLED: str = "false"

    class Config:
        env_file = ".env"


settings = Settings()
