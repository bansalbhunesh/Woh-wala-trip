import anthropic
from supabase import create_client, Client
from .config import settings

# Build Anthropic client — supports proxy base URLs (aicredits.in, openrouter, etc.)
_client_kwargs: dict = {"api_key": settings.ANTHROPIC_API_KEY}
if settings.ANTHROPIC_BASE_URL:
    _client_kwargs["base_url"] = settings.ANTHROPIC_BASE_URL

anthropic_client = anthropic.Anthropic(**_client_kwargs)

try:
    supabase: Client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )
except Exception as e:
    print(f"Warning: Supabase client failed to initialize: {e}")
    supabase = None  # type: ignore
