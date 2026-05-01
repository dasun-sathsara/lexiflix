"""Health and readiness endpoints for container deployment."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.responses import HealthResponse, ReadyResponse
from app.services.spacy_models import model_manager

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness probe — always returns 200 if the process is running."""
    return HealthResponse(status="ok")


@router.get("/ready", response_model=ReadyResponse)
async def ready() -> ReadyResponse:
    """Readiness probe — reports whether the spaCy model is loaded.

    Returns 200 even if the model is not loaded (so the caller can
    distinguish between "process alive but not ready" vs. "process dead").
    The ``spacy_model_loaded`` flag carries the actual readiness signal.
    """
    return ReadyResponse(
        status="ok" if model_manager.is_loaded else "loading",
        spacy_model_loaded=model_manager.is_loaded,
        spacy_model_name=model_manager.model_name,
    )
