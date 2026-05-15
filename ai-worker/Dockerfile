FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libheif-dev \
    libde265-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir .

COPY src ./src

# Use $PORT env var (Render injects it), fall back to 8000 for local dev
CMD ["sh", "-c", "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
