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
    VocabularyCandidate,
)
from app.services.cefr import resolve_cefr
from app.services.spacy_models import model_manager
from app.services.text_processing import (
    chunk_lines,
    parse_srt_content,
    split_plain_text,
)
from app.services.token_filters import get_valid_lemma

logger = logging.getLogger(__name__)

_MAX_CONTEXTS = 3


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
        word_stats = self._process_docs(
            docs,
            include_propn=request.options.include_propn,
        )

        if not word_stats:
            warnings.append("No valid vocabulary candidates were found after filtering.")

        logger.info("Pipeline: %d unique candidate lemmas", len(word_stats))

        candidates = self._build_candidates(word_stats)
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

    def _process_docs(
        self,
        docs: Iterable[Doc],
        *,
        include_propn: bool,
    ) -> dict[str, WordStats]:
        """Filter tokens, count frequencies, assign CEFR, collect contexts."""
        allowed_pos: set[str] = {"NOUN", "VERB", "ADJ", "ADV"}
        if include_propn:
            allowed_pos.add("PROPN")

        word_stats: dict[str, WordStats] = {}

        for doc in docs:
            for sent in doc.sents:
                sent_text = sent.text

                for token in sent:
                    lemma = get_valid_lemma(token, allowed_pos)
                    if not lemma:
                        continue

                    stats = word_stats.get(lemma)
                    if stats is None:
                        stats = WordStats()
                        word_stats[lemma] = stats
                    stats.count += 1
                    # Participial ADJs remapped to a verb lemma should count as VERB
                    # so CEFR POS lookup matches the stored lemma form.
                    pos = token.pos_
                    if (
                        pos == "ADJ"
                        and lemma != token.lemma_.casefold().strip()
                        and (
                            token.text.casefold().endswith("ed")
                            or token.text.casefold().endswith("ing")
                        )
                    ):
                        pos = "VERB"
                    if pos:
                        stats.pos_counts[pos] += 1

                    surface = token.text.casefold().strip()
                    if surface and surface.isalpha():
                        stats.surface_counts[surface] += 1

                    if token.text.islower():
                        stats.lowercase_count += 1
                    elif token.text[:1].isupper():
                        stats.capitalized_count += 1

                    if len(stats.contexts) < _MAX_CONTEXTS and sent_text not in stats.contexts:
                        stats.contexts.append(sent_text)

        self._apply_cefr(word_stats)
        return self._prune_word_stats(word_stats, include_propn=include_propn)

    @staticmethod
    def _apply_cefr(word_stats: dict[str, WordStats]) -> None:
        """Assign CEFR labels after lemma aggregation."""
        for lemma, stats in word_stats.items():
            level_num, level_label = resolve_cefr(lemma, stats.dominant_pos)
            stats.cefr_num = level_num
            stats.cefr_label = level_label

    @staticmethod
    def _prune_word_stats(
        word_stats: dict[str, WordStats],
        *,
        include_propn: bool,
    ) -> dict[str, WordStats]:
        """Drop low-signal artifacts and title-case name-like one-offs."""
        filtered: dict[str, WordStats] = {}
        for lemma, stats in word_stats.items():
            if stats.count == 1 and stats.cefr_num is None:
                continue
            if not include_propn and AnalysisPipeline._looks_like_missed_name(stats):
                continue
            filtered[lemma] = stats
        return filtered

    @staticmethod
    def _looks_like_missed_name(stats: WordStats) -> bool:
        """Drop never-lowercase, mostly capitalized lemmas with no easy CEFR signal."""
        if stats.count == 0 or stats.lowercase_count > 0:
            return False
        if stats.cefr_num is not None and stats.cefr_num < 4:
            return False
        return stats.capitalized_count / stats.count >= 0.8

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
                text=stats.representative_text or lemma,
                lemma=lemma,
                type=stats.pos_category,
                cefr_level=stats.cefr_label,
                count=stats.count,
                contexts=list(stats.contexts),
            )
            for lemma, stats in sorted_items
        ]


pipeline = AnalysisPipeline()
