"""Subtitle analysis API — v1 routes."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException

from app.core.exceptions import (
    EmptyContentError,
    NLPServiceError,
    PipelineError,
    SRTParsingError,
)
from app.schemas.requests import AnalyzeRequest
from app.schemas.responses import AnalyzeResponse
from app.services.pipeline import pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["analysis"])


def _http_for_domain_error(exc: NLPServiceError) -> tuple[int, str]:
    if isinstance(exc, SRTParsingError):
        return 422, "srt_parsing_error"
    if isinstance(exc, EmptyContentError):
        return 422, "empty_content"
    if isinstance(exc, PipelineError):
        return 500, "pipeline_error"
    return 500, "nlp_service_error"


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """Analyze subtitle content and return structured vocabulary candidates.

    Accepts either raw SRT content or pre-extracted plain text.
    Called synchronously by Trigger.dev as one workflow step.
    """
    logger.info(
        "Analyze request received (job_id=%s, content_type=%s, content_length=%d)",
        request.job_id,
        request.content_type,
        len(request.content),
    )

    try:
        result = await asyncio.to_thread(pipeline.analyze, request)
    except NLPServiceError as exc:
        status, error_code = _http_for_domain_error(exc)
        logger.log(
            logging.WARNING if status < 500 else logging.ERROR,
            "%s: %s",
            type(exc).__name__,
            exc,
            exc_info=status >= 500,
        )
        detail: dict[str, str | None] = {
            "error": error_code,
            "message": str(exc),
        }
        if getattr(exc, "detail", None):
            detail["detail"] = exc.detail
        raise HTTPException(status_code=status, detail=detail) from exc
    except Exception as exc:
        logger.exception("Unexpected error during analysis (job_id=%s)", request.job_id)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "internal_error",
                "message": "An unexpected error occurred during analysis.",
            },
        ) from exc

    logger.info(
        "Analyze complete (job_id=%s, candidates=%d)",
        request.job_id,
        len(result.candidates),
    )
    return result
