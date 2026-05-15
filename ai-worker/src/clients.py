import anthropic
from supabase import create_client, Client
from .config import settings

# Build Anthropic client
# aicredits.in proxy accepts Authorization: Bearer header
# Use default_headers to add it — SDK also sends x-api-key with the real key
# Both headers contain the real key so proxy accepts either
if settings.ANTHROPIC_BASE_URL:
    anthropic_client = anthropic.Anthropic(
        api_key=settings.ANTHROPIC_API_KEY,
        base_url=settings.ANTHROPIC_BASE_URL,
        default_headers={
            "Authorization": f"Bearer {settings.ANTHROPIC_API_KEY}",
        },
        timeout=180.0,
    )
else:
    anthropic_client = anthropic.Anthropic(
        api_key=settings.ANTHROPIC_API_KEY,
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
