# LexiFlix CLI Tool

Interactive terminal interface for subtitle analysis using Ink and React.

## Features

-   Interactive file selection from `../data/`
-   Real-time processing progress
-   Scrollable results with CEFR color coding
-   Keyboard navigation (↑/↓, Enter, Q/ESC)

## Installation

```bash
bun install
```

## Usage

```bash
bun run start
```

### Workflow

1. Select `.srt` file with arrow keys
2. Wait for Python analysis (30-60s)
3. Browse results: scroll with ↑/↓, exit with Q

## Interface

-   File selection menu
-   Processing spinner
-   Results table: Word | Count | CEFR | Frequency bar

## CEFR Colors

-   🟢 A1/A2: Green
-   🟡 B1/B2: Yellow
-   🔴 C1/C2: Red
-   ⚪ N/A: Gray

## Requirements

-   Bun
-   Python analyzer setup
-   `.srt` files in `../data/`
