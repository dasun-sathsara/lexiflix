"""Request schemas for the analysis API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class AnalysisOptions(BaseModel):
    """Pipeline toggles the caller can send."""

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
    Production callers send pre-cleaned ``plain_text``; SRT parsing lives here
    for direct/API testing only.
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
    pipeline_version: str | None = Field(
        default=None,
        description="Optional version tag echoed in response metadata.",
    )
    options: AnalysisOptions = Field(
        default_factory=AnalysisOptions,
        description="Pipeline behaviour toggles.",
    )
