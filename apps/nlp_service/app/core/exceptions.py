"""Structured domain exceptions for the NLP service.

These are raised in the service layer and caught by the API error handlers
to produce clean HTTP error responses instead of raw tracebacks.
"""

from __future__ import annotations


class NLPServiceError(Exception):
    """Base exception for all NLP service errors."""

    def __init__(self, message: str, *, detail: str | None = None) -> None:
        super().__init__(message)
        self.detail = detail


class SRTParsingError(NLPServiceError):
    """Raised when SRT content cannot be parsed."""


class SpaCyModelError(NLPServiceError):
    """Raised when no suitable spaCy model is available."""


class PipelineError(NLPServiceError):
    """Raised when the NLP pipeline fails during processing."""


class EmptyContentError(NLPServiceError):
    """Raised when the input content yields no processable text."""
