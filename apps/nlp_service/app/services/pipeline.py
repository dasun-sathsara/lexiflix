"""NLP pipeline façade — the single entry point for subtitle analysis.

Orchestrates text preprocessing → spaCy processing → token filtering →
CEFR resolution → structured output. Called by the API route handler.
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
    CandidateContext,
    VocabularyCandidate,
)
from app.services.cefr import CEFRLookup
from app.services.spacy_models import model_manager
from app.services.text_processing import parse_srt_content, split_plain_text
from app.services.token_filters import get_valid_lemma

logger = logging.getLogger(__name__)

# Maximum number of context examples to keep per candidate
_MAX_CONTEXTS = 3


class AnalysisPipeline:
    """Stateless orchestrator for the full analysis flow.

    Designed to be instantiated once and called many times.
    Heavy resources (spaCy model, CEFR analyzer) are shared via singletons.
    """

    def __init__(self) -> None:
        self._cefr_lookup = CEFRLookup()

    def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        """Run the complete analysis pipeline on an incoming request."""
        warnings: list[str] = []

        # 1. Text extraction
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

        # 2. spaCy NLP processing
        docs = self._run_spacy(lines, request.options.batch_size)

        # 3. Token filtering + CEFR resolution
        word_stats = self._process_docs(
            docs,
            lines=lines,
            include_propn=request.options.include_propn,
        )

        if not word_stats:
            warnings.append(
                "No valid vocabulary candidates were found after filtering."
            )

        logger.info("Pipeline: %d unique candidate lemmas", len(word_stats))

        # 4. Build response
        candidates = self._build_candidates(word_stats)
        metadata = AnalysisMetadata(
            job_id=request.job_id,
            total_lines=len(lines),
            total_characters=total_chars,
            unique_candidates=len(candidates),
            spacy_model=model_manager.model_name or "unknown",
            pipeline_version=request.pipeline_version,
        )

        # Add model-fallback warning if relevant
        if not model_manager.is_transformer:
            warnings.append(
                f"Transformer model not available — using '{model_manager.model_name}'. "
                "Results may be less accurate."
            )

        return AnalyzeResponse(
            metadata=metadata,
            candidates=candidates,
            warnings=warnings,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _extract_lines(self, request: AnalyzeRequest) -> list[str]:
        """Dispatch to the correct text extractor based on content_type."""
        dedup = request.options.dedup_lines
        if request.content_type == "srt":
            return parse_srt_content(request.content, dedup_lines=dedup)
        return split_plain_text(request.content, dedup_lines=dedup)

    def _run_spacy(self, lines: list[str], batch_size: int) -> Iterable[Doc]:
        """Run the spaCy pipeline over the extracted lines."""
        nlp = model_manager.nlp
        is_trf = model_manager.is_transformer
        # Transformers don't support multiprocessing well
        n_process = 1 if is_trf else -1
        logger.info(
            "Running spaCy (batch_size=%d, n_process=%s) …",
            batch_size,
            n_process,
        )
        try:
            return nlp.pipe(lines, batch_size=batch_size, n_process=n_process)
        except Exception as exc:
            raise PipelineError(
                "spaCy pipeline processing failed.",
                detail=str(exc),
            ) from exc

    def _process_docs(
        self,
        docs: Iterable[Doc],
        *,
        lines: list[str],
        include_propn: bool,
    ) -> dict[str, WordStats]:
        """Filter tokens, count frequencies, assign CEFR levels, collect contexts."""
        allowed_pos: set[str] = {"NOUN", "VERB", "ADJ", "ADV"}
        if include_propn:
            allowed_pos.add("PROPN")

        word_stats: dict[str, WordStats] = {}

        for doc in docs:
            # The doc.text gives us the original line for context
            line_text = doc.text

            for token in doc:
                lemma = get_valid_lemma(token, allowed_pos)
                if not lemma:
                    continue

                stats = word_stats.get(lemma)
                if stats is None:
                    stats = WordStats(
                        count=0,
                        primary_pos=token.pos_,
                    )
                    word_stats[lemma] = stats
                stats.count += 1

                # Collect context examples (up to limit)
                if (
                    len(stats.contexts) < _MAX_CONTEXTS
                    and line_text not in stats.contexts
                ):
                    stats.contexts.append(line_text)

                # CEFR lookup with fallbacks
                num, label = self._cefr_lookup.best_level_for_token(token, lemma)
                if num is not None and label is not None:
                    if stats.cefr_num is None or num < stats.cefr_num:
                        stats.cefr_num = num
                        stats.cefr_label = label

        return word_stats

    @staticmethod
    def _build_candidates(
        word_stats: dict[str, WordStats],
    ) -> list[VocabularyCandidate]:
        """Convert internal WordStats to the response schema, sorted by count desc."""
        sorted_items = sorted(
            word_stats.items(),
            key=lambda item: (-item[1].count, item[0]),
        )
        return [
            VocabularyCandidate(
                text=lemma,
                lemma=lemma,
                type=stats.pos_category,
                cefr_level=stats.cefr_label,
                cefr_numeric=stats.cefr_num,
                count=stats.count,
                contexts=[CandidateContext(text=ctx) for ctx in stats.contexts],
            )
            for lemma, stats in sorted_items
        ]


# Module-level singleton
pipeline = AnalysisPipeline()
