# =============================================================================
# Yaarlore AI Worker — Production Dockerfile
# =============================================================================
# Multi-stage build: separate dependency resolution from runtime to keep
# the final image lean. PyTorch/transformers are NOT included — embeddings
# are handled via Voyage AI REST API (no local ML model required).
#
# Estimated image size: ~180MB (vs ~2.5GB with torch+transformers)
# Render free tier RAM: 512MB — comfortably fits.
# =============================================================================

# ── Stage 1: dependency builder ───────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies only (not carried into runtime image)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./

# Install into a prefix directory for clean copy to runtime stage
RUN pip install --no-cache-dir --prefix=/install .

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Security: run as non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

# Runtime system libs only (Pillow needs libjpeg for thumbnail generation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg62-turbo \
    libwebp7 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application source
COPY --chown=appuser:appgroup src ./src

# Switch to non-root user
USER appuser

# Health check — Render uses this to determine readiness
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8000}/health')"

# Use $PORT env var (Render injects it); fall back to 8000 for local dev.
# --workers 1: single worker process (Render free = 512MB RAM, multi-worker would OOM).
# --timeout-keep-alive 75: keeps connections alive slightly longer than Render's 60s proxy timeout.
CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --timeout-keep-alive 75 --log-level info"]
