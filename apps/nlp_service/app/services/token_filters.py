"""Deciding whether a spaCy token is a vocabulary candidate, and under which lemma.

Read top-down: ``resolve_candidate`` is the only entry point, ``exclusion_reason``
holds every rejection rule, ``_lemma_and_pos`` picks the form to aggregate on.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from spacy.tokens import Token  # type: ignore[import-untyped]

_TITLE_MARKERS = {"agent", "dr", "doctor", "miss", "mr", "mrs", "ms"}

_POSSESSIVE_SUFFIXES = {"'s", "’s"}

_MAX_NON_WORD_RATIO = 0.6


@dataclass(frozen=True)
class LemmaCandidate:
    """A token accepted as vocabulary, reduced to the form we aggregate on."""

    lemma: str
    pos: str


def resolve_candidate(token: Token, allowed_pos: set[str]) -> LemmaCandidate | None:
    """The lemma and POS this token should be counted under, or ``None`` to skip it."""
    if exclusion_reason(token, allowed_pos) is not None:
        return None

    return _lemma_and_pos(token)


def exclusion_reason(token: Token, allowed_pos: set[str]) -> str | None:
    """Why this token is not vocabulary, or ``None`` when it qualifies.

    Rules are ordered cheapest-first. The returned string is a label for
    debugging; callers only need the ``None`` / not-``None`` split.
    """
    if token.is_space or token.is_punct:
        return "punctuation"
    if token.ent_type_:
        return "named_entity"
    if _is_number_like(token):
        return "number_like"
    if _is_filler(token):
        return "filler"
    if token.is_stop:
        return "stop_word"
    if token.pos_ not in allowed_pos:
        return "pos_not_wanted"
    if _looks_like_name_reference(token):
        return "name_reference"
    return None


# ---------------------------------------------------------------------------
# Rejection rules
# ---------------------------------------------------------------------------


def _is_number_like(token: Token) -> bool:
    """Numbers, ordinals, and tokens dominated by digits or symbols."""
    if token.like_num:
        return True
    if "Ord" in token.morph.get("NumType", []):
        return True

    text = token.text
    if not text:
        return True

    non_word = sum(1 for char in text if not char.isalnum() and not char.isspace())
    digits = sum(1 for char in text if char.isdigit())
    return (non_word + digits) / len(text) >= _MAX_NON_WORD_RATIO


def _is_filler(token: Token) -> bool:
    """Interjections and discourse fillers ("uh", "well", "you know")."""
    if token.pos_ == "INTJ" or token.tag_.upper() == "UH":
        return True
    if token.dep_ in {"discourse", "intj"}:
        return True

    # Short stop words tagged as vague categories are almost always fillers.
    is_vague = token.pos_ in {"X", "PART", "ADV"}
    return token.is_stop and is_vague and len(token.lemma_) <= 4


def _looks_like_name_reference(token: Token) -> bool:
    """Capitalized names NER missed, judged from the immediate neighbours only."""
    if token.pos_ not in {"PROPN", "NOUN"}:
        return False

    text = token.text.strip()
    if not text or not token.is_alpha or not text[0].isupper():
        return False

    previous_token = token.doc[token.i - 1] if token.i > 0 else None
    if previous_token and previous_token.text.rstrip(".").casefold() in _TITLE_MARKERS:
        return True

    next_token = token.doc[token.i + 1] if token.i + 1 < len(token.doc) else None
    return bool(next_token and next_token.text in _POSSESSIVE_SUFFIXES)


# ---------------------------------------------------------------------------
# Lemma selection
# ---------------------------------------------------------------------------


def _lemma_and_pos(token: Token) -> LemmaCandidate | None:
    """Pick the lemma to aggregate on, and the POS that lemma belongs to."""
    if token.pos_ == "VERB":
        # spaCy's verb lemmas are unreliable on informal dialogue.
        lemma = _verb_lemma(token) or _plain_lemma(token)
        return LemmaCandidate(lemma, "VERB") if lemma else None

    if token.pos_ == "ADJ" and _is_participle(token):
        # Stored under the verb lemma, so the POS has to follow: the CEFR lookup
        # would otherwise ask for an adjective named "break".
        verb_lemma = _verb_lemma(token)
        if verb_lemma:
            return LemmaCandidate(verb_lemma, "VERB")

    lemma = _plain_lemma(token)
    return LemmaCandidate(lemma, token.pos_) if lemma else None


def _is_participle(token: Token) -> bool:
    text = token.text.casefold()
    return text.endswith("ed") or text.endswith("ing")


def _plain_lemma(token: Token) -> str | None:
    """spaCy's lemma, normalized; ``None`` when it is not a plain word."""
    lemma = token.lemma_.casefold().strip()
    return lemma if lemma.isalpha() else None


def _verb_lemma(token: Token) -> str | None:
    return _verb_lemma_cached(token.text.casefold())


@lru_cache(maxsize=8_192)
def _verb_lemma_cached(text: str) -> str | None:
    """Base verb form for a surface word, cached because dialogue repeats a lot."""
    from lemminflect import getLemma  # type: ignore[import-untyped]

    for candidate in getLemma(text, upos="VERB"):
        lemma = candidate.casefold().strip()
        if lemma.isalpha():
            return lemma
    return None
