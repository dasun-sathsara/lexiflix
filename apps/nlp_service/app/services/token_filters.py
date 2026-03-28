"""Token-level filtering logic.

Encapsulates all the heuristic rules that decide whether a spaCy token
should be excluded from the vocabulary candidate list. Extracted from the
original analyzer's ``token_should_be_excluded`` and related helpers.
"""

from __future__ import annotations

from spacy.tokens import Token  # type: ignore[import-untyped]


def is_named_entity_token(token: Token) -> bool:
    """Exclude tokens that belong to any named entity span."""
    return bool(token.ent_type_)


def is_disfluency_or_filler(token: Token) -> bool:
    """Detect interjections / discourse fillers using linguistic signals only.

    No hardcoded word lists — relies on POS, PTB tag, and dependency label.
    """
    if token.pos_ == "INTJ":
        return True
    if token.tag_.upper() == "UH":
        return True
    if token.dep_ in {"discourse", "intj"}:
        return True
    # Very short stop-wordy fragments in filler-prone POS categories
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


def get_valid_lemma(token: Token, allowed_pos: set[str]) -> str | None:
    """Return cleaned lemma if the token passes all filters, else ``None``."""
    if token_should_be_excluded(token, allowed_pos):
        return None

    lemma = token.lemma_.lower().strip()

    # Participial adjectives → prefer verb lemma
    if token.pos_ == "ADJ" and (
        token.text.lower().endswith("ed") or token.text.lower().endswith("ing")
    ):
        from lemminflect import getLemma  # type: ignore[import-untyped]

        verb_lemma_tuple = getLemma(token.text, upos="VERB")
        if verb_lemma_tuple:
            lemma = verb_lemma_tuple[0].lower().strip()

    # Only purely alphabetic lemmas survive
    if not lemma or not lemma.isalpha():
        return None

    return lemma
