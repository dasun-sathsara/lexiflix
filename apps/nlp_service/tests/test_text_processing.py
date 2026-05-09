"""Tests for subtitle text processing utilities."""

from __future__ import annotations

from datetime import timedelta

import pytest

from app.services.text_processing import (
    _deduplicate_lines,
    _join_broken_sentences,
    chunk_lines,
    clean_subtitle_text,
    is_subtitle_metadata_line,
    split_plain_text,
)


class TestCleanSubtitleText:
    def test_removes_html_tags(self) -> None:
        assert clean_subtitle_text("<i>Hello</i>") == "Hello"
        assert clean_subtitle_text("<b>Bold</b> text") == "Bold text"

    def test_removes_bracketed_cues(self) -> None:
        assert clean_subtitle_text("[music playing]") == ""
        assert clean_subtitle_text("Hello [inaudible] world") == "Hello world"

    def test_removes_speaker_labels(self) -> None:
        assert clean_subtitle_text("JOHN: Hello there") == "Hello there"
        assert clean_subtitle_text("MARY-JANE: Hi!") == "Hi!"

    def test_collapses_whitespace(self) -> None:
        assert clean_subtitle_text("Hello   world") == "Hello world"
        assert clean_subtitle_text("Line1\nLine2") == "Line1 Line2"

    def test_unescapes_html_entities(self) -> None:
        assert clean_subtitle_text("AT&amp;T") == "AT&T"
        assert clean_subtitle_text("&quot;Hello&quot;") == '"Hello"'


class TestIsSubtitleMetadataLine:
    def test_empty_string_is_metadata(self) -> None:
        assert is_subtitle_metadata_line("") is True

    def test_whitespace_only_is_metadata(self) -> None:
        assert is_subtitle_metadata_line("   ") is True

    def test_real_subtitle_text_is_not_metadata(self) -> None:
        assert is_subtitle_metadata_line("Hello world") is False
        assert is_subtitle_metadata_line("Where are you going?") is False

    def test_caption_prefix_is_metadata(self) -> None:
        assert is_subtitle_metadata_line("Captions by ABC") is True
        assert is_subtitle_metadata_line("Subtitle by John") is True

    def test_opensubtitles_snippet_is_metadata(self) -> None:
        assert is_subtitle_metadata_line("Downloaded from opensubtitles.org") is True
        assert is_subtitle_metadata_line("www.opensubtitles.com") is True


class TestDeduplicateLines:
    def test_preserves_order(self) -> None:
        lines = ["First", "Second", "Third"]
        assert _deduplicate_lines(lines) == lines

    def test_case_insensitive_dedup(self) -> None:
        lines = ["Hello", "hello", "HELLO"]
        assert _deduplicate_lines(lines) == ["Hello"]

    def test_punctuation_insensitive_dedup(self) -> None:
        lines = ["Hello!", "Hello", "Hi."]
        assert _deduplicate_lines(lines) == ["Hello!", "Hi."]

    def test_keeps_unique_lines(self) -> None:
        lines = ["Alpha", "Beta", "Alpha", "Gamma", "beta"]
        assert _deduplicate_lines(lines) == ["Alpha", "Beta", "Gamma"]

    def test_whitespace_normalization_for_dedup(self) -> None:
        lines = ["A  b", "a b", "A b"]
        assert _deduplicate_lines(lines) == ["A  b"]


class TestJoinBrokenSentences:
    def _make_items(self, texts: list[str], gaps: list[float] | None = None) -> list[tuple[str, timedelta, timedelta]]:
        """Helper to build subtitle item tuples."""
        items: list[tuple[str, timedelta, timedelta]] = []
        start = timedelta(seconds=0)
        gaps = gaps or [1.0] * (len(texts) - 1)
        for i, text in enumerate(texts):
            end = start + timedelta(seconds=2)
            items.append((text, start, end))
            if i < len(gaps):
                start = end + timedelta(seconds=gaps[i])
        return items

    def test_joins_mid_sentence_breaks_within_2s_gap(self) -> None:
        items = self._make_items(["Hello there", "my friend"], gaps=[1.0])
        result = _join_broken_sentences(items)
        assert result == ["Hello there my friend"]

    def test_does_not_join_when_gap_exceeds_2s(self) -> None:
        items = self._make_items(["Hello there", "my friend"], gaps=[3.0])
        result = _join_broken_sentences(items)
        assert result == ["Hello there", "my friend"]

    def test_does_not_join_when_line_ends_with_punctuation(self) -> None:
        items = self._make_items(["Hello there.", "My friend"], gaps=[1.0])
        result = _join_broken_sentences(items)
        assert result == ["Hello there.", "My friend"]

    def test_joins_multiple_fragments(self) -> None:
        items = self._make_items(["One", "two", "three."], gaps=[0.5, 0.5])
        result = _join_broken_sentences(items)
        assert result == ["One two three."]

    def test_empty_list_returns_empty(self) -> None:
        assert _join_broken_sentences([]) == []


class TestCleanSubtitleTextEdgeCases:
    """Additional edge-case tests for subtitle cleaning."""

    def test_removes_curly_braces(self) -> None:
        assert clean_subtitle_text("{music}") == ""
        assert clean_subtitle_text("Hello {whispers} world") == "Hello world"

    def test_removes_parentheses(self) -> None:
        assert clean_subtitle_text("(gasps)") == ""
        assert clean_subtitle_text("Hello (softly) world") == "Hello world"

    def test_empty_string(self) -> None:
        assert clean_subtitle_text("") == ""

    def test_only_whitespace(self) -> None:
        assert clean_subtitle_text("   \n\t  ") == ""

    def test_multiple_overlapping_formatting(self) -> None:
        assert clean_subtitle_text("<i>[music]</i>") == ""
        # HTML tag removal and speaker label removal are separate passes;
        # speaker labels wrapped in tags are not stripped (expected limitation)
        assert clean_subtitle_text("JOHN: <i>Hello</i>") == "Hello"

    def test_preserves_unicode(self) -> None:
        assert clean_subtitle_text("café résumé naïve") == "café résumé naïve"
        assert clean_subtitle_text("日本語の字幕") == "日本語の字幕"

    def test_other_html_entities(self) -> None:
        assert clean_subtitle_text("5 &lt; 10") == "5 < 10"
        assert clean_subtitle_text("It&apos;s fine") == "It's fine"

    def test_speaker_label_with_numbers(self) -> None:
        assert clean_subtitle_text("AGENT 007: Hello") == "Hello"

    def test_long_speaker_name(self) -> None:
        assert clean_subtitle_text("SUPERMAN-CLARK KENT: Hello") == "Hello"


class TestChunkLines:
    """Tests for chunking lines into character-limited groups."""

    def test_yields_single_chunk_when_under_limit(self) -> None:
        lines = ["Hello", "world"]
        result = list(chunk_lines(lines, max_chars=100))
        assert result == ["Hello\nworld"]

    def test_splits_into_multiple_chunks(self) -> None:
        lines = ["Hello", "world", "foo", "bar"]
        result = list(chunk_lines(lines, max_chars=8))
        # "Hello" (5) + "world" (5) = 10 > 8, so first chunk is just "Hello"
        assert result[0] == "Hello"
        # "world" (5) + "foo" (3) = 8, not > 8, so chunk is "world\nfoo"
        assert result[1] == "world\nfoo"
        # "bar" left alone
        assert result[2] == "bar"

    def test_empty_list(self) -> None:
        assert list(chunk_lines([], max_chars=100)) == []

    def test_exact_boundary(self) -> None:
        lines = ["abcd", "efgh"]
        # "abcd" (4) + "efgh" (4) = 8, not > 8
        result = list(chunk_lines(lines, max_chars=8))
        assert result == ["abcd\nefgh"]


class TestSplitPlainText:
    """Tests for splitting and cleaning plain text."""

    def test_splits_and_cleans_lines(self) -> None:
        text = "Hello world\nJOHN: Hi there\n[music playing]"
        result = split_plain_text(text, dedup_lines=False)
        assert result == ["Hello world", "Hi there"]

    def test_deduplicates_by_default(self) -> None:
        text = "Hello\nhello\nHELLO\nWorld"
        result = split_plain_text(text)
        assert result == ["Hello", "World"]

    def test_skips_metadata_lines(self) -> None:
        text = "Hello\nSubtitle by John\nWorld"
        result = split_plain_text(text, dedup_lines=False)
        assert result == ["Hello", "World"]

    def test_empty_text(self) -> None:
        assert split_plain_text("") == []

    def test_no_dedup_option(self) -> None:
        text = "Hello\nhello"
        result = split_plain_text(text, dedup_lines=False)
        assert result == ["Hello", "hello"]
