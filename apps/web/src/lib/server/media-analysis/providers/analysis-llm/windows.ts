import "server-only";

import { ANALYSIS_LLM_WINDOW_CHARACTERS } from "@/lib/constants";

/**
 * Splits raw subtitle text into prompt-sized windows on line boundaries.
 *
 * This is a provider concern, not subtitle processing: the LLM has a context limit, so
 * the text it is shown has to be windowed. No SRT structure is interpreted here.
 */
export function buildPromptWindows(
  subtitleText: string,
  maxCharacters: number = ANALYSIS_LLM_WINDOW_CHARACTERS,
): string[] {
  const lines = subtitleText.split(/\r?\n/);
  const windows: string[] = [];

  let current: string[] = [];
  let currentCharacters = 0;

  const flush = () => {
    const text = current.join("\n").trim();
    if (text) {
      windows.push(text);
    }
    current = [];
    currentCharacters = 0;
  };

  for (const line of lines) {
    const cost = line.length + 1;

    if (currentCharacters > 0 && currentCharacters + cost > maxCharacters) {
      flush();
    }

    current.push(line);
    currentCharacters += cost;
  }

  flush();

  return windows;
}
