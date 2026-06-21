"""CEFR level resolution helpers using cefrpy as the single source."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from cefrpy import CEFRAnalyzer  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)

LABEL_TO_NUM: dict[str, int] = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
NUM_TO_LABEL: dict[int, str] = {v: k for k, v in LABEL_TO_NUM.items()}


def coarse_to_base_ptb(pos: str | None) -> str | None:
    """Map spaCy coarse POS to the base Penn Treebank tag used by cefrpy."""
    mapping: dict[str, str] = {
        "NOUN": "NN",
        "VERB": "VB",
        "ADJ": "JJ",
        "ADV": "RB",
        "PROPN": "NN",
    }
    return mapping.get((pos or "").upper())


def normalize_cefr_value(val: object) -> tuple[int | None, str | None]:
    """Accept various cefrpy return types and normalize to ``(num, label)``."""
    if val is None:
        return None, None

    try:
        if isinstance(val, int | float | str):
            num = int(val)
            label = NUM_TO_LABEL.get(num)
            if label:
                return num, label
    except (TypeError, ValueError):
        pass

    try:
        num_attr = getattr(val, "value", None)
        if isinstance(num_attr, int) and num_attr in NUM_TO_LABEL:
            return num_attr, NUM_TO_LABEL[num_attr]
    except Exception:
        pass

    s = str(val).upper().strip()
    if s in LABEL_TO_NUM:
        return LABEL_TO_NUM[s], s

    try:
        f = float(s)
        num = int(round(f))
        if num in NUM_TO_LABEL:
            return num, NUM_TO_LABEL[num]
    except (TypeError, ValueError):
        pass

    return None, None


@dataclass(frozen=True)
class CEFRResult:
    """Final CEFR result returned to the pipeline."""

    level_num: int | None
    level_label: str | None


class CEFRLookup:
    """CEFR resolver using ``cefrpy`` as the single source."""

    def __init__(
        self,
        analyzer: CEFRAnalyzer | None = None,
    ) -> None:
        self.analyzer = analyzer or CEFRAnalyzer()
        self._cache_pos: dict[tuple[str, str], tuple[int, str]] = {}
        self._cache_avg: dict[str, tuple[int, str]] = {}
        self._cache_candidate: dict[tuple[str, str], CEFRResult] = {}
        self._cache_candidate_lemma: dict[str, CEFRResult] = {}

    def get_pos_level(self, word: str, pos_ptb: str) -> tuple[int | None, str | None]:
        """Fetch the CEFR level for a specific word/POS combination from cefrpy."""
        key = (word, pos_ptb)
        if key in self._cache_pos:
            return self._cache_pos[key]
        try:
            val = self.analyzer.get_word_pos_level_CEFR(word, pos_ptb)
        except Exception:
            val = None
        num, label = normalize_cefr_value(val)
        if num is not None and label is not None:
            self._cache_pos[key] = (num, label)
        return num, label

    def get_average_level(self, word: str) -> tuple[int | None, str | None]:
        """Fetch the average CEFR level for a word across all its POS usages from cefrpy."""
        if word in self._cache_avg:
            return self._cache_avg[word]
        try:
            val = self.analyzer.get_average_word_level_CEFR(word)
        except Exception:
            val = None
        num, label = normalize_cefr_value(val)
        if num is not None and label is not None:
            self._cache_avg[word] = (num, label)
        return num, label

    def resolve_candidate(self, lemma: str, pos: str | None) -> CEFRResult:
        """Resolve a final CEFR label for an aggregated candidate."""
        lemma = lemma.casefold().strip()
        pos_ptb = coarse_to_base_ptb(pos)

        if pos_ptb:
            cache_key = (lemma, pos_ptb)
            if cache_key in self._cache_candidate:
                return self._cache_candidate[cache_key]
        else:
            if lemma in self._cache_candidate_lemma:
                return self._cache_candidate_lemma[lemma]

        level_num: int | None = None
        level_label: str | None = None

        # Try POS-specific lookup
        if pos_ptb:
            level_num, level_label = self.get_pos_level(lemma, pos_ptb)
            # If adjective (JJ) and no hit, retry as verb (VB)
            if level_num is None and pos_ptb == "JJ":
                level_num, level_label = self.get_pos_level(lemma, "VB")

        # Fallback to average level if still unresolved
        if level_num is None:
            level_num, level_label = self.get_average_level(lemma)

        # Build the result
        if level_num is not None:
            result = CEFRResult(
                level_num=level_num,
                level_label=level_label,
            )
        else:
            result = CEFRResult(
                level_num=None,
                level_label=None,
            )

        # Cache the result
        if pos_ptb:
            self._cache_candidate[(lemma, pos_ptb)] = result
        else:
            self._cache_candidate_lemma[lemma] = result

        return result
