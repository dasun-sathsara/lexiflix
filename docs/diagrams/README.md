# LexiFlix Diagrams Guide

This directory houses the LexiFlix system architecture diagram. Follow this guide to replicate the layout generation, make updates, or export deliverables without repeating common layout and rendering pitfalls.

## Directory Structure

```
diagrams/
├── README.md               # This guide
├── source/
│   ├── architecture.drawio # The primary Draw.io XML System Architecture source
│   └── nlp_pipeline.drawio # The NLP Pipeline Flowchart XML source
└── svg/
    ├── architecture.svg    # System Architecture Vector SVG (50px margin)
    └── nlp_pipeline.svg    # NLP Pipeline Vector SVG (50px margin)
```

---

## Design and Styling Rules

To maintain the custom whiteboard aesthetic, the layout pipeline follows these visual rules:

1. **Containers and Component Cards**:
   - Outlines must use the hand-drawn sketchy style (`sketch=1`).
   - Cards have solid, pastel-tinted background fills matching their logical tier.
   - Text inside cards is left-aligned with a left margin offset to leave room for the nested icon (`align=left;spacingLeft=58;`).
2. **Icons**:
   - Standard 32x32px brand icons are rendered as parent-nested sub-cells (`parent="<nodeId>"`) inside their parent card's left margin (`x="15"`, `y="iy"`).
3. **Edges / Connector Lines**:
   - Edges must be **direct vector lines** (no wobbly outlines, **omit `sketch=1`**).
   - Set curved orthogonal lines (`curved=1;edgeStyle=orthogonalEdgeStyle;`) to keep routing clean.
   - Use jump-arcs (`jumpStyle=arc;jumpSize=6;`) so overlapping connection paths hop over each other cleanly.
4. **Global Typography**:
   - Use the same wobbly/cursive font everywhere: `fontFamily=Comic Sans MS,cursive;`.
   - Apply **regular font-weight** (`fontStyle=0;`) to all elements (group headers, node text, edge labels) to prevent heavy visual clutter.

---

## The Generation Pipeline

The diagram is generated as code using a Graphviz-dot wrapper. Do not edit the raw XML by hand unless doing minor tweaks; instead, modify the graph definition and re-generate:

1. **Modify the Graph Structure**:
   Update `graph.json` or the Python variables defining `nodes` and `edges`. Keep labels short (e.g. `SQL (ORM)`, `S3 GET`) or use explicit HTML text styling for structured sizing:
   - **Title**: `font-size: 12px;`
   - **Description**: `font-size: 11px;`
   - **Example**: `font-size: 10px; font-style: italic; color: #666666;`
2. **Run Autolayout**:
   Run the custom autolayout script to calculate node coordinates and route curved orthogonal bends:
   ```bash
   python3 docs/diagrams/scripts/autolayout_custom.py graph.json -o diagrams/source/architecture.drawio
   # OR for the NLP pipeline:
   python3 docs/diagrams/scripts/autolayout_custom.py graph.json -o diagrams/source/nlp_pipeline.drawio
   ```
3. **Validate the XML**:
   Always run the linter before exporting to catch dangling connections or invalid parents:
   ```bash
   python3 /Users/pabasara/.agents/skills/drawio-skill/scripts/validate.py diagrams/source/architecture.drawio
   ```
4. **Export to SVG**:
   Export with embedded XML (making the SVG editable in Draw.io) and a **50px boundary margin** (`-b 50`):
   ```bash
   drawio -x -f svg -e -b 50 -o diagrams/svg/architecture.svg diagrams/source/architecture.drawio
   # OR for the NLP pipeline:
   drawio -x -f svg -e -b 50 -o diagrams/svg/nlp_pipeline.svg diagrams/source/nlp_pipeline.drawio
   ```

---

## Key Pitfalls and Lessons Learned

1. **Draw.io CLI PNG Bug (repaired IEND chunk)**:
   When exporting to PNG with the `-e` (embed XML) flag, Draw.io's CLI truncates the final `IEND` chunk (8 bytes missing). If you export a PNG, you **must** immediately run the repair script on it:
   ```bash
   python3 /Users/pabasara/.agents/skills/drawio-skill/scripts/repair_png.py diagrams/png/architecture.drawio.png
   ```
   *Note: SVGs are text-based and are not affected by this bug.*
2. **Draft Previews and Vision APIs**:
   Do **not** use the `-e` flag on draft PNGs sent to Vision APIs (like Claude's image reader) for self-check rounds. The truncated PNG header will cause the Vision API to return HTTP 400. Export a flat preview (`drawio -x -f png --width 2000`) instead.
3. **Graphviz rankdir Fallbacks**:
   By default, the skill's autolayout script fallbacks to `TB` for any direction other than `LR`. The custom script at `docs/diagrams/scripts/autolayout_custom.py` has been updated to support `TB`, `BT`, `LR`, and `RL` directions natively.
4. **F-String Backslash Escaping**:
   When modifying the custom Python autolayout script, avoid complex `.replace()` or string operations directly inside f-string curly braces (`{...}`). This triggers backslash constraints in earlier Python environments. Pre-process all HTML replacements (like translating `\n` to `<br>`) as variables outside the f-string.
