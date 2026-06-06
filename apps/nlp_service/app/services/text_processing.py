"""Subtitle text preprocessing — parsing, cleaning, deduplication, sentence
joining, and grouping lines into scenes.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass
from datetime import timedelta

import srt  # type: ignore[import-untyped]

from app.core.exceptions import SRTParsingError

type Scene = list[str]

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

# A pause this long means the next line starts a new sentence.
_MAX_JOIN_GAP = timedelta(seconds=2)

# A pause this long means the next line belongs to a different conversation.
_MAX_SCENE_GAP = timedelta(seconds=5)

# Safety cap so uninterrupted dialogue cannot grow one huge document. This is a
# memory guard, not a linguistic rule.
_MAX_SCENE_CHARACTERS = 1000


@dataclass(frozen=True)
class Cue:
    """One subtitle line with the timings it was displayed at."""

    text: str
    start: timedelta
    end: timedelta


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


def parse_srt_content(srt_text: str, *, dedup_lines: bool = True) -> list[Scene]:
    """Parse raw SRT markup into scenes of cleaned, sentence-joined lines.

    Raises `SRTParsingError` if the SRT content is malformed.
    """

    cues = _clean_cues(srt_text)
    cues = _join_broken_sentences(cues)
    if dedup_lines:
        cues = _deduplicate_cues(cues)
    return _group_into_scenes(cues)


def _clean_cues(srt_text: str) -> list[Cue]:
    """Parse the SRT and keep only cues with usable text."""

    try:
        subs = list(srt.parse(srt_text))
    except Exception as exc:
        raise SRTParsingError(
            "Failed to parse SRT content.",
            detail=str(exc),
        ) from exc

    cues: list[Cue] = []
    for sub in subs:
        text = clean_subtitle_text(sub.content.replace("\n", " ").strip())
        if text and not is_subtitle_metadata_line(text):
            cues.append(Cue(text=text, start=sub.start, end=sub.end))
    return cues


def _join_broken_sentences(cues: list[Cue]) -> list[Cue]:
    """Join cues that a subtitle file split mid-sentence.

    A cue is joined to the next one when it does not already end in `.!?` and
    the pause between them is shorter than `_MAX_JOIN_GAP`.
    """

    joined: list[Cue] = []
    for cue in cues:
        previous = joined[-1] if joined else None
        if previous and _continues(previous, cue):
            joined[-1] = Cue(
                text=f"{previous.text} {cue.text}",
                start=previous.start,
                end=cue.end,
            )
        else:
            joined.append(cue)
    return joined


def _continues(previous: Cue, cue: Cue) -> bool:
    """True when `cue` finishes the sentence `previous` started."""

    if _SENTENCE_END_RE.search(previous.text):
        return False
    return cue.start - previous.end <= _MAX_JOIN_GAP


# ---------------------------------------------------------------------------
# Scenes
# ---------------------------------------------------------------------------


def _group_into_scenes(cues: list[Cue]) -> list[Scene]:
    """Group cues from the same stretch of dialogue into one scene.

    Lines in a scene are analyzed together, so the tagger sees the surrounding
    conversation. A long pause starts a new scene, which keeps unrelated parts
    of the film from influencing each other.
    """

    scenes: list[Scene] = []
    for index, cue in enumerate(cues):
        previous = cues[index - 1] if index else None
        if previous and _same_scene(previous, cue, scenes[-1]):
            scenes[-1].append(cue.text)
        else:
            scenes.append([cue.text])
    return scenes


def _same_scene(previous: Cue, cue: Cue, scene: Scene) -> bool:
    """True when `cue` continues the conversation `scene` is holding."""

    if cue.start - previous.end > _MAX_SCENE_GAP:
        return False
    return sum(len(line) for line in scene) + len(cue.text) <= _MAX_SCENE_CHARACTERS


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------


def _line_key(text: str) -> str:
    """Case- and punctuation-insensitive identity of a line."""

    key = re.sub(r"[^\w\s]", "", text.casefold())
    return re.sub(r"\s+", " ", key).strip()


def _deduplicate_cues(cues: list[Cue]) -> list[Cue]:
    """Drop repeated cues, keeping the first occurrence."""

    seen: set[str] = set()
    result: list[Cue] = []
    for cue in cues:
        key = _line_key(cue.text)
        if key not in seen:
            seen.add(key)
            result.append(cue)
    return result
