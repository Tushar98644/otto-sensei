import type { JobMatch, MatchLabel } from "./types";

// Client-safe and pure. The order Matches come in: label first (the rule-based guardrail), then
// how much of what the post asks for the resume covers, weighted so rare skills count more, with
// a small nudge for new posts. Nothing here is ever shown: the card states only the label and
// "Found: … Not found: …".

const DAY_MS = 24 * 60 * 60 * 1_000;
const LABEL_ORDER: Record<MatchLabel, number> = { strong: 0, good: 1, stretch: 2 };

export const ORDER_LIMITS = {
  // At most this many cards from one company per page, and never two in a row while another
  // company's job is left to show.
  perCompany: 3,
  window: 20,
  // The same kind of role as the resume counts like one or two common shared skills, so a sales
  // or support resume that names few tools still reaches its own kind of job.
  familyWeight: 2,
} as const;

/**
 * How closely the post lines up with the resume: the weight of the skills found, scaled by the
 * share of the post's own (weighted) skills they cover, plus a bit for the same kind of role.
 * `weight` is a skill's ln(open jobs / jobs naming it) from job_skills.
 */
export function closeness(
  match: Pick<JobMatch, "found">,
  keywords: readonly string[],
  weight: (skill: string) => number,
  sameKind: boolean,
): number {
  let found = 0;
  for (const skill of match.found) found += weight(skill);
  let asked = 0;
  for (const skill of keywords) asked += weight(skill);
  const coverage = asked === 0 ? 0 : found / asked;
  return found * (0.5 + 0.5 * coverage) + (sameKind ? ORDER_LIMITS.familyWeight : 0);
}

/**
 * New posts get fewer applicants, so they rise a little; never enough for a weak match to pass a
 * close one. `seenAt` is the earlier of the posting date and when the ingest first saw it, since
 * some boards move the posting date on every edit.
 */
export function freshness(seenAt: number, now: number): number {
  const age = now - seenAt;
  if (age <= 7 * DAY_MS) return 1;
  if (age <= 30 * DAY_MS) return 0.9;
  return 0.75;
}

export type Ranked = { match: JobMatch; company: string; postedAt: number; closeness: number };

/** Best first: label, then closeness (already freshness-scaled), then newest. */
export function compareRanked(a: Ranked, b: Ranked): number {
  const rank = (match: JobMatch) => (match.label === null ? 3 : LABEL_ORDER[match.label]);
  return rank(a.match) - rank(b.match) || b.closeness - a.closeness || b.postedAt - a.postedAt;
}

const companyOf = (item: { company: string }) => item.company.trim().toLowerCase();

/**
 * Reorders a best-first list so each page of `window` has at most `perCompany` jobs from one
 * company and no company twice in a row. A greedy pass: each slot takes the best job that keeps
 * both rules; when none does, the rules give way in that order, so a page is never left short.
 * Jobs pushed back keep their order and lead the next page.
 */
export function capPerCompany<T extends { company: string }>(
  items: readonly T[],
  { perCompany = ORDER_LIMITS.perCompany, window = ORDER_LIMITS.window } = {},
): T[] {
  const rest = [...items];
  const out: T[] = [];
  let counts = new Map<string, number>();
  while (rest.length > 0) {
    if (out.length % window === 0) counts = new Map();
    const last = out.length > 0 ? companyOf(out[out.length - 1]!) : null;
    const room = (item: T) => (counts.get(companyOf(item)) ?? 0) < perCompany;
    let pick = rest.findIndex((item) => room(item) && companyOf(item) !== last);
    if (pick === -1) pick = rest.findIndex(room);
    if (pick === -1) pick = 0;
    const [item] = rest.splice(pick, 1);
    out.push(item!);
    counts.set(companyOf(item!), (counts.get(companyOf(item!)) ?? 0) + 1);
  }
  return out;
}
