"""
HMAC-SHA256 request signature verification for the AI worker.

Fallback behaviour during rollout:
  - If AI_WORKER_HMAC_SECRET is empty/absent in Settings, HMAC check is skipped entirely.
  - Once the secret is set on both Vercel and Render, all requests without valid headers are rejected.

Signing payload (must match TypeScript src/lib/worker-auth.ts):
  "METHOD\nPATH\nTIMESTAMP\nBODY_SHA256"
"""

import hashlib
import hmac
import time

from fastapi import Header, HTTPException, Request


REPLAY_WINDOW_SEC = 300  # 5 minutes — matches _LORE_COOLDOWN_SEC in main.py


async def verify_hmac_signature(
    request: Request,
    x_timestamp: str = Header(None, alias="x-timestamp"),
    x_signature: str = Header(None, alias="x-signature"),
) -> None:
    """
    FastAPI dependency: verify HMAC-SHA256 signature on incoming requests.
    Inject with: _hmac: None = Depends(verify_hmac_signature)
    """
    from .config import settings

    hmac_secret: str = settings.AI_WORKER_HMAC_SECRET

    # Graceful skip: if no HMAC secret is configured, operate in bearer-only mode.
    # This enables a safe two-deploy rollout: set the secret on Render first,
    # then deploy Next.js with signing, then enforce here.
    if not hmac_secret:
        return

    # Once the secret is set, both headers are required.
    if not x_timestamp or not x_signature:
        raise HTTPException(status_code=401, detail="Missing HMAC signing headers")

    # Replay prevention: reject timestamps outside a 5-minute window.
    try:
        ts = int(x_timestamp)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid timestamp format")

    now = int(time.time())
    if abs(now - ts) > REPLAY_WINDOW_SEC:
        raise HTTPException(
            status_code=401,
            detail=f"Request timestamp rejected (window: {REPLAY_WINDOW_SEC}s)",
        )

    # Read raw body (FastAPI buffers the body for Pydantic parsing; reading here is safe).
    body_bytes = await request.body()
    body_hash = hashlib.sha256(body_bytes).hexdigest()

    # Reconstruct the signing payload.
    method = request.method.upper()
    path = request.url.path
    payload = f"{method}\n{path}\n{x_timestamp}\n{body_hash}"

    # Compute expected signature.
    expected_sig = hmac.new(
        hmac_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Constant-time comparison prevents timing attacks.
    if not hmac.compare_digest(expected_sig, x_signature):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")
