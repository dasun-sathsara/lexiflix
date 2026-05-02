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
from app.services.text_processing import (
    chunk_lines,
    parse_srt_content,
    split_plain_text,
)
from app.services.token_filters import get_valid_lemma, token_looks_like_name_reference

logger = logging.getLogger(__name__)

# Maximum number of context examples to keep per candidate after scoring
_MAX_CONTEXTS = 3
# Upper bound on unique contexts collected before scoring/selection
_MAX_CONTEXT_CANDIDATES = 20


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
        """Run the spaCy pipeline over chunked subtitle lines."""
        nlp = model_manager.nlp
        is_trf = model_manager.is_transformer
        # Transformers don't support multiprocessing well
        n_process = 1 if is_trf else -1
        chunks = list(chunk_lines(lines))
        logger.info(
            "Running spaCy (chunks=%d, batch_size=%d, n_process=%s) …",
            len(chunks),
            batch_size,
            n_process,
        )
        try:
            return nlp.pipe(chunks, batch_size=batch_size, n_process=n_process)
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
        """Filter tokens, count frequencies, calibrate CEFR levels, collect contexts."""
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
                    if token.pos_:
                        stats.pos_counts[token.pos_] += 1

                    surface = token.text.casefold().strip()
                    if surface and surface.isalpha():
                        stats.surface_counts[surface] += 1

                    if token.text.islower():
                        stats.lowercase_count += 1
                    elif token.text[:1].isupper():
                        stats.capitalized_count += 1

                    if token_looks_like_name_reference(token):
                        stats.name_like_count += 1

                    if (
                        len(stats.contexts) < _MAX_CONTEXT_CANDIDATES
                        and sent_text not in stats.contexts
                    ):
                        stats.contexts.append(sent_text)

        self._apply_calibrated_cefr(word_stats)
        self._select_best_contexts(word_stats)
        return self._prune_word_stats(word_stats, include_propn=include_propn)

    def _apply_calibrated_cefr(self, word_stats: dict[str, WordStats]) -> None:
        """Assign calibrated CEFR labels after lemma aggregation."""
        for lemma, stats in word_stats.items():
            result = self._cefr_lookup.resolve_candidate(lemma, stats.dominant_pos)
            stats.cefr_num = result.level_num
            stats.cefr_label = result.level_label
            stats.cefr_confidence = result.confidence
            stats.cefr_note = result.note

    @staticmethod
    def _score_context(text: str) -> float:
        """Score a sentence for its usefulness as a vocabulary example context.

        Rewards sentences that are 6–18 words long, penalises sentences that
        start with a third-person pronoun (likely referring out of the
        sentence), and gives a small bonus for sentences with several
        longer content words.
        """
        words = text.split()
        n = len(words)
        if n < 1:
            return -100.0

        if n < 6:
            score = float(n) * 0.5
        elif n <= 18:
            score = 8.0 + (n - 6) * 0.15
        else:
            score = 9.8 - (n - 18) * 0.05

        first = words[0].casefold().rstrip(".,!?;:\"'")
        if first in {
            "he", "she", "it", "they", "we",
            "his", "her", "its", "their",
            "this", "that", "these", "those",
            "him", "them",
        }:
            score -= 2.5

        long_words = sum(1 for w in words if len(w) > 3)
        if long_words >= 3:
            score += 1.0

        return score

    @staticmethod
    def _select_best_contexts(word_stats: dict[str, WordStats]) -> None:
        """Trim each candidate's context list to the top-scoring examples."""
        for stats in word_stats.values():
            if len(stats.contexts) <= _MAX_CONTEXTS:
                continue
            stats.contexts = sorted(
                stats.contexts,
                key=AnalysisPipeline._score_context,
                reverse=True,
            )[:_MAX_CONTEXTS]

    @staticmethod
    def _prune_word_stats(
        word_stats: dict[str, WordStats],
        *,
        include_propn: bool,
    ) -> dict[str, WordStats]:
        """Drop low-signal artifacts and proper nouns that slipped past token filtering."""
        filtered: dict[str, WordStats] = {}
        for lemma, stats in word_stats.items():
            if AnalysisPipeline._should_drop_low_signal_candidate(stats):
                continue
            if not include_propn and AnalysisPipeline._looks_like_missed_proper_noun(
                stats
            ):
                continue
            filtered[lemma] = stats
        return filtered

    @staticmethod
    def _should_drop_low_signal_candidate(stats: WordStats) -> bool:
        """Drop one-off garbage that has no CEFR signal and no repetition."""
        if stats.count == 1 and stats.cefr_num is None:
            return True
        return False

    @staticmethod
    def _looks_like_missed_proper_noun(stats: WordStats) -> bool:
        """Prune candidates that behave like names even when NER/POS missed them."""
        if stats.count == 0:
            return False
        if stats.lowercase_count > 0:
            return False
        if stats.cefr_num is not None and stats.cefr_num < 4:
            return False

        capitalized_ratio = stats.capitalized_count / stats.count
        name_like_ratio = stats.name_like_count / stats.count
        return capitalized_ratio >= 0.8 and name_like_ratio >= 0.5

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
                cefr_numeric=stats.cefr_num,
                count=stats.count,
                contexts=[CandidateContext(text=ctx) for ctx in stats.contexts],
                confidence=stats.cefr_confidence,
                notes=stats.cefr_note,
            )
            for lemma, stats in sorted_items
        ]


# Module-level singleton
pipeline = AnalysisPipeline()
