import { describe, expect, it } from "vitest";
import { addUtcDays, getAppDateKey, getAppDayStartUtc, getAppWeekStart } from "./study-time";

// APP_TIME_ZONE is Asia/Colombo (+05:30). Midnight local = 18:30 UTC previous day.

describe("getAppDateKey", () => {
  it("returns the local date for a UTC timestamp in the same calendar day", () => {
    // 2026-07-15T10:00:00Z = 2026-07-15T15:30:00 IST
    expect(getAppDateKey(new Date("2026-07-15T10:00:00.000Z"))).toBe("2026-07-15");
  });

  it("returns the next day when UTC time crosses local midnight", () => {
    // 2026-07-15T18:30:00Z = 2026-07-16T00:00:00 IST (exactly midnight)
    expect(getAppDateKey(new Date("2026-07-15T18:30:00.000Z"))).toBe("2026-07-16");
  });

  it("returns the current day just before local midnight", () => {
    // 2026-07-15T18:29:59Z = 2026-07-15T23:59:59 IST
    expect(getAppDateKey(new Date("2026-07-15T18:29:59.000Z"))).toBe("2026-07-15");
  });

  it("handles the first second of the new local day", () => {
    // 2026-07-15T18:30:01Z = 2026-07-16T00:00:01 IST
    expect(getAppDateKey(new Date("2026-07-15T18:30:01.000Z"))).toBe("2026-07-16");
  });
});

describe("addUtcDays", () => {
  it("adds positive days", () => {
    expect(addUtcDays("2026-07-15", 3)).toBe("2026-07-18");
  });

  it("subtracts days with negative value", () => {
    expect(addUtcDays("2026-07-15", -1)).toBe("2026-07-14");
  });

  it("handles month boundary", () => {
    expect(addUtcDays("2026-07-31", 1)).toBe("2026-08-01");
  });
});

describe("getAppDayStartUtc", () => {
  it("returns 18:30 UTC of the previous day for a given date key", () => {
    // Midnight of 2026-07-16 in Asia/Colombo = 2026-07-15T18:30:00Z
    const result = getAppDayStartUtc("2026-07-16");
    expect(result.toISOString()).toBe("2026-07-15T18:30:00.000Z");
  });

  it("returns midnight UTC minus offset for Jan 1", () => {
    // Midnight of 2026-01-01 in Asia/Colombo = 2025-12-31T18:30:00Z
    const result = getAppDayStartUtc("2026-01-01");
    expect(result.toISOString()).toBe("2025-12-31T18:30:00.000Z");
  });
});

describe("getAppWeekStart", () => {
  it("returns the Monday start for a mid-week date", () => {
    // 2026-07-15 is a Wednesday in Asia/Colombo. Monday = 2026-07-13.
    // Monday start in UTC: 2026-07-12T18:30:00Z
    const result = getAppWeekStart(new Date("2026-07-15T10:00:00.000Z"));
    expect(result.toISOString()).toBe("2026-07-12T18:30:00.000Z");
  });

  it("returns the same Monday for a Sunday", () => {
    // 2026-07-19 is a Sunday. Monday of that week = 2026-07-13.
    const result = getAppWeekStart(new Date("2026-07-19T10:00:00.000Z"));
    expect(result.toISOString()).toBe("2026-07-12T18:30:00.000Z");
  });
});
