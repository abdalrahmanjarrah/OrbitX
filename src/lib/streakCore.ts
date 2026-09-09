/**
 * Pure streak helpers (no DB imports — safe to unit-test in isolation).
 * Dates are UTC "YYYY-MM-DD" strings, consistent with the rest of the app.
 */

export function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

export function dayBefore(date: string): string {
  return new Date(
    new Date(date + "T00:00:00Z").getTime() - 86400000,
  )
    .toISOString()
    .slice(0, 10);
}

export function computeStreak(
  lastActiveDate: string | undefined,
  currentStreak: number,
  today: string,
): number {
  if (!lastActiveDate || lastActiveDate === today) return currentStreak;
  return lastActiveDate === dayBefore(today) ? currentStreak + 1 : 1;
}
