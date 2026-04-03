"""Subtitle text preprocessing — parsing, cleaning, and deduplication.

Extracted from the original analyzer script. Each function is a small,
testable unit with no side-effects beyond its return value.
"""

from __future__ import annotations

import html
import re

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
    """Parse raw SRT markup into a list of cleaned subtitle lines.

    Raises ``SRTParsingError`` if the SRT content is malformed.
    """
    try:
        subs = list(srt.parse(srt_text))
    except Exception as exc:
        raise SRTParsingError(
            "Failed to parse SRT content.",
            detail=str(exc),
        ) from exc

    cleaned: list[str] = []
    for sub in subs:
        line = sub.content.replace("\n", " ").strip()
        line = clean_subtitle_text(line)
        if line and not is_subtitle_metadata_line(line):
            cleaned.append(line)

    if not dedup_lines:
        return cleaned

    return _deduplicate_lines(cleaned)


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
