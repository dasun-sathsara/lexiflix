"""spaCy model management — loading and singleton lifecycle.

Expensive model initialization is done once at startup and reused across
requests. The ``SpaCyModelManager`` holds the loaded pipeline and exposes
readiness state for the health endpoint.
"""

from __future__ import annotations

import logging

import spacy  # type: ignore[import-untyped]
from spacy.language import Language  # type: ignore[import-untyped]

from app.core.exceptions import SpaCyModelError

logger = logging.getLogger(__name__)

_MODEL_NAME = "en_core_web_trf"


class SpaCyModelManager:
    """Singleton-ish manager for the loaded spaCy pipeline.

    Call ``load()`` once at application startup. The ``nlp`` property then
    provides the ready-to-use ``Language`` instance on every request.
    """

    def __init__(self) -> None:
        self._nlp: Language | None = None

    @property
    def is_loaded(self) -> bool:
        return self._nlp is not None

    @property
    def model_name(self) -> str | None:
        return _MODEL_NAME if self._nlp is not None else None

    @property
    def nlp(self) -> Language:
        if self._nlp is None:
            raise SpaCyModelError("spaCy model has not been loaded yet.")
        return self._nlp

    def load(self) -> None:
        """Load the ``en_core_web_trf`` pipeline. Safe to call multiple times (idempotent)."""
        if self._nlp is not None:
            logger.info("spaCy model already loaded — skipping.")
            return

        if not spacy.util.is_package(_MODEL_NAME):
            raise SpaCyModelError(
                f"Model '{_MODEL_NAME}' is not installed.",
                detail=f"Run: python -m spacy download {_MODEL_NAME}",
            )

        logger.info("Loading spaCy model '%s' …", _MODEL_NAME)
        try:
            nlp = spacy.load(_MODEL_NAME)
        except OSError as exc:
            raise SpaCyModelError(
                f"Could not load model '{_MODEL_NAME}'.",
                detail=str(exc),
            ) from exc

        self._nlp = nlp
        logger.info("spaCy model loaded successfully.")


# Module-level singleton
model_manager = SpaCyModelManager()
