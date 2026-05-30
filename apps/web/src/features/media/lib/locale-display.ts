export function getLanguageName(code: string): string {
  try {
    const display = new Intl.DisplayNames(["en"], { type: "language" });
    return display.of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

export function getCountryName(code: string): string {
  try {
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    return display.of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}
