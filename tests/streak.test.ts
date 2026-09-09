import { describe, it, expect } from "vitest";
import { computeStreak, dayBefore } from "../src/lib/streakCore";

describe("computeStreak", () => {
  it("keeps the streak unchanged on a same-day visit", () => {
    expect(computeStreak("2026-08-15", 5, "2026-08-15")).toBe(5);
  });

  it("increments the streak on a consecutive day", () => {
    expect(computeStreak("2026-08-14", 5, "2026-08-15")).toBe(6);
  });

  it("resets the streak to 1 after a missed day", () => {
    expect(computeStreak("2026-08-13", 5, "2026-08-15")).toBe(1);
  });

  it("returns the current streak when never active", () => {
    expect(computeStreak(undefined, 0, "2026-08-15")).toBe(0);
  });

  it("handles month boundaries", () => {
    expect(computeStreak("2026-07-31", 3, "2026-08-01")).toBe(4);
  });
});

describe("dayBefore", () => {
  it("returns the previous UTC date", () => {
    expect(dayBefore("2026-03-01")).toBe("2026-02-28");
  });
});
