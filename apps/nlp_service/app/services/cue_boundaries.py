"""A spaCy component that makes every subtitle cue start a new sentence.

A scene is one document holding several cues joined by newlines, so the tagger
can use the surrounding conversation. Left alone, the parser would happily run a
sentence across cue boundaries — unpunctuated dialogue merges into long blocks —
and `doc.sents` is where example sentences come from. This component pins the
boundaries to the cues, so an example sentence is always one line of dialogue.

Registered under `cue_boundaries` and inserted before the parser, which respects
sentence starts that are already set.
"""

from __future__ import annotations

from spacy.language import Language  # type: ignore[import-untyped]
from spacy.tokens import Doc  # type: ignore[import-untyped]

CUE_BOUNDARIES = "cue_boundaries"


@Language.component(CUE_BOUNDARIES)
def cue_boundaries(doc: Doc) -> Doc:
    """Mark the first token after every newline as the start of a sentence."""

    for token in doc[1:]:
        previous = doc[token.i - 1]
        if previous.is_space and "\n" in previous.text:
            token.is_sent_start = True
    return doc
