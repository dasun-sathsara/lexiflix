"""Response schemas for the analysis API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class CandidateContext(BaseModel):
    """A representative usage context for a candidate vocabulary item."""

    text: str = Field(
        ..., description="The sentence or subtitle line where the word appeared."
    )


class VocabularyCandidate(BaseModel):
    """A single candidate vocabulary item extracted by the NLP pipeline."""

    text: str = Field(
        ...,
        description="Representative observed surface form for the candidate (lowercased).",
    )
    lemma: str = Field(..., description="Lemmatized form.")
    type: str = Field(
        ...,
        description="Coarse POS category (noun, verb, adj, adv).",
    )
    cefr_level: str | None = Field(
        default=None,
        description="CEFR label (A1–C2) if resolvable, else null.",
    )
    cefr_numeric: int | None = Field(
        default=None,
        description="Numeric CEFR (1=A1 … 6=C2) if resolvable, else null.",
    )
    count: int = Field(
        ..., ge=1, description="Raw occurrence count in the source text."
    )
    contexts: list[CandidateContext] = Field(
        default_factory=list,
        description="Representative usage examples (may be empty).",
    )
    confidence: float | None = Field(
        default=None,
        description="Optional confidence score. Reserved for future use.",
    )
    notes: str | None = Field(
        default=None,
        description="Freeform metadata — e.g. 'participial adjective treated as verb'.",
    )


class AnalysisMetadata(BaseModel):
    """Top-level metadata about the analysis run."""

    job_id: str | None = Field(
        default=None, description="Echoed job ID from the request."
    )
    total_lines: int = Field(
        ..., description="Number of text lines fed into the pipeline."
    )
    total_characters: int = Field(
        ..., description="Total character count of input text."
    )
    unique_candidates: int = Field(
        ..., description="Number of unique vocabulary candidates."
    )
    spacy_model: str = Field(..., description="Name of the spaCy model used.")
    pipeline_version: str | None = Field(
        default=None, description="Echoed pipeline version."
    )


class AnalyzeResponse(BaseModel):
    """Top-level response for ``POST /api/v1/analyze``."""

    metadata: AnalysisMetadata
    candidates: list[VocabularyCandidate]
    warnings: list[str] = Field(
        default_factory=list,
        description="Non-fatal warnings (e.g. fallback model used, missing CEFR data).",
    )


class HealthResponse(BaseModel):
    """Response for ``GET /health``."""

    status: str = "ok"


class ReadyResponse(BaseModel):
    """Response for ``GET /ready``."""

    status: str = "ok"
    spacy_model_loaded: bool = False
    spacy_model_name: str | None = None
