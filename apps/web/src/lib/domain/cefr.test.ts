import { describe, expect, it } from "vitest";

import { averageCefrLevel, cefrLevelFromNumeric, cefrNumericFromLevel } from "./cefr";

describe("cefrNumericFromLevel", () => {
  it("maps valid CEFR levels to numeric values", () => {
    expect(cefrNumericFromLevel("A1")).toBe(1);
    expect(cefrNumericFromLevel("A2")).toBe(2);
    expect(cefrNumericFromLevel("B1")).toBe(3);
    expect(cefrNumericFromLevel("B2")).toBe(4);
    expect(cefrNumericFromLevel("C1")).toBe(5);
    expect(cefrNumericFromLevel("C2")).toBe(6);
  });

  it("returns null for missing or invalid input", () => {
    expect(cefrNumericFromLevel(null)).toBeNull();
    expect(cefrNumericFromLevel(undefined)).toBeNull();
    expect(cefrNumericFromLevel("Z9")).toBeNull();
    expect(cefrNumericFromLevel("")).toBeNull();
  });
});

describe("cefrLevelFromNumeric", () => {
  it("maps ordinals back to levels and rounds fractions", () => {
    expect(cefrLevelFromNumeric(1)).toBe("A1");
    expect(cefrLevelFromNumeric(6)).toBe("C2");
    expect(cefrLevelFromNumeric(3.4)).toBe("B1");
  });

  it("returns null outside the CEFR range", () => {
    expect(cefrLevelFromNumeric(0)).toBeNull();
    expect(cefrLevelFromNumeric(7)).toBeNull();
    expect(cefrLevelFromNumeric(null)).toBeNull();
    expect(cefrLevelFromNumeric(Number.NaN)).toBeNull();
  });
});

describe("averageCefrLevel", () => {
  it("averages ordinals into a CEFR level", () => {
    expect(averageCefrLevel([1, 1, 2])).toBe("A1");
    expect(averageCefrLevel([3, 4])).toBe("B2");
    expect(averageCefrLevel([6, 6])).toBe("C2");
  });

  it("returns null for an empty list", () => {
    expect(averageCefrLevel([])).toBeNull();
  });
});
