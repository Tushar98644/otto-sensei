import type { Feature, Usage, UsageSnapshot } from "@/config/plans";

// Otto warns once a meter is this full, early enough to plan around it.
export const NEAR_LIMIT_SHARE = 0.8;

export type NearLimit = { feature: Feature } & Usage;

/** The meter closest to its limit, once one is at least 80% used. Ties go to the earlier feature. */
export function nearestLimit(
  usage: Partial<UsageSnapshot> | null | undefined,
  features: readonly Feature[],
): NearLimit | null {
  let nearest: NearLimit | null = null;
  let nearestShare = 0;
  for (const feature of features) {
    // A server from before a feature existed sends no count for it.
    const entry = usage?.[feature];
    if (!entry || !(entry.limit > 0)) continue;
    const share = entry.used / entry.limit;
    if (share >= NEAR_LIMIT_SHARE && share > nearestShare) {
      nearest = { feature, used: entry.used, limit: entry.limit };
      nearestShare = share;
    }
  }
  return nearest;
}
