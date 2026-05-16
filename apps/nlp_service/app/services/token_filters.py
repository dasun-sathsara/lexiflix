"""Token-level filtering logic.

Encapsulates the heuristic rules that decide whether a spaCy token
should be excluded from the vocabulary candidate list.
"""

from __future__ import annotations

from functools import lru_cache

from spacy.tokens import Token  # type: ignore[import-untyped]

_TITLE_MARKERS = {"agent", "dr", "doctor", "miss", "mr", "mrs", "ms"}


def is_named_entity_token(token: Token) -> bool:
    """Exclude tokens that belong to any named entity span."""
    return bool(token.ent_type_)


def is_disfluency_or_filler(token: Token) -> bool:
    """Detect interjections / discourse fillers using linguistic signals only."""
    if token.pos_ == "INTJ":
        return True
    if token.tag_.upper() == "UH":
        return True
    if token.dep_ in {"discourse", "intj"}:
        return True
    lemma = token.lemma_.lower()
    if token.is_stop and len(lemma) <= 4 and token.pos_ in {"X", "PART", "ADV"}:
        return True
    return False


def is_ordinal_token(token: Token) -> bool:
    """Detect ordinal tokens using morphological features."""
    return "Ord" in token.morph.get("NumType", [])


def is_mostly_digits_or_punct(token: Token) -> bool:
    """Drop tokens that are numeric-like or dominated by digits/punctuation."""
    if token.like_num:
        return True
    txt = token.text
    if not txt:
        return True
    digits = sum(c.isdigit() for c in txt)
    punct_like = sum(not c.isalnum() and not c.isspace() for c in txt)
    ratio = (digits + punct_like) / max(1, len(txt))
    return ratio >= 0.6


def token_should_be_excluded(token: Token, allowed_pos: set[str]) -> bool:
    """Master exclusion gate — returns ``True`` if the token should be skipped."""
    if token.is_space or token.is_punct:
        return True
    if is_named_entity_token(token):
        return True
    if is_ordinal_token(token) or is_mostly_digits_or_punct(token):
        return True
    if is_disfluency_or_filler(token):
        return True
    if token.is_stop:
        return True
    if token.pos_ not in allowed_pos:
        return True
    return False


def token_looks_like_name_reference(token: Token) -> bool:
    """Cheap local heuristic for title-cased name references NER may miss.

    Only inspects immediate neighbors — no full-doc scans.
    """
    text = token.text.strip()
    if not text or not token.is_alpha or not text[0].isupper():
        return False

    if token.i > 0:
        prev = token.doc[token.i - 1].text.rstrip(".").casefold()
        if prev in _TITLE_MARKERS:
            return True

    if token.i + 1 < len(token.doc) and token.doc[token.i + 1].text in {"'s", "’s"}:
        return True

    return False


@lru_cache(maxsize=8_192)
def _verb_lemma_cached(text: str) -> str | None:
    """Cached lemminflect verb-lemma lookup (casefolded surface form)."""
    from lemminflect import getLemma  # type: ignore[import-untyped]

    lemmas = getLemma(text, upos="VERB")
    for candidate in lemmas:
        cleaned = candidate.casefold().strip()
        if cleaned and cleaned.isalpha():
            return cleaned
    return None


def _verb_lemma(token: Token) -> str | None:
    """Resolve a spaCy token to its base verb lemma via lemminflect."""
    return _verb_lemma_cached(token.text.casefold())


def get_valid_lemma(token: Token, allowed_pos: set[str]) -> str | None:
    """Return cleaned lemma if the token passes all filters, else ``None``."""
    if token_should_be_excluded(token, allowed_pos):
        return None

    # Soft name-reference exclusion (title markers / possessive) before lemma work
    if token_looks_like_name_reference(token) and token.pos_ in {"PROPN", "NOUN"}:
        return None

    lemma = token.lemma_.casefold().strip()

    if token.pos_ == "VERB":
        verb_lemma = _verb_lemma(token)
        if verb_lemma:
            lemma = verb_lemma

    # Participial adjectives → prefer verb lemma
    if token.pos_ == "ADJ" and (
        token.text.casefold().endswith("ed") or token.text.casefold().endswith("ing")
    ):
        verb_lemma = _verb_lemma(token)
        if verb_lemma:
            lemma = verb_lemma

    if not lemma or not lemma.isalpha():
        return None

    return lemma
