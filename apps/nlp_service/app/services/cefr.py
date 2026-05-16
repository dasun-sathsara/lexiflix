"""CEFR level resolution via cefrpy."""

from __future__ import annotations

from cefrpy import CEFRAnalyzer  # type: ignore[import-untyped]
from cefrpy.CEFRLevel import CEFRLevel  # type: ignore[import-untyped]

LABEL_TO_NUM: dict[str, int] = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
NUM_TO_LABEL: dict[int, str] = {v: k for k, v in LABEL_TO_NUM.items()}

_COARSE_TO_PTB: dict[str, str] = {
    "NOUN": "NN",
    "VERB": "VB",
    "ADJ": "JJ",
    "ADV": "RB",
    "PROPN": "NN",
}

_analyzer = CEFRAnalyzer()


def coarse_to_base_ptb(pos: str | None) -> str | None:
    """Map spaCy coarse POS to the base Penn Treebank tag used by cefrpy."""
    return _COARSE_TO_PTB.get((pos or "").upper())


def _level_to_pair(level: CEFRLevel | None) -> tuple[int | None, str | None]:
    if level is None:
        return None, None
    num = int(level)
    return num, NUM_TO_LABEL.get(num)


def _lookup_pos(word: str, pos_ptb: str) -> tuple[int | None, str | None]:
    try:
        return _level_to_pair(_analyzer.get_word_pos_level_CEFR(word, pos_ptb))
    except Exception:
        return None, None


def _lookup_average(word: str) -> tuple[int | None, str | None]:
    try:
        return _level_to_pair(_analyzer.get_average_word_level_CEFR(word))
    except Exception:
        return None, None


def resolve_cefr(lemma: str, pos: str | None) -> tuple[int | None, str | None]:
    """Resolve CEFR for an aggregated lemma: POS lookup, then average fallback."""
    lemma = lemma.casefold().strip()
    if not lemma:
        return None, None

    pos_ptb = coarse_to_base_ptb(pos)
    if pos_ptb:
        num, label = _lookup_pos(lemma, pos_ptb)
        if num is not None:
            return num, label

    return _lookup_average(lemma)
