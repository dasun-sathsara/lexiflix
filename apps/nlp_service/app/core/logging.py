"""Structured logging setup for the NLP service."""

from __future__ import annotations

import logging
import sys

from app.core.settings import settings


def setup_logging() -> None:
    """Configure root logger with a clean, structured format."""
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )

    root = logging.getLogger()
    root.setLevel(level)
    # Avoid duplicate handlers on repeated calls (e.g. tests)
    root.handlers.clear()
    root.addHandler(handler)

    # Quieten noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
