"""Subtitle text preprocessing — parsing, cleaning, deduplication, sentence
joining, and chunking.

Extracted from the original analyzer script. Each function is a small,
testable unit with no side-effects beyond its return value.
"""

from __future__ import annotations

import html
import re
from collections.abc import Iterator
from datetime import timedelta

import srt  # type: ignore[import-untyped]

from app.core.exceptions import SRTParsingError

_METADATA_PREFIXES = (
    "caption by",
    "captions by",
    "downloaded from",
    "encoded by",
    "resync by",
    "resynced by",
    "rip by",
    "subscene",
    "subtitle by",
    "subtitles by",
    "synced by",
    "thanks to ",
    "translated by",
    "www.",
)

_METADATA_SNIPPETS = (
    "opensubtitles",
    "subscene",
    "tvsubtitles",
    "yify",
    "yts",
    "http://",
    "https://",
)

_SENTENCE_END_RE = re.compile(r'[.!?]"?' + "$")
_MAX_JOIN_GAP = timedelta(seconds=2)

# ---------------------------------------------------------------------------
# Cleaning
# ---------------------------------------------------------------------------


def clean_subtitle_text(text: str) -> str:
    """Remove HTML tags, bracketed cues, speaker labels, and collapse whitespace."""
    text = html.unescape(text)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\[[^\]]*\]", " ", text)
    text = re.sub(r"\([^\)]*\)", " ", text)
    text = re.sub(r"\{[^\}]*\}", " ", text)
    # Speaker labels like "JOHN: ..."
    text = re.sub(r"^[A-Z][A-Z0-9\s\-]{1,20}:\s*", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def is_subtitle_metadata_line(text: str) -> bool:
    """Detect credits and release metadata that should not reach the pipeline."""
    normalized = text.casefold().strip()
    if not normalized:
        return True

    if any(normalized.startswith(prefix) for prefix in _METADATA_PREFIXES):
        return True

    if any(snippet in normalized for snippet in _METADATA_SNIPPETS):
        return True

    return False


# ---------------------------------------------------------------------------
# SRT parsing
# ---------------------------------------------------------------------------


def parse_srt_content(srt_text: str, *, dedup_lines: bool = True) -> list[str]:
    """Parse raw SRT markup into a list of cleaned, sentence-joined subtitle lines.

    Raises ``SRTParsingError`` if the SRT content is malformed.
    """
    try:
        subs = list(srt.parse(srt_text))
    except Exception as exc:
        raise SRTParsingError(
            "Failed to parse SRT content.",
            detail=str(exc),
        ) from exc

    items: list[tuple[str, timedelta, timedelta]] = []
    for sub in subs:
        line = sub.content.replace("\n", " ").strip()
        line = clean_subtitle_text(line)
        if line and not is_subtitle_metadata_line(line):
            items.append((line, sub.start, sub.end))

    lines = _join_broken_sentences(items)

    if not dedup_lines:
        return lines

    return _deduplicate_lines(lines)


def _join_broken_sentences(
    items: list[tuple[str, timedelta, timedelta]],
) -> list[str]:
    """Join subtitle fragments that were split mid-sentence.

    Uses timing gaps and sentence-ending punctuation heuristics:
    - Lines that don't end with ``.!?`` are candidates for joining.
    - A gap larger than ``_MAX_JOIN_GAP`` between two subtitles is treated
      as a true sentence boundary.
    """
    if not items:
        return []
    result: list[str] = []
    i = 0
    while i < len(items):
        line, _, end = items[i]
        while i + 1 < len(items):
            next_line, next_start, _ = items[i + 1]
            gap = next_start - end
            if gap > _MAX_JOIN_GAP:
                break
            if _SENTENCE_END_RE.search(line):
                break
            line = line + " " + next_line
            end = items[i + 1][2]
            i += 1
        result.append(line)
        i += 1
    return result


def chunk_lines(lines: list[str], max_chars: int = 1500) -> Iterator[str]:
    """Group short lines into larger chunks for efficient transformer processing.

    Each chunk is a single string with lines separated by newlines so that
    spaCy can still segment them into individual sentences via ``doc.sents``.
    """
    chunk: list[str] = []
    size = 0
    for ln in lines:
        if size + len(ln) > max_chars and chunk:
            yield "\n".join(chunk)
            chunk = []
            size = 0
        chunk.append(ln)
        size += len(ln)
    if chunk:
        yield "\n".join(chunk)


def split_plain_text(text: str, *, dedup_lines: bool = True) -> list[str]:
    """Split pre-extracted plain text into lines and optionally deduplicate."""
    lines = [
        line
        for ln in text.splitlines()
        if (line := clean_subtitle_text(ln)) and not is_subtitle_metadata_line(line)
    ]
    if not dedup_lines:
        return lines
    return _deduplicate_lines(lines)


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------


def _deduplicate_lines(lines: list[str]) -> list[str]:
    """Case-insensitive, punctuation-insensitive dedup preserving order."""
    seen: set[str] = set()
    result: list[str] = []
    for line in lines:
        key = re.sub(r"[^\w\s]", "", line.casefold())
        key = re.sub(r"\s+", " ", key).strip()
        if key not in seen:
            seen.add(key)
            result.append(line)
    return result
