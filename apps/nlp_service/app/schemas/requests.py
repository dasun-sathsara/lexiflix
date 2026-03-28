"""Request schemas for the analysis API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AnalysisOptions(BaseModel):
    """Optional pipeline toggles the caller can send.

    Designed for forward compatibility — the TypeScript workflow layer can
    evolve without breaking the request shape by adding new optional fields here.
    """

    include_propn: bool = Field(
        default=False,
        description="Include proper nouns (treated as common nouns) in the output.",
    )
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
    """Top-level request body for ``POST /api/v1/analyze``.

    Accepts either raw SRT content or already-extracted plain text.
    """

    job_id: str | None = Field(
        default=None,
        description="Opaque job identifier from the calling workflow. Echoed in the response.",
    )
    content: str = Field(
        ...,
        min_length=1,
        description="Subtitle content — either SRT markup or plain text.",
    )
    content_type: Literal["srt", "plain_text"] = Field(
        default="srt",
        description="Format of the content field.",
    )
    user_cefr_level: str | None = Field(
        default=None,
        description="Learner's current CEFR level (e.g. 'B1'). Reserved for future filtering.",
    )
    study_language: str | None = Field(
        default=None,
        description="Language being studied. Currently only 'en' is supported.",
    )
    pipeline_version: str | None = Field(
        default=None,
        description="Optional version tag for pipeline feature gating.",
    )
    options: AnalysisOptions = Field(
        default_factory=AnalysisOptions,
        description="Pipeline behaviour toggles.",
    )
