from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    AI_WORKER_SECRET: str
    AI_WORKER_HMAC_SECRET: str = ""  # Required after rollout; empty = bearer-only mode (transition)

    # Optional: set if using a proxy (e.g. aicredits.in, openrouter, etc.)
    ANTHROPIC_BASE_URL: str = ""

    # fal.ai — image generation via Sana Sprint (optional; all image gen skips if absent)
    FAL_API_KEY: str = ""
    FAL_DAILY_BUDGET: int = 200      # max total fal.ai calls per 24h across all trips
    FAL_TRIP_DAILY_LIMIT: int = 2    # max full image-gen runs per trip per 24h
    FAL_MAX_ERAS: int = 5            # max era thumbnails generated per trip

    CLAUDE_MODEL: str = "claude-sonnet-4-6"              # vision + fast, current
    CLAUDE_HAIKU_MODEL: str = "claude-haiku-4-5-20251001"  # thumbnails + cheap calls

    MAX_PHOTOS_PER_VISION_CALL: int = 20
    MAX_VISION_BATCHES: int = 4       # hard cap: never send more than 4 batches to vision (80 photos max)
    MAX_LORE_RETRIES: int = 3
    MAX_CONCURRENT_ROLES: int = 3     # semaphore limit on parallel character role calls

    # COST-03: LoreEvaluator sampling rate.
    # Set to 1.0 in dev (evaluate every run).
    # Set to 0.2 in production (evaluate 20% of runs — reduces Haiku call volume by ~80%).
    # Override via LORE_EVAL_SAMPLE_RATE env var on Render.
    LORE_EVAL_SAMPLE_RATE: float = 1.0

    # Set to "true" ONLY in dev/staging — disables /debug-pipeline and /test-claude in prod
    DEBUG_ENABLED: str = "false"

    class Config:
        env_file = ".env"


settings = Settings()
