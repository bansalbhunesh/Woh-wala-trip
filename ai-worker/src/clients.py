from openai import OpenAI
from supabase import create_client, Client
from .config import settings

# Using OpenAI client for compatibility with aicredits.in proxy
openai_client = OpenAI(
    api_key=settings.ANTHROPIC_API_KEY,
    base_url="https://api.aicredits.in/v1"
)

supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY,
)
