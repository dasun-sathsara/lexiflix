"""NLP pipeline façade — the single entry point for subtitle analysis.

Flow: extract lines → spaCy → per-(lemma, POS) aggregation → CEFR → pruning →
response. Called by the API route handler.
"""

from __future__ import annotations

import logging
from collections.abc import Iterable

from spacy.tokens import Doc  # type: ignore[import-untyped]

from app.core.exceptions import EmptyContentError, PipelineError
from app.models.vocabulary import WordStats
from app.schemas.requests import AnalyzeRequest
from app.schemas.responses import (
    AnalysisMetadata,
    AnalyzeResponse,
    VocabularyCandidate,
)
from app.services.cefr import resolve_cefr
from app.services.contexts import score_context
from app.services.spacy_models import model_manager
from app.services.text_processing import Scene, parse_srt_content
from app.services.token_filters import resolve_candidate

logger = logging.getLogger(__name__)

type CandidateKey = tuple[str, str]  # (lemma, part of speech)


class AnalysisPipeline:
    """Orchestrator for the full analysis flow.

    Instantiated once and reused across requests. The spaCy model is shared
    via `model_manager`.
    """

    def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        """Run the complete analysis pipeline on an incoming request."""

        warnings: list[str] = []

        scenes = self._extract_scenes(request)
        if not scenes:
            raise EmptyContentError(
                "No processable text found in the provided content.",
            )

        lines = [line for scene in scenes for line in scene]
        total_chars = sum(len(line) for line in lines)
        logger.info(
            "Pipeline: %d lines in %d scenes, %s chars",
            len(lines),
            len(scenes),
            f"{total_chars:,}",
        )

        docs = self._run_spacy(scenes, request.options.batch_size)
        stats_by_key = _collect_stats(docs)
        _apply_cefr(stats_by_key)
        stats_by_key = _prune(stats_by_key)

        if not stats_by_key:
            warnings.append(
                "No valid vocabulary candidates were found after filtering."
            )

        logger.info("Pipeline: %d candidates after pruning", len(stats_by_key))

        candidates = _build_candidates(stats_by_key)
        metadata = AnalysisMetadata(
            job_id=request.job_id,
            total_lines=len(lines),
            total_characters=total_chars,
            unique_candidates=len(candidates),
            spacy_model=model_manager.model_name or "unknown",
            pipeline_version=request.pipeline_version,
        )

        return AnalyzeResponse(
            metadata=metadata,
            candidates=candidates,
            warnings=warnings,
        )

    def _extract_scenes(self, request: AnalyzeRequest) -> list[Scene]:
        """Parse the SRT into scenes of cleaned subtitle lines."""

        return parse_srt_content(
            request.content,
            dedup_lines=request.options.dedup_lines,
        )

    def _run_spacy(self, scenes: list[Scene], batch_size: int) -> Iterable[Doc]:
        """Run the spaCy pipeline over the scenes, one document per scene.

        Lines within a scene are joined by newlines so the tagger sees the
        surrounding conversation, while the `cue_boundaries` component keeps
        each line a separate sentence.
        """

        nlp = model_manager.nlp
        texts = ["\n".join(scene) for scene in scenes]
        logger.info(
            "Running spaCy (scenes=%d, batch_size=%d) …",
            len(texts),
            batch_size,
        )
        try:
            return nlp.pipe(texts, batch_size=batch_size, n_process=1)
        except Exception as exc:
            raise PipelineError(
                "spaCy pipeline processing failed.",
                detail=str(exc),
            ) from exc


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------


def _collect_stats(docs: Iterable[Doc]) -> dict[CandidateKey, WordStats]:
    """Count every accepted token under its (lemma, POS) key and collect examples."""

    stats_by_key: dict[CandidateKey, WordStats] = {}

    for doc in docs:
        for sentence in doc.sents:
            for token in sentence:
                candidate = resolve_candidate(token)
                if candidate is None:
                    continue

                key = (candidate.lemma, candidate.pos)
                stats = stats_by_key.get(key)
                if stats is None:
                    stats = WordStats(pos=candidate.pos)
                    stats_by_key[key] = stats

                stats.count += 1
                stats.add_context(sentence.text.strip(), score_context(sentence, token))
                _record_surface_form(stats, token.text)

    return stats_by_key


def _record_surface_form(stats: WordStats, text: str) -> None:
    """Track how the word actually appeared, for display."""

    surface = text.casefold().strip()
    if surface.isalpha():
        stats.surface_counts[surface] += 1


def _apply_cefr(stats_by_key: dict[CandidateKey, WordStats]) -> None:
    """Resolve one CEFR level per (lemma, POS) pair."""

    for (lemma, pos), stats in stats_by_key.items():
        stats.cefr = resolve_cefr(lemma, pos)


# ---------------------------------------------------------------------------
# Pruning
# ---------------------------------------------------------------------------


def _prune(
    stats_by_key: dict[CandidateKey, WordStats],
) -> dict[CandidateKey, WordStats]:
    """Drop one-off candidates with no CEFR level: typos, foreign words, artifacts."""

    return {
        key: stats
        for key, stats in stats_by_key.items()
        if stats.count > 1 or stats.cefr is not None
    }


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------


def _build_candidates(
    stats_by_key: dict[CandidateKey, WordStats],
) -> list[VocabularyCandidate]:
    """Convert internal stats to the response schema, most frequent first."""

    sorted_items = sorted(
        stats_by_key.items(),
        key=lambda item: (-item[1].count, item[0]),
    )
    return [
        VocabularyCandidate(
            text=stats.representative_text or lemma,
            lemma=lemma,
            type=stats.pos_category,
            cefr_level=stats.cefr_label,
            count=stats.count,
            contexts=stats.context_texts,
        )
        for (lemma, _pos), stats in sorted_items
    ]


pipeline = AnalysisPipeline()
