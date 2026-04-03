# LexiFlix NLP Service

Internal Python microservice for subtitle analysis and vocabulary extraction. Called by Trigger.dev workflows as a single compute step — not intended for direct browser access.

## Architecture Role

This service is deliberately narrow. It accepts subtitle text (SRT or plain text), runs the NLP pipeline, and returns structured vocabulary candidates as JSON. It does **not** own:

- Authentication or sessions
- Job orchestration or queues
- Durable product state
- Browser-facing routes

For the full architecture picture, see [docs/architecture.md](/docs/architecture.md).

## Project Structure

```
apps/nlp_service/
├── app/
│   ├── main.py              # FastAPI app factory + startup lifecycle
│   ├── api/                  # Route modules (HTTP layer only)
│   │   ├── analysis.py       # POST /api/v1/analyze
│   │   └── health.py         # GET /health, GET /ready
│   ├── core/                 # Settings, logging, exceptions
│   │   ├── exceptions.py     # Structured domain exceptions
│   │   ├── logging.py        # Centralized logging setup
│   │   └── settings.py       # Environment-driven config (pydantic-settings)
│   ├── models/               # Internal domain structures
│   │   └── vocabulary.py     # WordStats dataclass
│   ├── schemas/              # Pydantic request/response models
│   │   ├── requests.py       # AnalyzeRequest, AnalysisOptions
│   │   └── responses.py      # AnalyzeResponse, VocabularyCandidate, etc.
│   └── services/             # NLP pipeline logic
│       ├── cefr.py           # CEFR level lookup + normalization
│       ├── pipeline.py       # Pipeline façade (main entry point)
│       ├── spacy_models.py   # spaCy model loading + singleton
│       ├── text_processing.py # SRT parsing, cleaning, dedup
│       └── token_filters.py  # Token exclusion rules
├── main.py                   # Uvicorn runner shim
├── pyproject.toml            # Dependencies + tooling config
└── .python-version           # Python 3.13
```

## Quick Start

### Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) package manager
- A spaCy English model (at minimum `en_core_web_sm`)

### Setup

```bash
# From apps/nlp_service/
uv sync

# Download a spaCy model (pick one)
uv run python -m spacy download en_core_web_sm    # smallest, fastest
uv run python -m spacy download en_core_web_lg    # better accuracy
uv run python -m spacy download en_core_web_trf   # transformer-backed, best accuracy
```

### Run the Dev Server

```bash
# From repo root (preferred):
task nlp:dev

# Or directly:
cd apps/nlp_service
NLP_DEBUG=true uv run uvicorn app.main:app --reload
```

The service starts on `http://localhost:8000`. With `NLP_DEBUG=true`, the interactive API docs are available at `/docs`.

Important: the local `uv` path does not install a spaCy English model for you. If you skip the `spacy download` step above, startup will fail with `SpaCyModelError: No suitable spaCy model found`.

## Local Docker with Colima

If your goal is to smoke-test the API rather than iterate on Python internals, use Colima plus Docker first. That path is more predictable because the image installs the spaCy model during build.

### 1. Start Colima

```bash
colima start --cpu 4 --memory 8 --disk 60
docker context use colima
docker info
```

If `docker info` fails, Colima is not ready yet.

### 2. Build the image

For quick local testing, prefer the smaller spaCy model instead of the default transformer image:

```bash
# From repo root
task nlp:docker:build

# Optional: build a heavier image closer to the committed default
task nlp:docker:build SPACY_MODEL=en_core_web_trf
```

The task defaults to `en_core_web_sm` because it is materially faster and lighter for demo-time endpoint testing. That is the better tradeoff here unless you specifically need transformer behaviour.

### 3. Run the container

```bash
# From repo root
task nlp:docker:run
```

The API will be available at `http://localhost:8000`.

### 4. Stop the container and Colima

Stop the running container with `Ctrl+C`.

When you are done with Docker entirely:

```bash
colima stop
```

### Example Request

```bash
curl -X POST http://localhost:8000/api/v1/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "content": "1\n00:00:01,000 --> 00:00:04,000\nThe quick brown fox jumped over the lazy dog.\n\n2\n00:00:05,000 --> 00:00:08,000\nShe sells seashells by the seashore.",
    "content_type": "srt",
    "job_id": "test-123"
  }'
```

## Configuration

All settings are read from environment variables with an `NLP_` prefix:

| Variable                       | Default   | Description                               |
| ------------------------------ | --------- | ----------------------------------------- |
| `NLP_DEBUG`                    | `false`   | Enable debug mode (auto-reload, API docs) |
| `NLP_HOST`                     | `0.0.0.0` | Server bind address                       |
| `NLP_PORT`                     | `8000`    | Server port                               |
| `NLP_LOG_LEVEL`                | `info`    | Logging level                             |
| `NLP_SPACY_PREFER_GPU`         | `true`    | Attempt GPU acceleration                  |
| `NLP_SPACY_PREFER_TRANSFORMER` | `true`    | Prefer transformer models                 |
| `NLP_SPACY_BATCH_SIZE`         | `200`     | Default spaCy batch size                  |

## API Endpoints

| Method | Path              | Description                                 |
| ------ | ----------------- | ------------------------------------------- |
| `GET`  | `/health`         | Liveness probe                              |
| `GET`  | `/ready`          | Readiness probe (reports spaCy model state) |
| `POST` | `/api/v1/analyze` | Subtitle analysis → vocabulary candidates   |

## Development Commands

```bash
# Lint
uv run ruff check .

# Format
uv run ruff format .

# Type check
uv run basedpyright

# Run tests
uv run pytest

# Run server with auto-reload
NLP_DEBUG=true uv run uvicorn app.main:app --reload
```

## Bruno Collection

A Bruno collection is checked in at [apps/nlp_service/bruno](/Users/pabasara/Dev/lexiflix/apps/nlp_service/bruno).

It includes:

- `GET /health`
- `GET /ready`
- `POST /api/v1/analyze` with SRT input
- `POST /api/v1/analyze` with plain text input
- `POST /api/v1/analyze` with invalid SRT to verify the `422` error path

### Using the collection

1. Open Bruno.
2. Import or open the folder [apps/nlp_service/bruno](/Users/pabasara/Dev/lexiflix/apps/nlp_service/bruno) as a collection.
3. Select the `local` environment from `environments/local.bru`.
4. Confirm `host` is `http://localhost:8000`.
5. Run `Health`, then `Ready`, then either analysis request.

If you expose the container on a different port, update `host` in the Bruno environment file or override it inside Bruno.

## Deployment

The service is packaged as a container and deployed to the project's VPS. See the architecture document for deployment rationale.

```bash
# Build from apps/nlp_service/
docker build -t lexiflix-nlp-service .

# Run locally
docker run --rm -p 8000:8000 lexiflix-nlp-service
```

The committed [Dockerfile](/Users/pabasara/Dev/lexiflix/apps/nlp_service/Dockerfile) resolves dependencies directly from `pyproject.toml`, installs `en_core_web_trf` during the image build, and defaults to transformer-first inference in the container. GPU use still defaults off for VPS/container predictability. Override `SPACY_MODEL` at build time or `NLP_*` variables at runtime if you need a lighter profile.
