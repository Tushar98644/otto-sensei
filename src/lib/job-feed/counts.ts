export type JobCounts = {
  open: number;
  matchable: number;
};

export const JOB_COUNTS_FALLBACK: JobCounts = { open: 35_000, matchable: 1_000 };

const count = new Intl.NumberFormat("en-US");

export function countClaim(n: number): string | null {
  if (!Number.isFinite(n) || n < 100) return null;
  const step = n >= 1_000 ? 1_000 : 100;
  return `${count.format(Math.floor(n / step) * step)}+`;
}
