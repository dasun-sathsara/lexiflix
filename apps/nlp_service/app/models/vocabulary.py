"""Internal domain structures used by the NLP pipeline.

These are not HTTP-facing — they bridge the gap between raw spaCy output
and the Pydantic response schemas.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class WordStats:
    """Accumulated statistics for a single vocabulary lemma."""

    count: int = 0
    cefr_label: str | None = None
    cefr_num: int | None = None  # 1=A1 … 6=C2
    primary_pos: str | None = None  # coarse POS of first occurrence
    contexts: list[str] = field(default_factory=list)

    @property
    def pos_category(self) -> str:
        """Human-readable POS category for the response."""
        mapping: dict[str, str] = {
            "NOUN": "noun",
            "VERB": "verb",
            "ADJ": "adjective",
            "ADV": "adverb",
            "PROPN": "noun",
        }
        return mapping.get(self.primary_pos or "", "unknown")
