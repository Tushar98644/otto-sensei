// Rounded down so the claim stays true until the next count.

export type JobCounts = {
  open: number;
  // One per opening, without "general application" posts or posts open 120+ days.
  matchable: number;
};

// When the database can't be read: floors of what was measured (37,164 open jobs on 2026-11-10).
export const JOB_COUNTS_FALLBACK: JobCounts = { open: 35_000, matchable: 1_000 };

const count = new Intl.NumberFormat("en-US");

/** 27,833 -> "27,000+", 840 -> "800+". null under 100, where a count says little. */
export function countClaim(n: number): string | null {
  if (!Number.isFinite(n) || n < 100) return null;
  const step = n >= 1_000 ? 1_000 : 100;
  return `${count.format(Math.floor(n / step) * step)}+`;
}
