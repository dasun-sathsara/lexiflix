"""spaCy model management — selection, loading, and singleton lifecycle.

Expensive model initialization is done once at startup and reused across
requests. The ``SpaCyModelManager`` holds the loaded pipeline and exposes
readiness state for the health endpoint.
"""

from __future__ import annotations

import logging

import spacy  # type: ignore[import-untyped]
from spacy.language import Language  # type: ignore[import-untyped]

from app.core.exceptions import SpaCyModelError
from app.core.settings import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model selection
# ---------------------------------------------------------------------------

_MODEL_CANDIDATES_TRF: list[tuple[str, bool]] = [
    ("en_core_web_trf", True),
]

_MODEL_CANDIDATES_FALLBACK: list[tuple[str, bool]] = [
    ("en_core_web_lg", False),
    ("en_core_web_md", False),
    ("en_core_web_sm", False),
]


def choose_spacy_model(prefer_transformer: bool) -> tuple[str, bool]:
    """Pick the best available spaCy model.

    Returns ``(model_name, is_transformer)``.
    Raises ``SpaCyModelError`` if nothing is installed.
    """
    candidates: list[tuple[str, bool]] = []
    if prefer_transformer:
        candidates.extend(_MODEL_CANDIDATES_TRF)
    candidates.extend(_MODEL_CANDIDATES_FALLBACK)

    for name, is_trf in candidates:
        if spacy.util.is_package(name):
            logger.info("Found installed spaCy model: %s", name)
            return name, is_trf

    raise SpaCyModelError(
        "No suitable spaCy model found.",
        detail=(
            "Install one of: en_core_web_trf, en_core_web_lg, en_core_web_md, en_core_web_sm. "
            "Example: python -m spacy download en_core_web_sm"
        ),
    )


# ---------------------------------------------------------------------------
# Manager singleton
# ---------------------------------------------------------------------------


class SpaCyModelManager:
    """Singleton-ish manager for the loaded spaCy pipeline.

    Call ``load()`` once at application startup. The ``nlp`` property then
    provides the ready-to-use ``Language`` instance on every request.
    """

    def __init__(self) -> None:
        self._nlp: Language | None = None
        self._model_name: str | None = None
        self._is_transformer: bool = False

    @property
    def is_loaded(self) -> bool:
        return self._nlp is not None

    @property
    def model_name(self) -> str | None:
        return self._model_name

    @property
    def is_transformer(self) -> bool:
        return self._is_transformer

    @property
    def nlp(self) -> Language:
        if self._nlp is None:
            raise SpaCyModelError("spaCy model has not been loaded yet.")
        return self._nlp

    def load(self) -> None:
        """Load the spaCy pipeline. Safe to call multiple times (idempotent)."""
        if self._nlp is not None:
            logger.info("spaCy model already loaded — skipping.")
            return

        if settings.spacy_prefer_gpu and spacy.prefer_gpu():
            logger.info("Using GPU for spaCy processing.")
        else:
            logger.info("Using CPU for spaCy processing.")

        model_name, is_trf = choose_spacy_model(settings.spacy_prefer_transformer)
        logger.info(
            "Loading spaCy model '%s' (transformer=%s) …",
            model_name,
            is_trf,
        )
        try:
            nlp = spacy.load(model_name, disable=[])
        except OSError as exc:
            raise SpaCyModelError(
                f"Could not load model '{model_name}'.",
                detail=str(exc),
            ) from exc

        self._nlp = nlp
        self._model_name = model_name
        self._is_transformer = is_trf
        logger.info("spaCy model loaded successfully.")


# Module-level singleton
model_manager = SpaCyModelManager()
