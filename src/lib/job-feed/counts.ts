// Client-safe and pure. The job counts the site states ("27,000+ open jobs"), always rounded
// down so the claim stays true until the next count.

export type JobCounts = {
  // Every open job in the list.
  open: number;
  // What matching ranks: one per opening (location copies merged), without "general
  // application" posts or posts open 120+ days. The "quality jobs" claim.
  matchable: number;
};

// Shown when the database can't be read (a build without it). Floors of what was measured:
// 37,164 open jobs in the match test database on 2026-11-10 (285 of the first 323 boards as read
// on 2026-11-09, all 282 boards added that day and the three feeds); a full read of every board
// holds more (27,833 on the first 323 alone on 2026-11-08).
export const JOB_COUNTS_FALLBACK: JobCounts = { open: 35_000, matchable: 1_000 };

const count = new Intl.NumberFormat("en-US");

/** 27,833 -> "27,000+", 840 -> "800+". null under 100, where a count says little. */
export function countClaim(n: number): string | null {
  if (!Number.isFinite(n) || n < 100) return null;
  const step = n >= 1_000 ? 1_000 : 100;
  return `${count.format(Math.floor(n / step) * step)}+`;
}
