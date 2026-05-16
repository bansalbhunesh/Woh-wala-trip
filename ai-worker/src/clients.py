import anthropic
from supabase import create_client, Client
from .config import settings

# Use AsyncAnthropic — no thread pool executor needed, truly async Claude calls
_headers = {"Authorization": f"Bearer {settings.ANTHROPIC_API_KEY}"} if settings.ANTHROPIC_BASE_URL else {}

anthropic_client = anthropic.AsyncAnthropic(
    api_key=settings.ANTHROPIC_API_KEY,
    base_url=settings.ANTHROPIC_BASE_URL or None,
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
