"""Deciding whether a spaCy token is a vocabulary candidate, and under which lemma."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from spacy.tokens import Token  # type: ignore[import-untyped]

# Proper nouns are excluded: names and places are not vocabulary to study.
_ALLOWED_POS = {"NOUN", "VERB", "ADJ", "ADV"}


@dataclass(frozen=True)
class LemmaCandidate:
    """A token accepted as vocabulary, reduced to the form we aggregate on."""

    lemma: str
    pos: str


def resolve_candidate(token: Token) -> LemmaCandidate | None:
    """The lemma and POS this token should be counted under, or `None` to skip it."""

    if _is_excluded(token):
        return None

    return _lemma_and_pos(token)


def _is_excluded(token: Token) -> bool:
    """Every reason a token is not vocabulary, ordered cheapest-first."""

    return (
        token.is_space
        or token.is_punct
        or bool(token.ent_type_)
        or _is_number_like(token)
        or _is_filler(token)
        or token.is_stop
        or token.pos_ not in _ALLOWED_POS
    )


# ---------------------------------------------------------------------------
# Rejection rules
# ---------------------------------------------------------------------------


def _is_number_like(token: Token) -> bool:
    """Numbers and ordinals, including spelled-out ones ("twenty", "first")."""

    return bool(token.like_num) or "Ord" in token.morph.get("NumType", [])


def _is_filler(token: Token) -> bool:
    """Discourse fillers that are tagged as real words ("look, I told you")."""

    return token.dep_ in {"discourse", "intj"}


# ---------------------------------------------------------------------------
# Lemma selection
# ---------------------------------------------------------------------------


def _lemma_and_pos(token: Token) -> LemmaCandidate | None:
    """Pick the lemma to aggregate on, and the POS that lemma belongs to."""

    if token.pos_ == "VERB":
        # spaCy's verb lemmas are unreliable on informal dialogue.
        lemma = _verb_lemma(token) or _plain_lemma(token)
        return LemmaCandidate(lemma, "VERB") if lemma else None

    lemma = _plain_lemma(token)
    return LemmaCandidate(lemma, token.pos_) if lemma else None


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
