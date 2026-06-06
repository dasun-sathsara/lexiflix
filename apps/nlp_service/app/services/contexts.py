"""Scoring subtitle sentences as usage examples. Higher score is a better example."""

from __future__ import annotations

from spacy.tokens import Span, Token  # type: ignore[import-untyped]

_MIN_USEFUL_WORDS = 6
_MAX_USEFUL_WORDS = 20

_SENTENCE_ENDINGS = (".", "!", "?", '."', '!"', '?"')
_TRAILING_OFF = ("...", "--")


def score_context(sentence: Span, target: Token) -> int:
    """Rate how well ``sentence`` demonstrates ``target``."""
    text = sentence.text.strip()
    words = [token for token in sentence if not token.is_punct and not token.is_space]
    score = 0

    if _MIN_USEFUL_WORDS <= len(words) <= _MAX_USEFUL_WORDS:
        score += 3
    elif len(words) < _MIN_USEFUL_WORDS:
        score -= 2
    else:
        score -= 1

    if text.endswith(_SENTENCE_ENDINGS):
        score += 1

    if words and words[0] != target and words[-1] != target:
        score += 1

    if _is_shouted(text):
        score -= 2

    if any(marker in text for marker in _TRAILING_OFF):
        score -= 1

    return score


def _is_shouted(text: str) -> bool:
    """All-caps dialogue, which looks wrong on a study card."""
    letters = [char for char in text if char.isalpha()]
    return len(letters) > 3 and all(char.isupper() for char in letters)
