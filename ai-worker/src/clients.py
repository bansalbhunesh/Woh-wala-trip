import anthropic
from supabase import create_client, Client
from .config import settings

# Strip /v1 suffix if present — SDK adds it automatically
# e.g. https://api.aicredits.in/v1 → https://api.aicredits.in
_base = settings.ANTHROPIC_BASE_URL.rstrip("/").removesuffix("/v1") if settings.ANTHROPIC_BASE_URL else None
_headers = {"Authorization": f"Bearer {settings.ANTHROPIC_API_KEY}"} if _base else {}

anthropic_client = anthropic.AsyncAnthropic(
    api_key=settings.ANTHROPIC_API_KEY,
    base_url=_base or None,
    default_headers=_headers,
    timeout=180.0,
)

try:
    supabase: Client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )
except Exception as e:
    print(f"FATAL: Supabase client failed to initialize: {e}")
    raise
