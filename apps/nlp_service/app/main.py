"""FastAPI application factory and startup lifecycle."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI

from app.api.analysis import router as analysis_router
from app.api.health import router as health_router
from app.core.auth import require_api_key
from app.core.logging import setup_logging
from app.core.settings import settings
from app.services.spacy_models import model_manager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan — runs expensive initialization at startup."""
    setup_logging()
    logger.info(
        "Starting %s v%s (debug=%s)",
        settings.app_name,
        settings.app_version,
        settings.debug,
    )

    # Load spaCy model once at startup so it's ready for requests
    logger.info("Loading spaCy model …")
    model_manager.load()
    logger.info("Startup complete.")

    yield

    logger.info("Shutting down.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="LexiFlix NLP Service",
        description=(
            "Internal NLP microservice for subtitle analysis and vocabulary extraction. "
            "Called by Trigger.dev workflows — not intended for direct browser access."
        ),
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
    )

    app.include_router(health_router)
    app.include_router(analysis_router, dependencies=[Depends(require_api_key)])

    return app


app = create_app()
