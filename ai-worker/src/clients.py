from openai import OpenAI
from supabase import create_client, Client
from .config import settings

# Using OpenAI client for compatibility with aicredits.in proxy
openai_client = OpenAI(
    api_key=settings.ANTHROPIC_API_KEY,
    base_url="https://api.aicredits.in/v1"
)

try:
    supabase: Client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )
except Exception as e:
    print(f"Warning: Supabase client failed to initialize: {e}")
    # Mock or None for UI-only testing
    supabase = None # type: ignore
