"""CEFR level resolution helpers.

Calibrates ``cefrpy`` outputs against the bundled EFLLex lexicon and emits
conservative advanced-level labels for aggregated vocabulary candidates.
"""

from __future__ import annotations

import csv
import logging
from dataclasses import dataclass
from importlib.resources import files
from io import StringIO

from cefrpy import CEFRAnalyzer  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)

LABEL_TO_NUM: dict[str, int] = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
NUM_TO_LABEL: dict[int, str] = {v: k for k, v in LABEL_TO_NUM.items()}

_EFLLEX_LEVEL_COLUMNS: tuple[tuple[int, str, str], ...] = (
    (1, "level_freq@a1", "nb_doc@a1"),
    (2, "level_freq@a2", "nb_doc@a2"),
    (3, "level_freq@b1", "nb_doc@b1"),
    (4, "level_freq@b2", "nb_doc@b2"),
    (5, "level_freq@c1", "nb_doc@c1"),
)


def coarse_to_base_ptb(pos: str | None) -> str | None:
    """Map spaCy coarse POS to the base Penn Treebank tag used by EFLLex/cefrpy."""
    mapping: dict[str, str] = {
        "NOUN": "NN",
        "VERB": "VB",
        "ADJ": "JJ",
        "ADV": "RB",
        "PROPN": "NN",
    }
    return mapping.get((pos or "").upper())


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


def normalize_cefr_value(val: object) -> tuple[int | None, str | None]:
    """Accept various cefrpy return types and normalize to ``(num, label)``."""
    if val is None:
        return None, None

    try:
        if isinstance(val, int | float | str):
            num = int(val)
            label = NUM_TO_LABEL.get(num)
            if label:
                return num, label
    except (TypeError, ValueError):
        pass

    try:
        num_attr = getattr(val, "value", None)
        if isinstance(num_attr, int) and num_attr in NUM_TO_LABEL:
            return num_attr, NUM_TO_LABEL[num_attr]
    except Exception:
        pass

    s = str(val).upper().strip()
    if s in LABEL_TO_NUM:
        return LABEL_TO_NUM[s], s

    try:
        f = float(s)
        num = int(round(f))
        if num in NUM_TO_LABEL:
            return num, NUM_TO_LABEL[num]
    except (TypeError, ValueError):
        pass

    return None, None


@dataclass(frozen=True)
class EFLLexAggregate:
    """Aggregated EFLLex support for a lemma, optionally POS-specific."""

    freq_by_level: tuple[float, float, float, float, float]
    docs_by_level: tuple[float, float, float, float, float]

    @property
    def total_freq(self) -> float:
        return sum(self.freq_by_level)

    @property
    def total_docs(self) -> float:
        return sum(self.docs_by_level)


@dataclass(frozen=True)
class EFLLexSignal:
    """A calibrated signal derived from EFLLex statistics."""

    level_num: int
    level_label: str
    confidence: float
    note: str
    used_pos_fallback: bool = False


@dataclass(frozen=True)
class CalibratedCEFRResult:
    """Final CEFR result returned to the pipeline."""

    level_num: int | None
    level_label: str | None
    confidence: float
    note: str
    raw_num: int | None = None
    raw_label: str | None = None
    efllex_num: int | None = None
    efllex_label: str | None = None


class EFLLexLexicon:
    """Bundled EFLLex loader with POS-specific and lemma-only lookups."""

    def __init__(self) -> None:
        self._by_pos: dict[tuple[str, str], EFLLexAggregate] = {}
        self._by_lemma: dict[str, EFLLexAggregate] = {}
        self._load()

    def lookup(self, lemma: str, pos_ptb: str | None = None) -> EFLLexSignal | None:
        aggregate: EFLLexAggregate | None
        if pos_ptb:
            aggregate = self._by_pos.get((lemma, pos_ptb))
        else:
            aggregate = self._by_lemma.get(lemma)
        if aggregate is None:
            return None
        return self._signal_from_aggregate(aggregate)

    def _load(self) -> None:
        path = self._resolve_dataset_path()
        if path is None:
            logger.warning(
                "EFLLex dataset not found in app.data; falling back to cefrpy-only CEFR resolution."
            )
            self._by_pos = {}
            self._by_lemma = {}
            return
        buckets_by_pos: dict[tuple[str, str], list[float]] = {}
        buckets_by_lemma: dict[str, list[float]] = {}

        content = path.read_text(encoding="utf-8")
        reader = csv.DictReader(StringIO(content), delimiter="\t")
        for row in reader:
            lemma = (row.get("word") or "").casefold().strip()
            pos_ptb = fine_to_base_ptb(row.get("tag") or "")
            if not lemma or not lemma.isalpha() or pos_ptb is None:
                continue

            values = self._extract_values(row)
            pos_bucket = buckets_by_pos.setdefault((lemma, pos_ptb), [0.0] * 10)
            lemma_bucket = buckets_by_lemma.setdefault(lemma, [0.0] * 10)

            for index, value in enumerate(values):
                pos_bucket[index] += value
                lemma_bucket[index] += value

        self._by_pos = {
            key: self._aggregate_from_bucket(bucket)
            for key, bucket in buckets_by_pos.items()
        }
        self._by_lemma = {
            key: self._aggregate_from_bucket(bucket)
            for key, bucket in buckets_by_lemma.items()
        }

    @staticmethod
    def _resolve_dataset_path():
        package_dir = files("app.data")
        for candidate in ("EFLLex.tsv", "efl_lex.tsv"):
            path = package_dir.joinpath(candidate)
            if path.is_file():
                return path
        return None

    @staticmethod
    def _extract_values(row: dict[str, str]) -> list[float]:
        values: list[float] = []
        for _, freq_column, docs_column in _EFLLEX_LEVEL_COLUMNS:
            values.append(_safe_float(row.get(freq_column)))
        for _, freq_column, docs_column in _EFLLEX_LEVEL_COLUMNS:
            values.append(_safe_float(row.get(docs_column)))
        return values

    @staticmethod
    def _aggregate_from_bucket(bucket: list[float]) -> EFLLexAggregate:
        freq_by_level = (bucket[0], bucket[1], bucket[2], bucket[3], bucket[4])
        docs_by_level = (bucket[5], bucket[6], bucket[7], bucket[8], bucket[9])
        return EFLLexAggregate(
            freq_by_level=freq_by_level,
            docs_by_level=docs_by_level,
        )

    @staticmethod
    def _signal_from_aggregate(aggregate: EFLLexAggregate) -> EFLLexSignal | None:
        if aggregate.total_freq <= 0 and aggregate.total_docs <= 0:
            return None

        scores: list[float] = []
        total_freq = aggregate.total_freq
        total_docs = aggregate.total_docs

        for index in range(5):
            freq = aggregate.freq_by_level[index]
            docs = aggregate.docs_by_level[index]
            freq_share = freq / total_freq if total_freq else 0.0
            docs_share = docs / total_docs if total_docs else 0.0
            scores.append((freq_share * 0.72) + (docs_share * 0.28))

        chosen_index = max(range(5), key=lambda index: (scores[index], -index))
        note = "cefr:efllex"

        if chosen_index > 0:
            lower_index = chosen_index - 1
            if scores[chosen_index] - scores[lower_index] < 0.1:
                chosen_index = lower_index
                note = "cefr:efllex_ambiguous"

        c1_index = 4
        if chosen_index == c1_index and aggregate.docs_by_level[c1_index] < 2:
            chosen_index = 3
            note = "cefr:efllex_weak_c1_support"

        chosen_num = chosen_index + 1
        chosen_score = scores[chosen_index]
        neighbor_scores = []
        if chosen_index > 0:
            neighbor_scores.append(scores[chosen_index - 1])
        if chosen_index + 1 < len(scores):
            neighbor_scores.append(scores[chosen_index + 1])
        nearest_competitor = max(neighbor_scores, default=0.0)
        margin = max(0.0, chosen_score - nearest_competitor)

        doc_support = aggregate.docs_by_level[chosen_index]
        support_factor = min(1.0, (doc_support + aggregate.total_docs) / 18.0)
        confidence = (
            0.42 + (chosen_score * 0.28) + (margin * 0.18) + (support_factor * 0.12)
        )
        if note != "cefr:efllex":
            confidence -= 0.08

        return EFLLexSignal(
            level_num=chosen_num,
            level_label=NUM_TO_LABEL[chosen_num],
            confidence=round(max(0.05, min(0.98, confidence)), 3),
            note=note,
        )


class CEFRLookup:
    """Calibrated CEFR resolver using EFLLex first and ``cefrpy`` second."""

    def __init__(
        self,
        analyzer: CEFRAnalyzer | None = None,
        lexicon: EFLLexLexicon | None = None,
    ) -> None:
        self.analyzer = analyzer or CEFRAnalyzer()
        self.lexicon = lexicon or EFLLexLexicon()
        self._cache_pos: dict[tuple[str, str], tuple[int, str]] = {}
        self._cache_avg: dict[str, tuple[int, str]] = {}
        self._cache_candidate: dict[tuple[str, str], CalibratedCEFRResult] = {}
        self._cache_candidate_lemma: dict[str, CalibratedCEFRResult] = {}

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

    def resolve_candidate(self, lemma: str, pos: str | None) -> CalibratedCEFRResult:
        """Resolve a final CEFR label for an aggregated candidate."""
        lemma = lemma.casefold().strip()
        pos_ptb = coarse_to_base_ptb(pos)
        secondary_pos_ptb = "VB" if pos_ptb == "JJ" else None

        if pos_ptb:
            cache_key = (lemma, pos_ptb)
            if cache_key in self._cache_candidate:
                return self._cache_candidate[cache_key]

        if lemma in self._cache_candidate_lemma and pos_ptb is None:
            return self._cache_candidate_lemma[lemma]

        efllex_signal = self.lexicon.lookup(lemma, pos_ptb)
        if efllex_signal is None and secondary_pos_ptb is not None:
            verb_signal = self.lexicon.lookup(lemma, secondary_pos_ptb)
            if verb_signal is not None:
                efllex_signal = EFLLexSignal(
                    level_num=verb_signal.level_num,
                    level_label=verb_signal.level_label,
                    confidence=verb_signal.confidence,
                    note=f"{verb_signal.note}+verb",
                    used_pos_fallback=True,
                )
        efllex_used_lemma_fallback = False
        if efllex_signal is None:
            efllex_signal = self.lexicon.lookup(lemma)
            efllex_used_lemma_fallback = efllex_signal is not None

        raw_num, raw_label = self._resolve_raw_signal(
            lemma,
            pos_ptb,
            secondary_pos_ptb=secondary_pos_ptb,
        )
        result = self._combine_signals(
            raw_num=raw_num,
            raw_label=raw_label,
            efllex_signal=efllex_signal,
            efllex_used_lemma_fallback=efllex_used_lemma_fallback,
        )

        if pos_ptb:
            self._cache_candidate[(lemma, pos_ptb)] = result
        else:
            self._cache_candidate_lemma[lemma] = result

        return result

    def _resolve_raw_signal(
        self,
        lemma: str,
        pos_ptb: str | None,
        *,
        secondary_pos_ptb: str | None = None,
    ) -> tuple[int | None, str | None]:
        if pos_ptb:
            num, label = self.get_pos_level(lemma, pos_ptb)
            if num is not None:
                return num, label

        if secondary_pos_ptb:
            num, label = self.get_pos_level(lemma, secondary_pos_ptb)
            if num is not None:
                return num, label

        num, label = self.get_average_level(lemma)
        if num is not None:
            return num, label

        try:
            fn = getattr(self.analyzer, "get_word_level_CEFR", None)
            if callable(fn):
                val = fn(lemma)
                num, label = normalize_cefr_value(val)
                if num is not None:
                    return num, label
        except Exception:
            pass

        return None, None

    @staticmethod
    def _combine_signals(
        *,
        raw_num: int | None,
        raw_label: str | None,
        efllex_signal: EFLLexSignal | None,
        efllex_used_lemma_fallback: bool,
    ) -> CalibratedCEFRResult:
        if efllex_signal is not None:
            final_num, final_label, note = CEFRLookup._combine_with_efllex(
                raw_num=raw_num,
                raw_label=raw_label,
                efllex_signal=efllex_signal,
                efllex_used_lemma_fallback=efllex_used_lemma_fallback,
            )
            confidence = efllex_signal.confidence
            if raw_num is not None:
                confidence = min(0.98, confidence + 0.04)
            if raw_num is not None and raw_num != final_num:
                confidence = max(0.45, confidence - 0.05)

            return CalibratedCEFRResult(
                level_num=final_num,
                level_label=final_label,
                confidence=round(confidence, 3),
                note=note,
                raw_num=raw_num,
                raw_label=raw_label,
                efllex_num=efllex_signal.level_num,
                efllex_label=efllex_signal.level_label,
            )

        if raw_num is None or raw_label is None:
            return CalibratedCEFRResult(
                level_num=None,
                level_label=None,
                confidence=0.0,
                note="cefr:unresolved",
            )

        if raw_num == 6:
            return CalibratedCEFRResult(
                level_num=5,
                level_label="C1",
                confidence=0.46,
                note="cefr:downgraded_from_c2_to_c1_missing_efllex",
                raw_num=raw_num,
                raw_label=raw_label,
            )

        if raw_num == 5:
            return CalibratedCEFRResult(
                level_num=4,
                level_label="B2",
                confidence=0.44,
                note="cefr:downgraded_from_c1_to_b2_missing_efllex",
                raw_num=raw_num,
                raw_label=raw_label,
            )

        return CalibratedCEFRResult(
            level_num=raw_num,
            level_label=raw_label,
            confidence=0.52,
            note="cefr:cefrpy",
            raw_num=raw_num,
            raw_label=raw_label,
        )

    @staticmethod
    def _combine_with_efllex(
        *,
        raw_num: int | None,
        raw_label: str | None,
        efllex_signal: EFLLexSignal,
        efllex_used_lemma_fallback: bool,
    ) -> tuple[int, str, str]:
        efllex_num = efllex_signal.level_num
        note = efllex_signal.note
        if efllex_used_lemma_fallback:
            note = f"{note}+lemma"

        if raw_num is None or raw_label is None:
            return efllex_num, efllex_signal.level_label, note

        strong_direct_advanced_support = (
            not efllex_used_lemma_fallback
            and not efllex_signal.used_pos_fallback
            and efllex_signal.note == "cefr:efllex"
            and efllex_signal.confidence >= 0.9
        )

        final_num = efllex_num
        if raw_num <= 4 and efllex_num == 5:
            can_promote_to_c1 = raw_num >= 3 and strong_direct_advanced_support
            final_num = 5 if can_promote_to_c1 else raw_num
        elif raw_num <= 4 and efllex_num <= 4:
            final_num = min(raw_num, efllex_num)
        elif raw_num == 5 and efllex_num == 5:
            final_num = 5
        elif raw_num == 6 and efllex_num == 5:
            final_num = 6 if strong_direct_advanced_support else 5
        else:
            final_num = efllex_num

        final_label = NUM_TO_LABEL[final_num]

        if raw_num != final_num:
            if final_num == 5 and raw_num <= 4:
                return final_num, final_label, "cefr:promoted_to_c1_efllex"
            if raw_num == 6 and final_num == 5 and efllex_num == 5:
                return final_num, final_label, "cefr:downgraded_from_c2_to_c1_efllex"
            if raw_num == 5 and final_num == 4 and efllex_num <= 4:
                return (
                    final_num,
                    final_label,
                    "cefr:downgraded_from_c1_to_b2_efllex_cap",
                )
            if raw_num > final_num:
                return (
                    final_num,
                    final_label,
                    f"cefr:downgraded_from_{raw_label.lower()}_to_{final_label.lower()}_efllex_cap",
                )
            return final_num, final_label, "cefr:efllex+cefrpy"

        if raw_num == 6 and final_num == 6:
            return final_num, final_label, "cefr:c2_supported_by_cefrpy+strong_efllex"
        if note.startswith("cefr:efllex"):
            return final_num, final_label, "cefr:efllex+cefrpy"
        return final_num, final_label, note


def _safe_float(value: str | None) -> float:
    try:
        return float(value or 0.0)
    except (TypeError, ValueError):
        return 0.0
