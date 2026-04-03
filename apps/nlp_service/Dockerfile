# syntax=docker/dockerfile:1.7

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:/root/.local/bin:${PATH}" \
    NLP_HOST=0.0.0.0 \
    NLP_PORT=8000 \
    NLP_DEBUG=false \
    NLP_LOG_LEVEL=info \
    NLP_SPACY_PREFER_GPU=false \
    NLP_SPACY_PREFER_TRANSFORMER=true

ARG UV_VERSION=0.8.13
ARG SPACY_MODEL=en_core_web_trf
ARG UV_HTTP_TIMEOUT=120

ENV UV_HTTP_TIMEOUT=${UV_HTTP_TIMEOUT}

WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    apt-get update \
    && apt-get install --yes --no-install-recommends build-essential curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    curl -LsSf https://astral.sh/uv/${UV_VERSION}/install.sh | sh

COPY pyproject.toml uv.lock README.md ./
RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    uv sync --frozen --no-dev --no-install-project

RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    uv run python -m spacy download "${SPACY_MODEL}"

COPY app ./app
COPY main.py ./main.py

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
