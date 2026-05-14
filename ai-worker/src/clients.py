from anthropic import Anthropic
from supabase import create_client, Client
from .config import settings

anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY,
)
