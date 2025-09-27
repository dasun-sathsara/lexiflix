# srt_cefr_analyzer.py
# An end-to-end pipeline to extract word frequencies and CEFR levels from .srt.
# Key changes in this rewrite:
#   - Harder filtering:
#       * Exclude tokens that are part of any named entity (GPE, PERSON, DATE,
#         ORDINAL, etc.) regardless of POS
#       * Remove interjections/discourse fillers without hardcoding lists:
#         use POS/Tag/Dep signals (INTJ, UH, discourse)
#       * Drop numbers/dates/ordinals and tokens that are mostly digits or
#         punctuation-like (generic ratio heuristic)
#       * Continue excluding PROPN by default, and exclude tokens that belong
#         to named entities even if not PROPN
#   - Enable spaCy NER (and parser) so entity-based and discourse filtering work
#   - All other functionality preserved; robust fallbacks, caching, I/O, etc.

from __future__ import annotations

import argparse
import html
import json
import logging
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

# Third-party imports
try:
    import srt  # type: ignore
except Exception:
    print("Please install 'srt' package: pip install srt", file=sys.stderr)
    sys.exit(1)

try:
    import spacy
    from spacy.language import Language
    from spacy.tokens import Doc, Token
except Exception:
    print("Please install 'spacy': pip install spacy", file=sys.stderr)
    sys.exit(1)

try:
    from lemminflect import getLemma
except Exception:
    print("Please install 'lemminflect': pip install lemminflect", file=sys.stderr)
    sys.exit(1)

try:
    from cefrpy import CEFRAnalyzer

    try:
        # Optional: helps us normalize levels if available
        from cefrpy import CEFRLevel  # type: ignore
    except Exception:
        CEFRLevel = None  # type: ignore
except Exception:
    print("Please install 'cefrpy': pip install cefrpy", file=sys.stderr)
    sys.exit(1)


LABEL_TO_NUM = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
NUM_TO_LABEL = {v: k for k, v in LABEL_TO_NUM.items()}


@dataclass
class WordStats:
    count: int = 0
    cefr_label: str = "N/A"
    cefr_num: Optional[int] = None  # 1..6 where 1=A1, 6=C2


@dataclass
class PipelineConfig:
    include_propn: bool = False
    dedup_subtitle_lines: bool = True
    print_top_n: int = 50
    prefer_gpu: bool = True
    prefer_transformer: bool = True
    batch_size: int = 200
    n_process_trf: int = 1
    n_process_non_trf: int = -1
    log_level: int = logging.INFO


def read_srt_file(path: Path) -> str:
    try:
        with path.open("r", encoding="utf-8-sig", errors="replace") as f:
            return f.read()
    except IOError as e:
        raise RuntimeError(f"Could not read file at {path}: {e}") from e


def clean_subtitle_text(text: str) -> str:
    # Unescape HTML entities
    text = html.unescape(text)
    # Remove HTML tags, bracketed cues, and speaker labels
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\[[^\]]*\]", " ", text)
    text = re.sub(r"\([^\)]*\)", " ", text)
    text = re.sub(r"\{[^\}]*\}", " ", text)
    text = re.sub(r"^[A-Z][A-Z0-9\s\-]{1,20}:\s*", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_srt_to_lines(srt_text: str, dedup_lines: bool) -> List[str]:
    try:
        subs = list(srt.parse(srt_text))
    except Exception as e:
        raise RuntimeError(f"Failed to parse SRT content: {e}") from e

    cleaned_lines: List[str] = []
    for sub in subs:
        line = sub.content.replace("\n", " ").strip()
        line = clean_subtitle_text(line)
        if line:
            cleaned_lines.append(line)

    if not dedup_lines:
        return cleaned_lines

    # Deduplicate normalized lines
    seen: Set[str] = set()
    deduped_lines: List[str] = []
    for line in cleaned_lines:
        key = re.sub(r"[^\w\s]", "", line.casefold())
        key = re.sub(r"\s+", " ", key).strip()
        if key not in seen:
            seen.add(key)
            deduped_lines.append(line)
    return deduped_lines


def choose_spacy_model(prefer_transformer: bool) -> Tuple[str, bool]:
    candidates: List[Tuple[str, bool]] = []
    if prefer_transformer:
        candidates.append(("en_core_web_trf", True))
    candidates.extend(
        [
            ("en_core_web_lg", False),
            ("en_core_web_md", False),
            ("en_core_web_sm", False),
        ]
    )
    for name, is_trf in candidates:
        if spacy.util.is_package(name):
            logging.info("Found installed spaCy model: %s", name)
            return name, is_trf
    raise RuntimeError(
        "No suitable spaCy model found. Please install one, e.g.:\n"
        "  python -m spacy download en_core_web_trf\n"
        "  python -m spacy download en_core_web_lg"
    )


def load_spacy_pipeline(cfg: PipelineConfig) -> Tuple[Language, bool]:
    # Prefer GPU if available
    if cfg.prefer_gpu and spacy.prefer_gpu():
        logging.info("Using GPU for spaCy processing.")
    else:
        logging.info("Using CPU for spaCy processing.")

    model_name, is_transformer = choose_spacy_model(cfg.prefer_transformer)
    logging.info(
        "Loading spaCy model '%s' (transformer=%s)...", model_name, is_transformer
    )
    try:
        # We keep 'tagger', 'lemmatizer', 'ner', 'parser' enabled:
        # - 'ner' is required for named-entity exclusion
        # - 'parser' helps catch discourse fillers via dep_='discourse'
        nlp = spacy.load(model_name, disable=[])
    except OSError as e:
        raise RuntimeError(f"Could not load model '{model_name}': {e}") from e
    return nlp, is_transformer


def coarse_to_base_ptb(pos: str) -> Optional[str]:
    # Map spaCy coarse POS to base Penn tags expected by cefrpy
    if pos == "NOUN":
        return "NN"
    if pos == "VERB":
        return "VB"
    if pos == "ADJ":
        return "JJ"
    if pos == "ADV":
        return "RB"
    if pos == "PROPN":
        # If included, treat proper nouns like common nouns for CEFR purposes
        return "NN"
    return None


def fine_to_base_ptb(tag: str) -> Optional[str]:
    # Convert fine PTB tag to its base category
    tag = tag.upper()
    if not tag:
        return None
    if tag[0] == "N":
        return "NN"
    if tag[0] == "V":
        return "VB"
    if tag[0] == "J":
        return "JJ"
    if tag[0] == "R":
        return "RB"
    return None


def normalize_cefr_value(val) -> Tuple[Optional[int], Optional[str]]:
    # Accept CEFRLevel, str label, int/float, or None; return (num, label)
    if val is None:
        return None, None
    # Try enum/int semantics
    try:
        num = int(val)  # CEFRLevel often behaves like IntEnum
        label = NUM_TO_LABEL.get(num)
        if label:
            return num, label
    except Exception:
        pass

    # Try enum.value
    try:
        num_attr = getattr(val, "value", None)
        if isinstance(num_attr, int) and num_attr in NUM_TO_LABEL:
            return num_attr, NUM_TO_LABEL[num_attr]
    except Exception:
        pass

    # Try string label
    s = str(val).upper().strip()
    if s in LABEL_TO_NUM:
        return LABEL_TO_NUM[s], s

    # Try numeric string/float
    try:
        f = float(s)
        num = int(round(f))
        if num in NUM_TO_LABEL:
            return num, NUM_TO_LABEL[num]
    except Exception:
        pass

    return None, None


class CEFRLookup:
    def __init__(self, analyzer: CEFRAnalyzer):
        self.analyzer = analyzer
        self.cache_pos: Dict[Tuple[str, str], Tuple[int, str]] = {}
        self.cache_avg: Dict[str, Tuple[int, str]] = {}

    def get_pos_level(
        self, word: str, pos_ptb: str
    ) -> Tuple[Optional[int], Optional[str]]:
        key = (word, pos_ptb)
        if key in self.cache_pos:
            n, s = self.cache_pos[key]
            return n, s
        try:
            val = self.analyzer.get_word_pos_level_CEFR(word, pos_ptb)
        except Exception:
            val = None
        num, label = normalize_cefr_value(val)
        if num is not None and label is not None:
            self.cache_pos[key] = (num, label)
        return num, label

    def get_average_level(self, word: str) -> Tuple[Optional[int], Optional[str]]:
        if word in self.cache_avg:
            n, s = self.cache_avg[word]
            return n, s
        try:
            val = self.analyzer.get_average_word_level_CEFR(word)
        except Exception:
            val = None
        num, label = normalize_cefr_value(val)
        if num is not None and label is not None:
            self.cache_avg[word] = (num, label)
        return num, label

    def get_plain_level(self, word: str) -> Tuple[Optional[int], Optional[str]]:
        # Some versions expose get_word_level_CEFR; fallback if present
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


def should_try_verb_lemma_for_adj(token: Token) -> bool:
    # Heuristic: adjectival participles often end in -ed or -ing
    if token.pos_ != "ADJ":
        return False
    txt = token.text.lower()
    return txt.endswith("ed") or txt.endswith("ing")


# -------------------------
# Harder filtering helpers
# -------------------------


def is_named_entity_token(token: Token) -> bool:
    # Exclude all tokens that belong to any named entity span
    # (GPE, PERSON, DATE, ORDINAL, CARDINAL, TIME, ORG, etc.)
    return bool(token.ent_type_)


def is_disfluency_or_filler(token: Token) -> bool:
    # No hardcoding of a specific list: we rely on linguistic signals
    # commonly used by spaCy for interjections/discourse fillers.
    # - POS INTJ captures uh, um, yeah, wow, hey, okay (interjective uses)
    # - PTB tag UH is a strong indicator of interjection
    # - Dependency 'discourse' (requires parser) often marks fillers/backchannels
    if token.pos_ == "INTJ":
        return True
    if token.tag_.upper() == "UH":
        return True
    if token.dep_ in {"discourse", "intj"}:
        return True
    # Generic fallback: very short stop-wordy fragments often used as fillers
    # (kept generic; not a hardcoded lexeme list)
    lemma = token.lemma_.lower()
    if token.is_stop and len(lemma) <= 4 and token.pos_ in {"X", "PART", "ADV"}:
        return True
    return False


def is_ordinal_token(token: Token) -> bool:
    # Use morphological feature if available
    # Many models annotate ordinals with NumType=Ord
    if "Ord" in token.morph.get("NumType"):
        return True
    # Additionally, if it's an entity token, our entity filter already catches
    # ORDINAl entities, so no further checks needed here.
    return False


def is_mostly_digits_or_punct(token: Token) -> bool:
    # Drop tokens that are numeric-like or dominated by digits/punct
    if token.like_num:
        return True
    txt = token.text
    if not txt:
        return True
    digits = sum(c.isdigit() for c in txt)
    punct_like = sum(not c.isalnum() and not c.isspace() for c in txt)
    ratio = (digits + punct_like) / max(1, len(txt))
    return ratio >= 0.6


def token_should_be_excluded(
    token: Token, allowed_pos: Set[str], include_propn: bool
) -> bool:
    # Spaces and punctuation
    if token.is_space or token.is_punct:
        return True

    # Named entities (exclude all entity types regardless of POS)
    if is_named_entity_token(token):
        return True

    # Numbers, ordinals, and digit/punct-heavy tokens
    if is_ordinal_token(token) or is_mostly_digits_or_punct(token):
        return True

    # Interjections / discourse fillers (no hardcoded word lists)
    if is_disfluency_or_filler(token):
        return True

    # Stop words
    if token.is_stop:
        return True

    # POS gate (PROPN excluded by default unless include_propn=True)
    if token.pos_ not in allowed_pos:
        return True

    return False


def best_cefr_for_token(
    token: Token, lemma: str, lookup: CEFRLookup, include_propn: bool
) -> Tuple[Optional[int], Optional[str]]:
    # Build POS candidates
    pos_candidates: List[str] = []
    base_from_coarse = coarse_to_base_ptb(token.pos_)
    if base_from_coarse:
        pos_candidates.append(base_from_coarse)

    base_from_fine = fine_to_base_ptb(token.tag_)
    if base_from_fine and base_from_fine not in pos_candidates:
        pos_candidates.append(base_from_fine)

    # If the adjective appears participial, try verb lemma + VB as primary
    verb_lemma: Optional[str] = None
    if should_try_verb_lemma_for_adj(token):
        vl = getLemma(token.text, upos="VERB")
        if vl:
            verb_lemma = vl[0].lower().strip()

    # Try in order:
    # 1) lemma + base POS candidates
    # 2) if verb_lemma exists, try verb_lemma + VB
    # 3) average level for lemma
    # 4) plain level for lemma (if available)
    # 5) as last resort, surface form + base/fine POS, then average
    tried: Set[Tuple[str, str]] = set()

    for p in pos_candidates:
        if p:
            num, label = lookup.get_pos_level(lemma, p)
            if num is not None:
                return num, label
            tried.add((lemma, p))

    if verb_lemma:
        num, label = lookup.get_pos_level(verb_lemma, "VB")
        if num is not None:
            return num, label

    num, label = lookup.get_average_level(lemma)
    if num is not None:
        return num, label

    num, label = lookup.get_plain_level(lemma)
    if num is not None:
        return num, label

    # Surface form fallbacks
    surface = token.text.lower()
    for p in pos_candidates:
        if p and (surface, p) not in tried:
            num, label = lookup.get_pos_level(surface, p)
            if num is not None:
                return num, label

    num, label = lookup.get_average_level(surface)
    if num is not None:
        return num, label

    return None, None


def get_valid_lemma(
    token: Token, allowed_pos: Set[str], include_propn: bool
) -> Optional[str]:
    # Advanced filtering before considering lemma
    if token_should_be_excluded(token, allowed_pos, include_propn):
        return None

    lemma = token.lemma_.lower().strip()

    # If adjectival participle, try verb lemma
    if should_try_verb_lemma_for_adj(token):
        verb_lemma_tuple = getLemma(token.text, upos="VERB")
        if verb_lemma_tuple:
            lemma = verb_lemma_tuple[0].lower().strip()

    # Filter out junk-like lemmas; allow purely alphabetic tokens
    # (drops hyphenated/contracted/digit-mixed content)
    if not lemma or not lemma.isalpha():
        return None

    return lemma


def process_text_and_get_stats(
    docs: Iterable[Doc],
    cefr_lookup: CEFRLookup,
    include_propn: bool,
) -> Dict[str, WordStats]:
    allowed_pos: Set[str] = {"NOUN", "VERB", "ADJ", "ADV"}
    if include_propn:
        allowed_pos.add("PROPN")

    word_stats: Dict[str, WordStats] = {}
    logging.info("Filtering tokens, counting, and assigning CEFR levels...")

    for doc in docs:
        for token in doc:
            lemma = get_valid_lemma(token, allowed_pos, include_propn)
            if not lemma:
                continue

            # Frequency
            stats = word_stats.get(lemma)
            if stats is None:
                stats = WordStats(count=0, cefr_label="N/A", cefr_num=None)
                word_stats[lemma] = stats
            stats.count += 1

            # CEFR lookup with fallbacks
            num, label = best_cefr_for_token(
                token=token,
                lemma=lemma,
                lookup=cefr_lookup,
                include_propn=include_propn,
            )

            # Upgrade logic:
            # - If we had N/A and now we got a value, set it
            # - If both are present, keep the easier (lower) level
            if num is not None and label is not None:
                if stats.cefr_num is None or num < stats.cefr_num:
                    stats.cefr_num = num
                    stats.cefr_label = label

    return word_stats


def save_results_to_file(path: Path, stats: Dict[str, WordStats]) -> None:
    sorted_items = sorted(stats.items(), key=lambda item: (-item[1].count, item[0]))
    try:
        if path.suffix.lower() == ".json":
            data_to_save = [
                {
                    "lemma": lemma,
                    "count": data.count,
                    "cefr_level": data.cefr_label,
                    "cefr_num": data.cefr_num,
                }
                for lemma, data in sorted_items
            ]
            with path.open("w", encoding="utf-8") as f:
                json.dump(data_to_save, f, ensure_ascii=False, indent=2)
            logging.info("Saved results to JSON: %s", path)
        elif path.suffix.lower() == ".csv":
            with path.open("w", encoding="utf-8", newline="") as f:
                f.write("lemma,count,cefr_level,cefr_num\n")
                for lemma, data in sorted_items:
                    safe = lemma.replace('"', '""')
                    level = data.cefr_label
                    num = "" if data.cefr_num is None else str(data.cefr_num)
                    f.write(f'"{safe}",{data.count},{level},{num}\n')
            logging.info("Saved results to CSV: %s", path)
        else:
            logging.warning(
                "Unsupported output format for %s. Use .json or .csv.", path
            )
    except IOError as e:
        logging.error("Failed to write to output file %s: %s", path, e)


def print_top_results(stats: Dict[str, WordStats], n: int, title: str) -> None:
    if not stats:
        return
    print(f"\n--- {title} ---")
    print(f"{'#':>3}  {'Lemma':<20} {'Count':<8} {'CEFR Level':<10} {'Num'}")
    print("-" * 60)
    sorted_items = sorted(stats.items(), key=lambda item: (-item[1].count, item[0]))
    for i, (lemma, data) in enumerate(sorted_items[:n], start=1):
        num = "" if data.cefr_num is None else str(data.cefr_num)
        print(f"{i:>3}. {lemma:<20} {data.count:<8} {data.cefr_label:<10} {num}")
    print("-" * 60)


def run_pipeline(
    input_srt: Path,
    output_path: Optional[Path],
    cfg: PipelineConfig,
) -> None:
    logging.basicConfig(
        level=cfg.log_level, format="%(asctime)s | %(levelname)s | %(message)s"
    )

    if not input_srt.is_file():
        raise FileNotFoundError(f"Input file not found: {input_srt}")

    logging.info("Step 1: Reading and parsing SRT file: %s", input_srt)
    srt_text = read_srt_file(input_srt)
    lines = parse_srt_to_lines(srt_text, dedup_lines=cfg.dedup_subtitle_lines)

    if not lines:
        logging.warning("No subtitle text could be extracted. Exiting.")
        return

    total_chars = sum(len(x) for x in lines)
    logging.info(
        "Step 2: Prepared %d unique lines (%s chars) for NLP.",
        len(lines),
        f"{total_chars:,}",
    )

    nlp, is_transformer = load_spacy_pipeline(cfg)
    cefr_lookup = CEFRLookup(CEFRAnalyzer())

    n_process = cfg.n_process_trf if is_transformer else cfg.n_process_non_trf

    logging.info(
        "Step 3: Running spaCy pipeline (batch_size=%d, n_process=%s)...",
        cfg.batch_size,
        n_process,
    )
    docs = nlp.pipe(lines, batch_size=cfg.batch_size, n_process=n_process)

    word_stats = process_text_and_get_stats(
        docs, cefr_lookup, include_propn=cfg.include_propn
    )

    if not word_stats:
        logging.warning("No valid tokens were found after filtering.")
    else:
        logging.info("Step 4: Analyzed %d unique token lemmas.", len(word_stats))

    if output_path:
        save_results_to_file(output_path, word_stats)

    print_top_results(word_stats, cfg.print_top_n, "Top Token Lemmas with CEFR Level")

    logging.info("Pipeline finished successfully.")


def main() -> None:
    p = argparse.ArgumentParser(
        description=(
            "Analyze an .srt file to produce a frequency list of lemmas "
            "with their CEFR levels."
        ),
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("input", type=Path, help="Path to the input .srt file.")
    p.add_argument(
        "--out-json", type=Path, help="Path to write results to a JSON file."
    )
    p.add_argument("--out-csv", type=Path, help="Path to write results to a CSV file.")

    p.add_argument(
        "--include-propn",
        action="store_true",
        help="Include proper nouns (treated as NN) in the analysis.",
    )
    p.add_argument(
        "--no-dedup",
        action="store_false",
        dest="dedup",
        help="Disable deduplication of subtitle lines.",
    )
    p.add_argument("--top", type=int, default=50, help="Number of top tokens to print.")

    p.add_argument(
        "--cpu", action="store_true", help="Force CPU usage; do not prefer GPU."
    )
    p.add_argument(
        "--no-transformer", action="store_true", help="Prefer non-transformer models."
    )
    p.add_argument(
        "--batch-size", type=int, default=200, help="Batch size for spaCy processing."
    )
    p.add_argument(
        "--log-level",
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        help="Set the logging level.",
    )
    args = p.parse_args()

    if args.out_json and args.out_csv:
        # If both are given, write to the one with explicit flag order last.
        # Simpler: disallow both to avoid ambiguity.
        p.error("argument --out-csv: not allowed with argument --out-json")

    cfg = PipelineConfig(
        include_propn=args.include_propn,
        dedup_subtitle_lines=args.dedup,
        print_top_n=args.top,
        prefer_gpu=not args.cpu,
        prefer_transformer=not args.no_transformer,
        batch_size=args.batch_size,
        log_level=getattr(logging, args.log_level.upper()),
    )

    try:
        run_pipeline(
            input_srt=args.input,
            output_path=args.out_json or args.out_csv,
            cfg=cfg,
        )
    except (RuntimeError, FileNotFoundError) as e:
        logging.error("A critical error occurred: %s", e)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nProcess interrupted by user.", file=sys.stderr)
        sys.exit(130)
    except Exception:
        logging.exception("An unexpected fatal error occurred:")
        sys.exit(1)


if __name__ == "__main__":
    main()
