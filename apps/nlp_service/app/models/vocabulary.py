"""Internal domain structures used by the NLP pipeline.

These are not HTTP-facing — they bridge the gap between raw spaCy output
and the Pydantic response schemas.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field

MAX_CONTEXTS = 3

_POS_CATEGORY = {
    "NOUN": "noun",
    "VERB": "verb",
    "ADJ": "adjective",
    "ADV": "adverb",
    "PROPN": "noun",
}

_CONTEXT_KEY_NOISE = re.compile(r"[^\w\s]")
_WHITESPACE = re.compile(r"\s+")


def context_key(text: str) -> str:
    """Case- and punctuation-insensitive key, so near-identical lines count as one."""
    key = _CONTEXT_KEY_NOISE.sub("", text.casefold())
    return _WHITESPACE.sub(" ", key).strip()


@dataclass(frozen=True)
class CefrRating:
    """A resolved CEFR level. ``numeric`` is 1=A1 … 6=C2."""

    numeric: int
    label: str


@dataclass
class ScoredContext:
    """An example sentence together with how well it illustrates the word."""

    text: str
    score: int


@dataclass
class WordStats:
    """Accumulated statistics for one (lemma, part-of-speech) pair."""

    pos: str
    count: int = 0
    cefr: CefrRating | None = None
    surface_counts: Counter[str] = field(default_factory=Counter)
    capitalized_count: int = 0
    lowercase_count: int = 0
    contexts: list[ScoredContext] = field(default_factory=list)
    _seen_context_keys: set[str] = field(default_factory=set, repr=False)

    def add_context(self, text: str, score: int) -> None:
        """Keep the ``MAX_CONTEXTS`` best-scoring distinct sentences, best first."""
        key = context_key(text)
        if not key or key in self._seen_context_keys:
            return

        self._seen_context_keys.add(key)
        self.contexts.append(ScoredContext(text=text, score=score))
        # Stable sort, so sentences with equal scores stay in the order seen.
        self.contexts.sort(key=lambda context: -context.score)
        del self.contexts[MAX_CONTEXTS:]

    @property
    def context_texts(self) -> list[str]:
        return [context.text for context in self.contexts]

    @property
    def cefr_label(self) -> str | None:
        return self.cefr.label if self.cefr else None

    @property
    def representative_text(self) -> str | None:
        """Most frequent observed surface form; shortest wins ties."""
        if not self.surface_counts:
            return None

        surface, _ = min(
            self.surface_counts.items(),
            key=lambda item: (-item[1], len(item[0]), item[0]),
        )
        return surface

    @property
    def pos_category(self) -> str:
        """Human-readable part of speech for the response."""
        return _POS_CATEGORY.get(self.pos, "unknown")
