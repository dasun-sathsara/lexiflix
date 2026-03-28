"""CEFR level resolution helpers.

Wraps the ``cefrpy`` library with caching and multi-strategy fallback logic
extracted from the original analyzer script.
"""

from __future__ import annotations

from cefrpy import CEFRAnalyzer  # type: ignore[import-untyped]
from spacy.tokens import Token  # type: ignore[import-untyped]

# ---------------------------------------------------------------------------
# Mapping tables
# ---------------------------------------------------------------------------

LABEL_TO_NUM: dict[str, int] = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
NUM_TO_LABEL: dict[int, str] = {v: k for k, v in LABEL_TO_NUM.items()}


# ---------------------------------------------------------------------------
# POS helpers
# ---------------------------------------------------------------------------


def coarse_to_base_ptb(pos: str) -> str | None:
    """Map spaCy coarse POS to the base Penn Treebank tag expected by cefrpy."""
    mapping: dict[str, str] = {
        "NOUN": "NN",
        "VERB": "VB",
        "ADJ": "JJ",
        "ADV": "RB",
        "PROPN": "NN",  # treat proper nouns as common nouns for CEFR
    }
    return mapping.get(pos)


def fine_to_base_ptb(tag: str) -> str | None:
    """Convert a fine-grained PTB tag to its base category."""
    tag = tag.upper()
    if not tag:
        return None
    first = tag[0]
    if first == "N":
        return "NN"
    if first == "V":
        return "VB"
    if first == "J":
        return "JJ"
    if first == "R":
        return "RB"
    return None


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------


def normalize_cefr_value(val: object) -> tuple[int | None, str | None]:
    """Accept various cefrpy return types and normalize to ``(num, label)``."""
    if val is None:
        return None, None

    # IntEnum-style
    try:
        num = int(val)  # type: ignore[arg-type]
        label = NUM_TO_LABEL.get(num)
        if label:
            return num, label
    except (TypeError, ValueError):
        pass

    # .value attribute (some enum wrappers)
    try:
        num_attr = getattr(val, "value", None)
        if isinstance(num_attr, int) and num_attr in NUM_TO_LABEL:
            return num_attr, NUM_TO_LABEL[num_attr]
    except Exception:
        pass

    # String label
    s = str(val).upper().strip()
    if s in LABEL_TO_NUM:
        return LABEL_TO_NUM[s], s

    # Numeric string / float
    try:
        f = float(s)
        num = int(round(f))
        if num in NUM_TO_LABEL:
            return num, NUM_TO_LABEL[num]
    except (TypeError, ValueError):
        pass

    return None, None


# ---------------------------------------------------------------------------
# CEFRLookup — cached, multi-strategy CEFR resolution
# ---------------------------------------------------------------------------


class CEFRLookup:
    """Cached CEFR level resolver wrapping ``cefrpy.CEFRAnalyzer``."""

    def __init__(self, analyzer: CEFRAnalyzer | None = None) -> None:
        self.analyzer = analyzer or CEFRAnalyzer()
        self._cache_pos: dict[tuple[str, str], tuple[int, str]] = {}
        self._cache_avg: dict[str, tuple[int, str]] = {}

    def get_pos_level(self, word: str, pos_ptb: str) -> tuple[int | None, str | None]:
        key = (word, pos_ptb)
        if key in self._cache_pos:
            n, s = self._cache_pos[key]
            return n, s
        try:
            val = self.analyzer.get_word_pos_level_CEFR(word, pos_ptb)
        except Exception:
            val = None
        num, label = normalize_cefr_value(val)
        if num is not None and label is not None:
            self._cache_pos[key] = (num, label)
        return num, label

    def get_average_level(self, word: str) -> tuple[int | None, str | None]:
        if word in self._cache_avg:
            n, s = self._cache_avg[word]
            return n, s
        try:
            val = self.analyzer.get_average_word_level_CEFR(word)
        except Exception:
            val = None
        num, label = normalize_cefr_value(val)
        if num is not None and label is not None:
            self._cache_avg[word] = (num, label)
        return num, label

    def get_plain_level(self, word: str) -> tuple[int | None, str | None]:
        try:
            fn = getattr(self.analyzer, "get_word_level_CEFR", None)
            if callable(fn):
                val = fn(word)
                num, label = normalize_cefr_value(val)
                if num is not None and label is not None:
                    return num, label
        except Exception:
            pass
        return None, None

    def best_level_for_token(
        self, token: Token, lemma: str
    ) -> tuple[int | None, str | None]:
        """Multi-strategy CEFR resolution for a single token.

        Tries POS-specific lookup, verb-lemma fallback for participial
        adjectives, average level, plain level, and surface-form fallbacks.
        """
        from lemminflect import getLemma  # type: ignore[import-untyped]

        pos_candidates: list[str] = []
        base_coarse = coarse_to_base_ptb(token.pos_)
        if base_coarse:
            pos_candidates.append(base_coarse)
        base_fine = fine_to_base_ptb(token.tag_)
        if base_fine and base_fine not in pos_candidates:
            pos_candidates.append(base_fine)

        # Participial adjective → try verb lemma
        verb_lemma: str | None = None
        if _should_try_verb_lemma_for_adj(token):
            vl = getLemma(token.text, upos="VERB")
            if vl:
                verb_lemma = vl[0].lower().strip()

        tried: set[tuple[str, str]] = set()

        for p in pos_candidates:
            num, label = self.get_pos_level(lemma, p)
            if num is not None:
                return num, label
            tried.add((lemma, p))

        if verb_lemma:
            num, label = self.get_pos_level(verb_lemma, "VB")
            if num is not None:
                return num, label

        num, label = self.get_average_level(lemma)
        if num is not None:
            return num, label

        num, label = self.get_plain_level(lemma)
        if num is not None:
            return num, label

        # Surface form fallbacks
        surface = token.text.lower()
        for p in pos_candidates:
            if (surface, p) not in tried:
                num, label = self.get_pos_level(surface, p)
                if num is not None:
                    return num, label

        num, label = self.get_average_level(surface)
        if num is not None:
            return num, label

        return None, None


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _should_try_verb_lemma_for_adj(token: Token) -> bool:
    """Heuristic: adjectival participles often end in -ed or -ing."""
    if token.pos_ != "ADJ":
        return False
    txt = token.text.lower()
    return txt.endswith("ed") or txt.endswith("ing")
