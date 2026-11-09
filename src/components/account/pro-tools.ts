"use client";

import {
  FREE_APPLICATIONS,
  hasProTools,
  PRO_TRIAL,
  RESUME_LIMITS,
  type ProTool,
} from "@/config/plans";
import { useStudioStore } from "@/lib/store/resume-store";
import { openUpgradePrompt } from "./upgrade-prompt";
import { currentPlan, useMe } from "./use-me";

// Client side of the Pro tools (ProTool in src/config/plans.ts). The routes enforce them; these
// only spare people a refused request by offering the trial first.

/** True on Pro, Max and the trial; false on Free and signed out; null until /api/me answers. */
export function useProTools(): boolean | null {
  const { me } = useMe();
  if (!me) return null;
  return me.user ? hasProTools(me.user.plan) : false;
}

/** The label of a button that opens the trial prompt; plainer once the trial has been used. */
export function useTryProLabel(): string {
  const { me } = useMe();
  return me?.billing.trial === false ? "See Pro" : `Try Pro free for ${PRO_TRIAL.days} days`;
}

/**
 * Resolves true when the account may use the tool. On Free it opens the trial prompt and resolves
 * false. When the plan can't be read (offline), it lets the action through: the server decides.
 */
export async function unlockProTool(tool: ProTool): Promise<boolean> {
  const plan = await currentPlan();
  if (plan === null || hasProTools(plan)) return true;
  openUpgradePrompt(tool);
  return false;
}

/**
 * Before any new resume (upload, scratch, sample, copy, import, restore, Build with Otto): Free
 * keeps RESUME_LIMITS.free. Counted in this browser, which holds the account's resumes once sync
 * has read them. Someone already past the limit keeps every resume; only adding is stopped.
 */
export async function roomForResume(): Promise<boolean> {
  if (useStudioStore.getState().order.length < RESUME_LIMITS.free) return true;
  return unlockProTool("resumes");
}

/**
 * Before logging a new application: Free tracks FREE_APPLICATIONS. `logged` is what this browser
 * has listed; the route counts again under a lock, so a stale list only costs a refused request.
 */
export async function roomForApplication(logged: number): Promise<boolean> {
  if (logged < FREE_APPLICATIONS) return true;
  return unlockProTool("tracker");
}
