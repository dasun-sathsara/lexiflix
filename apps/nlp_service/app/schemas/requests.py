"""Request schemas for the analysis API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AnalysisOptions(BaseModel):
    """Pipeline toggles the caller can send."""

    dedup_lines: bool = Field(
        default=True,
        description="Deduplicate near-identical subtitle lines before analysis.",
    )
    batch_size: int = Field(
        default=200,
        ge=1,
        le=10_000,
        description="Batch size for spaCy pipeline processing.",
    )


class AnalyzeRequest(BaseModel):
    """Top-level request body for ``POST /api/v1/analyze``."""

    job_id: str | None = Field(
        default=None,
        description="Opaque job identifier from the calling workflow. Echoed in the response.",
    )
    content: str = Field(
        ...,
        min_length=1,
        description="Raw SRT markup.",
    )
    pipeline_version: str | None = Field(
        default=None,
        description="Optional version tag echoed in response metadata.",
    )
    options: AnalysisOptions = Field(
        default_factory=AnalysisOptions,
        description="Pipeline behaviour toggles.",
    )
