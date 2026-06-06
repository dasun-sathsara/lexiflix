"""NLP pipeline façade — the single entry point for subtitle analysis.

Flow: extract lines → spaCy → per-(lemma, POS) aggregation → CEFR → pruning →
response. Called by the API route handler.
"""

from __future__ import annotations

import logging
from collections import defaultdict
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
from app.services.text_processing import (
    chunk_lines,
    parse_srt_content,
    split_plain_text,
)
from app.services.token_filters import resolve_candidate

logger = logging.getLogger(__name__)

type CandidateKey = tuple[str, str]  # (lemma, part of speech)

_MINORITY_POS_SHARE = 0.2
_NAME_CAPITALIZATION_SHARE = 0.8

# CEFR numeric below this (A1–B1) means the word is common enough that a
# capitalized-only spelling is probably sentence position, not a name.
_COMMON_WORD_CEFR = 4


class AnalysisPipeline:
    """Orchestrator for the full analysis flow.

    Instantiated once and reused across requests. The spaCy model is shared
    via ``model_manager``.
    """

    def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        """Run the complete analysis pipeline on an incoming request."""
        warnings: list[str] = []

        lines = self._extract_lines(request)
        if not lines:
            raise EmptyContentError(
                "No processable text found in the provided content.",
            )

        total_chars = sum(len(ln) for ln in lines)
        logger.info(
            "Pipeline: %d lines, %s chars",
            len(lines),
            f"{total_chars:,}",
        )

        docs = self._run_spacy(lines, request.options.batch_size)
        stats_by_key = _collect_stats(docs, include_propn=request.options.include_propn)
        _apply_cefr(stats_by_key)
        stats_by_key = _prune(stats_by_key, include_propn=request.options.include_propn)

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

    def _extract_lines(self, request: AnalyzeRequest) -> list[str]:
        """Dispatch to the correct text extractor based on content_type."""
        dedup = request.options.dedup_lines
        if request.content_type == "srt":
            return parse_srt_content(request.content, dedup_lines=dedup)
        return split_plain_text(request.content, dedup_lines=dedup)

    def _run_spacy(self, lines: list[str], batch_size: int) -> Iterable[Doc]:
        """Run the spaCy pipeline over chunked subtitle lines."""
        nlp = model_manager.nlp
        chunks = list(chunk_lines(lines))
        logger.info(
            "Running spaCy (chunks=%d, batch_size=%d) …",
            len(chunks),
            batch_size,
        )
        try:
            return nlp.pipe(chunks, batch_size=batch_size, n_process=1)
        except Exception as exc:
            raise PipelineError(
                "spaCy pipeline processing failed.",
                detail=str(exc),
            ) from exc


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------


def _collect_stats(
    docs: Iterable[Doc],
    *,
    include_propn: bool,
) -> dict[CandidateKey, WordStats]:
    """Count every accepted token under its (lemma, POS) key and collect examples."""
    allowed_pos = {"NOUN", "VERB", "ADJ", "ADV"}
    if include_propn:
        allowed_pos.add("PROPN")

    stats_by_key: dict[CandidateKey, WordStats] = {}

    for doc in docs:
        for sentence in doc.sents:
            for token in sentence:
                candidate = resolve_candidate(token, allowed_pos)
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
    """Track how the word actually appeared, for display and name detection."""
    surface = text.casefold().strip()
    if surface.isalpha():
        stats.surface_counts[surface] += 1

    if text.islower():
        stats.lowercase_count += 1
    elif text[:1].isupper():
        stats.capitalized_count += 1


def _apply_cefr(stats_by_key: dict[CandidateKey, WordStats]) -> None:
    """Resolve one CEFR level per (lemma, POS) pair."""
    for (lemma, pos), stats in stats_by_key.items():
        stats.cefr = resolve_cefr(lemma, pos)


# ---------------------------------------------------------------------------
# Pruning
# ---------------------------------------------------------------------------


def _prune(
    stats_by_key: dict[CandidateKey, WordStats],
    *,
    include_propn: bool,
) -> dict[CandidateKey, WordStats]:
    """Drop low-signal candidates: missed names, unrated one-offs, tagger slips."""
    kept: dict[CandidateKey, WordStats] = {}

    for lemma, variants in _group_by_lemma(stats_by_key).items():
        if not include_propn and _looks_like_missed_name(variants):
            continue

        total_count = sum(variant.count for variant in variants)
        dominant = _dominant_variant(variants)

        for variant in variants:
            if variant.count == 1 and variant.cefr is None:
                continue
            if _is_tagger_slip(variant, dominant=dominant, total_count=total_count):
                continue
            kept[(lemma, variant.pos)] = variant

    return kept


def _group_by_lemma(
    stats_by_key: dict[CandidateKey, WordStats],
) -> dict[str, list[WordStats]]:
    """Collect the POS variants of each lemma so lemma-wide rules can see them all."""
    grouped: dict[str, list[WordStats]] = defaultdict(list)
    for (lemma, _pos), stats in stats_by_key.items():
        grouped[lemma].append(stats)
    return grouped


def _dominant_variant(variants: list[WordStats]) -> WordStats:
    """The POS variant that best represents the lemma: most frequent wins."""
    pos_priority = {"VERB": 4, "NOUN": 3, "ADJ": 2, "ADV": 1, "PROPN": 0}
    return min(
        variants,
        key=lambda variant: (
            -variant.count,
            -pos_priority.get(variant.pos, -1),
            variant.pos,
        ),
    )


def _is_tagger_slip(
    variant: WordStats,
    *,
    dominant: WordStats,
    total_count: int,
) -> bool:
    """A rare secondary POS that adds no new information for the learner."""
    if variant is dominant or variant.count > 1:
        return False
    if variant.count / total_count >= _MINORITY_POS_SHARE:
        return False

    # Keep it if it teaches a different difficulty than the dominant reading.
    return variant.cefr_label == dominant.cefr_label


def _looks_like_missed_name(variants: list[WordStats]) -> bool:
    """True when a lemma is always capitalized and not a common word.

    Capitalization is summed across POS variants, since one variant alone may
    have too few occurrences for the ratio to mean anything.
    """
    total = sum(variant.count for variant in variants)
    if total == 0:
        return False
    if any(variant.lowercase_count > 0 for variant in variants):
        return False
    if any(
        variant.cefr is not None and variant.cefr.numeric < _COMMON_WORD_CEFR
        for variant in variants
    ):
        return False

    capitalized = sum(variant.capitalized_count for variant in variants)
    return capitalized / total >= _NAME_CAPITALIZATION_SHARE


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
