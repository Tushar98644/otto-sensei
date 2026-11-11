import type { Feature, Usage, UsageSnapshot } from "@/config/plans";

export const NEAR_LIMIT_SHARE = 0.8;

export type NearLimit = { feature: Feature } & Usage;

export function nearestLimit(
  usage: Partial<UsageSnapshot> | null | undefined,
  features: readonly Feature[],
): NearLimit | null {
  let nearest: NearLimit | null = null;
  let nearestShare = 0;
  for (const feature of features) {
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
