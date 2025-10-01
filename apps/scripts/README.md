# LexiFlix Scripts

A subtitle analysis toolkit for extracting vocabulary CEFR levels from subtitle files.

## Overview

Contains two tools: a Python NLP analyzer and an interactive CLI interface for processing `.srt` files.

## Project Structure

```
scripts/
├── python-analyzer/     # Python NLP processing
├── cli-tool/           # Interactive CLI interface
├── data/               # Subtitle files (.srt)
└── README.md
```

## Quick Start

### Setup Python Analyzer

```bash
cd python-analyzer
uv sync
uv run python -m spacy download en_core_web_trf
```

### Setup CLI Tool

```bash
cd cli-tool
bun install
```

### Run CLI

```bash
cd cli-tool
bun run start
```

## Components

### Python Analyzer

-   spaCy-based linguistic analysis
-   CEFR level classification
-   JSON/CSV output

### CLI Tool

-   Interactive file selection
-   Real-time processing feedback
-   Scrollable results with CEFR visualization

## Requirements

-   Python 3.11+
-   Bun
-   uv package manager
