"""
HMAC-SHA256 request signature verification for the AI worker.

AI_WORKER_HMAC_SECRET is REQUIRED. The worker crashes at startup if it is absent.
All requests without valid HMAC headers are rejected with HTTP 401.

Signing payload (must match TypeScript src/lib/worker-auth.ts):
  "METHOD\\nPATH\\nTIMESTAMP\\nBODY_SHA256"
"""

import hashlib
import hmac
import time

from fastapi import Header, HTTPException, Request


REPLAY_WINDOW_SEC = 300  # 5 minutes


async def verify_hmac_signature(
    request: Request,
    x_timestamp: str = Header(None, alias="x-timestamp"),
    x_signature: str = Header(None, alias="x-signature"),
) -> None:
    """FastAPI dependency: verify HMAC-SHA256 signature on all incoming requests.

    Both X-Timestamp and X-Signature headers are required. Missing headers, invalid
    timestamps, expired timestamps, or signature mismatches all return HTTP 401.

    Inject with: _hmac: None = Depends(verify_hmac_signature)
    """
    from .config import settings

    hmac_secret: str = settings.AI_WORKER_HMAC_SECRET
    # config.py enforces AI_WORKER_HMAC_SECRET is non-empty (no default).
    # This guard is defense-in-depth — should never be reached.
    if not hmac_secret:
        raise HTTPException(
            status_code=500,
            detail="AI_WORKER_HMAC_SECRET is not configured. Worker cannot authenticate requests.",
        )

    if not x_timestamp or not x_signature:
        raise HTTPException(status_code=401, detail="Missing HMAC signing headers (X-Timestamp, X-Signature)")

    try:
        ts = int(x_timestamp)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid X-Timestamp format")

    now = int(time.time())
    if abs(now - ts) > REPLAY_WINDOW_SEC:
        raise HTTPException(
            status_code=401,
            detail=f"Request timestamp expired (window={REPLAY_WINDOW_SEC}s). Replay attack rejected.",
        )

    body_bytes = await request.body()
    body_hash = hashlib.sha256(body_bytes).hexdigest()

    method = request.method.upper()
    path = request.url.path
    payload = f"{method}\n{path}\n{x_timestamp}\n{body_hash}"

    expected_sig = hmac.new(
        hmac_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, x_signature):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")
