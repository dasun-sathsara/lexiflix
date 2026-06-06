"""CEFR level resolution: given a lemma and its part of speech, ask cefrpy for a level."""

from __future__ import annotations

from cefrpy import CEFRAnalyzer  # type: ignore[import-untyped]

from app.models.vocabulary import CefrRating

_LABELS_BY_NUMERIC = {1: "A1", 2: "A2", 3: "B1", 4: "B2", 5: "C1", 6: "C2"}

# cefrpy expects base Penn Treebank tags, not spaCy's coarse POS.
_PTB_TAG_BY_POS = {
    "NOUN": "NN",
    "VERB": "VB",
    "ADJ": "JJ",
    "ADV": "RB",
}

_analyzer = CEFRAnalyzer()


def resolve_cefr(lemma: str, pos: str) -> CefrRating | None:
    """CEFR rating for a lemma, preferring the level cefrpy holds for this POS.

    Falls back to the word's average level across parts of speech, which covers
    words cefrpy knows but not under the POS we tagged.
    """

    word = lemma.casefold().strip()
    if not word:
        return None

    ptb_tag = _PTB_TAG_BY_POS.get(pos.upper())
    if ptb_tag:
        rating = _rate(lambda: _analyzer.get_word_pos_level_CEFR(word, ptb_tag))
        if rating:
            return rating

    return _rate(lambda: _analyzer.get_average_word_level_CEFR(word))


def _rate(lookup) -> CefrRating | None:  # type: ignore[no-untyped-def]
    """Normalize a cefrpy lookup to `CefrRating | None`.

    cefrpy raises for words and tags it does not know, so an unknown word is a
    normal outcome here rather than an error worth propagating.
    """

    try:
        level = lookup()
    except Exception:
        return None

    if level is None:
        return None

    numeric = int(level)
    label = _LABELS_BY_NUMERIC.get(numeric)
    return CefrRating(numeric=numeric, label=label) if label else None
