# LexiFlix Python Analyzer

NLP pipeline for subtitle analysis using spaCy and CEFR classification.

## Features

- Parses `.srt` files
- spaCy linguistic analysis with transformer models
- CEFR level assignment (A1-C2)
- Smart filtering (excludes entities, stop words, etc.)
- JSON/CSV output

## Installation

```bash
uv sync
uv run python -m spacy download en_core_web_trf
```

## Usage

```bash
uv run python src/main.py <input.srt> --out-json output.json
```

### Options

- `--out-csv`: CSV output
- `--include-propn`: Include proper nouns
- `--top N`: Show top N words
- `--cpu`: Force CPU usage

## Output Format

### JSON

```json
[{ "lemma": "go", "count": 86, "cefr_level": "A1", "cefr_num": 1 }]
```

### CSV

```csv
lemma,count,cefr_level,cefr_num
```

## CEFR Levels

- A1 (1): Beginner
- A2 (2): Elementary
- B1 (3): Intermediate
- B2 (4): Upper Intermediate
- C1 (5): Advanced
- C2 (6): Proficiency

## Requirements

- Python 3.11+
- uv package manager
