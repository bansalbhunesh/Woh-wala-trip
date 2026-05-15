import anthropic
from supabase import create_client, Client
from .config import settings

# Build Anthropic client
# aicredits.in and similar proxies use Authorization: Bearer instead of x-api-key
# Setting auth_token makes the SDK use the Bearer header
_client_kwargs: dict = {"api_key": settings.ANTHROPIC_API_KEY}
if settings.ANTHROPIC_BASE_URL:
    _client_kwargs["base_url"] = settings.ANTHROPIC_BASE_URL
    # Proxy services use Bearer auth — override the default header
    _client_kwargs["default_headers"] = {
        "Authorization": f"Bearer {settings.ANTHROPIC_API_KEY}",
    }

anthropic_client = anthropic.Anthropic(**_client_kwargs)

try:
    supabase: Client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
    )
except Exception as e:
    print(f"Warning: Supabase client failed to initialize: {e}")
    supabase = None  # type: ignore
