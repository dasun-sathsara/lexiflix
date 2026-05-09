"""Tests for WordStats domain model."""

from __future__ import annotations

from collections import Counter

import pytest

from app.models.vocabulary import WordStats


class TestDominantPos:
    def test_returns_highest_count_pos(self) -> None:
        stats = WordStats(pos_counts=Counter({"NOUN": 5, "VERB": 3, "ADJ": 1}))
        assert stats.dominant_pos == "NOUN"

    def test_uses_priority_tie_breaker(self) -> None:
        # When counts are tied, priority order is VERB > NOUN > ADJ > ADV > PROPN
        stats = WordStats(pos_counts=Counter({"NOUN": 5, "VERB": 5}))
        assert stats.dominant_pos == "VERB"

        stats2 = WordStats(pos_counts=Counter({"ADJ": 3, "ADV": 3, "NOUN": 3}))
        assert stats2.dominant_pos == "NOUN"

        stats3 = WordStats(pos_counts=Counter({"ADJ": 2, "ADV": 2}))
        assert stats3.dominant_pos == "ADJ"

        stats4 = WordStats(pos_counts=Counter({"ADV": 1, "PROPN": 1}))
        assert stats4.dominant_pos == "ADV"

    def test_returns_none_when_empty(self) -> None:
        stats = WordStats()
        assert stats.dominant_pos is None


class TestRepresentativeText:
    def test_returns_most_common_surface_form(self) -> None:
        stats = WordStats(surface_counts=Counter({"run": 5, "ran": 3, "running": 1}))
        assert stats.representative_text == "run"

    def test_uses_length_tie_breaker_for_equal_counts(self) -> None:
        stats = WordStats(surface_counts=Counter({"go": 5, "went": 5}))
        # "go" is shorter, so it wins the tie-breaker
        assert stats.representative_text == "go"

        stats2 = WordStats(surface_counts=Counter({"abc": 2, "ab": 2, "abcd": 2}))
        assert stats2.representative_text == "ab"

    def test_returns_none_when_empty(self) -> None:
        stats = WordStats()
        assert stats.representative_text is None


class TestPosCategory:
    @pytest.mark.parametrize(
        ("pos", "category"),
        [
            ("NOUN", "noun"),
            ("VERB", "verb"),
            ("ADJ", "adjective"),
            ("ADV", "adverb"),
            ("PROPN", "noun"),
        ],
    )
    def test_maps_known_pos(self, pos: str, category: str) -> None:
        stats = WordStats(pos_counts=Counter({pos: 1}))
        assert stats.pos_category == category

    def test_returns_unknown_for_empty(self) -> None:
        stats = WordStats()
        assert stats.pos_category == "unknown"

    def test_returns_unknown_for_unmapped_pos(self) -> None:
        stats = WordStats(pos_counts=Counter({"INTJ": 1}))
        assert stats.pos_category == "unknown"
