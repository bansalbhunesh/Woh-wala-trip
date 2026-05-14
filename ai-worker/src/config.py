from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    AI_WORKER_SECRET: str

    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"         # vision + fast
    CLAUDE_HAIKU_MODEL: str = "claude-haiku-4-5-20251001"  # thumbnails + cheap calls

    MAX_PHOTOS_PER_VISION_CALL: int = 20
    MAX_LORE_RETRIES: int = 3

    class Config:
        env_file = ".env"


settings = Settings()
