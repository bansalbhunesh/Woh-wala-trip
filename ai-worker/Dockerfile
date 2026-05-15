FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    libheif-dev \
    libde265-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Works whether built from ai-worker/ OR from project root
COPY pyproject.toml ./
RUN pip install --no-cache-dir .

COPY src ./src

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
