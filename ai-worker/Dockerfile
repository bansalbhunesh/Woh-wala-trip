FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libheif-dev \
    libde265-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY ai-worker/pyproject.toml ./
RUN pip install --no-cache-dir .

COPY ai-worker/src ./src

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
