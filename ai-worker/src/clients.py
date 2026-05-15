import anthropic
import httpx
from supabase import create_client, Client
from .config import settings

# Build Anthropic client
# For proxy services (aicredits.in etc): use a custom httpx client that sends
# ONLY Authorization: Bearer header and suppresses the SDK's x-api-key header.
if settings.ANTHROPIC_BASE_URL:
    _transport = httpx.HTTPTransport()
    _http_client = httpx.Client(
        base_url=settings.ANTHROPIC_BASE_URL,
        headers={
            "Authorization": f"Bearer {settings.ANTHROPIC_API_KEY}",
            "anthropic-version": "2023-06-01",
        },
        transport=_transport,
        timeout=120.0,
    )
    # Pass a dummy api_key so SDK doesn't complain; real auth is via httpx headers
    anthropic_client = anthropic.Anthropic(
        api_key="proxy-auth",
        http_client=_http_client,
    )
else:
    anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

try:
    supabase: Client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )
except Exception as e:
    print(f"FATAL: Supabase client failed to initialize: {e}")
    raise  # Don't continue with None — crash immediately with a clear message
