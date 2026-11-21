"use client";

import { useMe } from "@/components/account/use-me";
import { canTailor } from "@/components/studio/tailor/tailor-access";

// Free can still hold invite-bonus tailors, so the allowance decides, not the plan alone.
export function useTailorLocked(): boolean {
  const { me } = useMe();
  if (!me?.user) return false;
  return !canTailor(me.user.plan, me.usage?.tailor);
}
