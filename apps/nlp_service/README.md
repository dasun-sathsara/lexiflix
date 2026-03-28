# LexiFlix NLP Service

This service is the Python-side NLP component for LexiFlix. Its job is intentionally narrow: take subtitle or transcript input, run language analysis that is better served by Python tooling, and return structured vocabulary candidates to the rest of the application.

The service is not intended to own authentication, user-facing routes, workflow orchestration, or persistent product state. Those responsibilities remain in the main Next.js application and the surrounding workflow layer.

## Intended Role

The long-term role of this service is to provide subtitle analysis capabilities that would be awkward or lower quality in a TypeScript-only stack. That includes tasks such as subtitle normalization, tokenization, lemmatization, POS tagging, NER-based filtering, and candidate vocabulary extraction.

The surrounding application will then take that structured output and continue with user-level filtering, Gemini enrichment, artifact generation, and persistence.

## Current Status

Right now this service is a scaffold. The codebase and dependencies indicate the intended NLP direction, but the HTTP service layer has not been fully implemented yet. The current `main.py` is still a placeholder, so this directory should be treated as a work-in-progress service boundary rather than a finished runtime.

That is acceptable for the current stage of the project. The architecture has already settled on Python as the place for NLP, even though the final service contract is still being built.

## Tooling

This service uses Python 3.13 and is managed with `uv`. The dependency set currently includes spaCy, `spacy-transformers`, PyTorch CPU builds, and related NLP libraries.

Install dependencies from this directory with:

```bash
uv sync
```

Once development commands are finalized, they should be documented here. For now, the current configuration already supports linting and type-checking through the tools declared in `pyproject.toml`.

Examples:

```bash
uv run ruff check .
uv run ruff format .
uv run basedpyright
```

## Deployment Direction

The current plan is to package this service as a container and deploy it to an already rented VPS through a deployment pipeline. That choice is deliberate. It keeps the service lightweight, avoids unnecessary cloud orchestration complexity, and gives direct control over CPU-heavy NLP workloads.

The service is expected to be internal-facing. Trigger.dev workflows or the main application backend will call it over HTTP. Browsers should not call it directly.

## Relationship to the Main App

The main app lives in [apps/web](/Users/pabasara/Dev/lexiflix/apps/web). That is the public product surface. This service is only a specialized compute dependency behind that app. If you are trying to understand the overall system design, read the repository-level architecture document at [docs/architecture.md](/Users/pabasara/Dev/lexiflix/docs/architecture.md) first.
