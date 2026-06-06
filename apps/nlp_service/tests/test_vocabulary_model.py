"""Tests for WordStats domain model."""

from __future__ import annotations

from collections import Counter

import pytest

from app.models.vocabulary import CefrRating, WordStats


class TestAddContext:
    def test_keeps_highest_scoring_sentences_first(self) -> None:
        stats = WordStats(pos="NOUN")
        stats.add_context("Low score sentence.", score=1)
        stats.add_context("High score sentence.", score=5)

        assert stats.context_texts == ["High score sentence.", "Low score sentence."]

    def test_keeps_at_most_three(self) -> None:
        stats = WordStats(pos="NOUN")
        for index, score in enumerate([1, 2, 3, 4]):
            stats.add_context(f"Sentence number {index}.", score=score)

        assert stats.context_texts == [
            "Sentence number 3.",
            "Sentence number 2.",
            "Sentence number 1.",
        ]

    def test_ignores_near_duplicates(self) -> None:
        stats = WordStats(pos="NOUN")
        stats.add_context("Hello there!", score=3)
        stats.add_context("hello there", score=9)

        assert stats.context_texts == ["Hello there!"]


class TestRepresentativeText:
    def test_returns_most_common_surface_form(self) -> None:
        stats = WordStats(pos="VERB", surface_counts=Counter({"run": 5, "ran": 3}))
        assert stats.representative_text == "run"

    def test_uses_length_tie_breaker_for_equal_counts(self) -> None:
        stats = WordStats(pos="VERB", surface_counts=Counter({"go": 5, "went": 5}))
        assert stats.representative_text == "go"

    def test_returns_none_when_empty(self) -> None:
        assert WordStats(pos="VERB").representative_text is None


class TestPosCategory:
    @pytest.mark.parametrize(
        ("pos", "category"),
        [
            ("NOUN", "noun"),
            ("VERB", "verb"),
            ("ADJ", "adjective"),
            ("ADV", "adverb"),
            ("INTJ", "unknown"),
        ],
    )
    def test_maps_pos_to_category(self, pos: str, category: str) -> None:
        assert WordStats(pos=pos).pos_category == category


class TestCefrLabel:
    def test_exposes_label_when_rated(self) -> None:
        stats = WordStats(pos="NOUN", cefr=CefrRating(numeric=3, label="B1"))
        assert stats.cefr_label == "B1"

    def test_is_none_when_unrated(self) -> None:
        assert WordStats(pos="NOUN").cefr_label is None
