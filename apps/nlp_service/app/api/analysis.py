"""Subtitle analysis API — v1 routes."""

from __future__ import annotations

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
        result = pipeline.analyze(request)
    except SRTParsingError as exc:
        logger.warning("SRT parsing failed: %s", exc)
        raise HTTPException(
            status_code=422,
            detail={
                "error": "srt_parsing_error",
                "message": str(exc),
                "detail": exc.detail,
            },
        ) from exc
    except EmptyContentError as exc:
        logger.warning("Empty content: %s", exc)
        raise HTTPException(
            status_code=422,
            detail={
                "error": "empty_content",
                "message": str(exc),
            },
        ) from exc
    except PipelineError as exc:
        logger.error("Pipeline error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "pipeline_error",
                "message": str(exc),
                "detail": exc.detail,
            },
        ) from exc
    except NLPServiceError as exc:
        logger.error("NLP service error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": "nlp_service_error",
                "message": str(exc),
            },
        ) from exc

    logger.info(
        "Analyze complete (job_id=%s, candidates=%d)",
        request.job_id,
        len(result.candidates),
    )
    return result
