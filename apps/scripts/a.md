You have access to my Python script that processes subtitle (`.srt`) files and outputs a JSON file of words with their CEFR levels. For my demo, I do **not** want to integrate this into the web application yet. Instead, I want to build a **standalone CLI tool** with Bun using **InkJS** for an interactive interface.

**Requirements:**

1. The CLI should:

    - List all `.srt` files inside the `data/` directory.
    - Let me navigate/select a file interactively.
    - Run my last Python command (the one that generates JSON from a subtitle file) with the selected file.
    - After processing, display the resulting JSON words in a **nicely formatted, scrollable output** directly in the CLI.

2. Use **ini** library for the TUI interface:

    - A file selection menu.
    - A progress/loading indicator while the Python script runs.
    - A styled JSON/word list output that looks clean for presentation to an evaluation panel.

3. The script should be executable with:

    ```bash
    bun run cli.ts
    ```

4. Keep the design minimal but professional:

    - Show the app title (e.g., “LexiFlix Subtitle Analyzer”) at the top.
    - Provide clear instructions for selecting files and running the job.
    - Format JSON results into a **table-like readable view** (word | CEFR | frequency).

Use the context7 MCP to get updated docs on `ink` (https://github.com/vadimdemedes/ink) and `bun`.
