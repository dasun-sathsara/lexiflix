"""Internal domain structures used by the NLP pipeline.

These are not HTTP-facing — they bridge the gap between raw spaCy output
and the Pydantic response schemas.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field


@dataclass
class WordStats:
    """Accumulated statistics for a single vocabulary lemma."""

    count: int = 0
    cefr_label: str | None = None
    cefr_num: int | None = None  # 1=A1 … 6=C2
    cefr_confidence: float | None = None
    cefr_note: str | None = None
    pos_counts: Counter[str] = field(default_factory=Counter)
    surface_counts: Counter[str] = field(default_factory=Counter)
    capitalized_count: int = 0
    lowercase_count: int = 0
    name_like_count: int = 0
    contexts: list[str] = field(default_factory=list)

    @property
    def dominant_pos(self) -> str | None:
        """Most common coarse POS observed for this lemma."""
        if not self.pos_counts:
            return None

        pos_priority: dict[str, int] = {
            "VERB": 4,
            "NOUN": 3,
            "ADJ": 2,
            "ADV": 1,
            "PROPN": 0,
        }
        return min(
            self.pos_counts,
            key=lambda pos: (-self.pos_counts[pos], -pos_priority.get(pos, -1), pos),
        )

    @property
    def representative_text(self) -> str | None:
        """Most representative observed surface form, lowercased."""
        if not self.surface_counts:
            return None

        surface, _ = min(
            self.surface_counts.items(),
            key=lambda item: (-item[1], len(item[0]), item[0]),
        )
        return surface

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
        return mapping.get(self.dominant_pos or "", "unknown")
