export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

// Calendar days from `now` to `at` on this clock: 0 is the same day, 1 tomorrow, -1 yesterday.
export function dayOffset(at: number, now: number): number {
  const day = (time: number) => {
    const date = new Date(time);
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };
  return Math.round((day(at) - day(now)) / DAY_MS);
}
