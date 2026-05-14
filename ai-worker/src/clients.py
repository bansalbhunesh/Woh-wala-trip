import anthropic
from supabase import create_client, Client
from .config import settings

# Native Anthropic SDK — supports vision, prompt caching, structured output
anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

try:
    supabase: Client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )
except Exception as e:
    print(f"Warning: Supabase client failed to initialize: {e}")
    supabase = None  # type: ignore
