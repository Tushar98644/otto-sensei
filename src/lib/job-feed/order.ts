import { DAY_MS } from "@/lib/time";
import type { PlaceFit } from "./looking-for";
import { SENIORITY_RANK } from "./roles";
import type { JobMatch, MatchLabel, Seniority } from "./types";

const LABEL_ORDER: Record<MatchLabel, number> = { strong: 0, good: 1, stretch: 2 };

export const ORDER_LIMITS = {
  perCompany: 3,
  window: 20,
  familyWeight: 2,
  oneUp: 0.85,
  oneDown: 0.9,
  farLevel: 0.5,
  titleFit: 1.1,
  oneZoneUp: 0.9,
  farZone: 0.6,
  placeMatch: 1.15,
  placeMiss: 0.6,
} as const;

export function closeness(
  match: Pick<JobMatch, "found">,
  keywords: readonly string[],
  weight: (skill: string) => number,
  kind: number,
): number {
  let found = 0;
  for (const skill of match.found) found += weight(skill);
  let asked = 0;
  for (const skill of keywords) asked += weight(skill);
  const coverage = asked === 0 ? 0 : found / asked;
  return found * (0.5 + 0.5 * coverage) + ORDER_LIMITS.familyWeight * kind;
}

export function levelGap(person: Seniority | null, job: Seniority): number {
  return person === null ? 0 : SENIORITY_RANK[job] - SENIORITY_RANK[person];
}

export function levelFactor(gap: number): number {
  if (gap === 0) return 1;
  if (gap === 1) return ORDER_LIMITS.oneUp;
  if (gap === -1) return ORDER_LIMITS.oneDown;
  return ORDER_LIMITS.farLevel;
}

export function zoneFactor(
  person: { occupation: string | null; zone: number | null },
  job: { occupation?: string | null; zone?: number | null },
): number {
  if (person.zone === null || !job.zone || !job.occupation || job.occupation === person.occupation)
    return 1;
  const gap = job.zone - person.zone;
  if (gap >= 2) return ORDER_LIMITS.farZone;
  return gap === 1 ? ORDER_LIMITS.oneZoneUp : 1;
}

export function placeFactor(fit: PlaceFit): number {
  if (fit === "match") return ORDER_LIMITS.placeMatch;
  if (fit === "miss") return ORDER_LIMITS.placeMiss;
  return 1;
}

export function freshness(seenAt: number, now: number): number {
  const age = now - seenAt;
  if (age <= 7 * DAY_MS) return 1;
  if (age <= 30 * DAY_MS) return 0.9;
  return 0.75;
}

export type Ranked = {
  match: JobMatch;
  company: string;
  postedAt: number;
  closeness: number;
  demoted?: boolean;
  pastKind?: boolean;
};

export function compareRanked(a: Ranked, b: Ranked): number {
  const rank = (item: Ranked) =>
    (item.match.label === null ? 3 : LABEL_ORDER[item.match.label]) + (item.demoted ? 1 : 0);
  return (
    rank(a) - rank(b) ||
    Number(a.pastKind ?? false) - Number(b.pastKind ?? false) ||
    b.closeness - a.closeness ||
    b.postedAt - a.postedAt
  );
}

const companyOf = (item: { company: string }) => item.company.trim().toLowerCase();

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
