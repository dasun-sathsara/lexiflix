"""Tests for subtitle text processing utilities."""

from __future__ import annotations

from datetime import timedelta

from app.services.text_processing import (
    Cue,
    _deduplicate_cues,
    _group_into_scenes,
    _join_broken_sentences,
    clean_subtitle_text,
    is_subtitle_metadata_line,
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


class TestDeduplicateCues:
    def test_preserves_order(self) -> None:
        cues = make_cues(["First", "Second", "Third"])
        assert [c.text for c in _deduplicate_cues(cues)] == ["First", "Second", "Third"]

    def test_case_insensitive_dedup(self) -> None:
        cues = make_cues(["Hello", "hello", "HELLO"])
        assert [c.text for c in _deduplicate_cues(cues)] == ["Hello"]

    def test_punctuation_insensitive_dedup(self) -> None:
        cues = make_cues(["Hello!", "Hello", "Hi."])
        assert [c.text for c in _deduplicate_cues(cues)] == ["Hello!", "Hi."]

    def test_whitespace_normalization_for_dedup(self) -> None:
        cues = make_cues(["A  b", "a b", "A b"])
        assert [c.text for c in _deduplicate_cues(cues)] == ["A  b"]


def make_cues(texts: list[str], gaps: list[float] | None = None) -> list[Cue]:
    """Build cues two seconds long each, separated by `gaps` seconds."""

    cues: list[Cue] = []
    start = timedelta(seconds=0)
    gaps = gaps or [1.0] * (len(texts) - 1)
    for index, text in enumerate(texts):
        end = start + timedelta(seconds=2)
        cues.append(Cue(text=text, start=start, end=end))
        if index < len(gaps):
            start = end + timedelta(seconds=gaps[index])
    return cues


class TestJoinBrokenSentences:
    def test_joins_mid_sentence_breaks_within_2s_gap(self) -> None:
        result = _join_broken_sentences(
            make_cues(["Hello there", "my friend"], gaps=[1.0])
        )
        assert [cue.text for cue in result] == ["Hello there my friend"]

    def test_does_not_join_when_gap_exceeds_2s(self) -> None:
        result = _join_broken_sentences(
            make_cues(["Hello there", "my friend"], gaps=[3.0])
        )
        assert [cue.text for cue in result] == ["Hello there", "my friend"]

    def test_does_not_join_when_line_ends_with_punctuation(self) -> None:
        result = _join_broken_sentences(
            make_cues(["Hello there.", "My friend"], gaps=[1.0])
        )
        assert [cue.text for cue in result] == ["Hello there.", "My friend"]

    def test_joins_multiple_fragments(self) -> None:
        result = _join_broken_sentences(
            make_cues(["One", "two", "three."], gaps=[0.5, 0.5])
        )
        assert [cue.text for cue in result] == ["One two three."]

    def test_keeps_timings_of_the_merged_span(self) -> None:
        result = _join_broken_sentences(make_cues(["One", "two."], gaps=[0.5]))
        assert result[0].start == timedelta(seconds=0)
        assert result[0].end == timedelta(seconds=4.5)

    def test_empty_list_returns_empty(self) -> None:
        assert _join_broken_sentences([]) == []


class TestGroupIntoScenes:
    def test_groups_cues_close_together(self) -> None:
        cues = make_cues(["Hello there.", "Hi back."], gaps=[1.0])
        assert _group_into_scenes(cues) == [["Hello there.", "Hi back."]]

    def test_splits_on_a_long_pause(self) -> None:
        cues = make_cues(["Hello there.", "Hi back."], gaps=[9.0])
        assert _group_into_scenes(cues) == [["Hello there."], ["Hi back."]]

    def test_caps_scene_size(self) -> None:
        cues = make_cues(["x" * 600, "y" * 600], gaps=[1.0])
        assert _group_into_scenes(cues) == [["x" * 600], ["y" * 600]]

    def test_empty_list_returns_empty(self) -> None:
        assert _group_into_scenes([]) == []


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
