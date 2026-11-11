"use client";

import { FREE_APPLICATIONS, hasProTools, RESUME_LIMITS, type ProTool } from "@/config/plans";
import { trialHeadline } from "@/lib/billing/prices";
import { useStudioStore } from "@/lib/store/resume-store";
import { openUpgradePrompt } from "./upgrade-prompt";
import { currentPlan, useMe } from "./use-me";

// The routes enforce Pro tools; these only spare a refused request by offering the trial first.

export function useProTools(): boolean | null {
  const { me } = useMe();
  if (!me) return null;
  return me.user ? hasProTools(me.user.plan) : false;
}

export function useTryProLabel(): string {
  const { me } = useMe();
  return me?.billing.trial === false ? "See Pro" : trialHeadline();
}

export async function unlockProTool(tool: ProTool): Promise<boolean> {
  const plan = await currentPlan();
  if (plan === null || hasProTools(plan)) return true;
  openUpgradePrompt(tool);
  return false;
}

export async function roomForResume(): Promise<boolean> {
  if (useStudioStore.getState().order.length < RESUME_LIMITS.free) return true;
  return unlockProTool("resumes");
}

export async function roomForApplication(logged: number): Promise<boolean> {
  if (logged < FREE_APPLICATIONS) return true;
  return unlockProTool("tracker");
}
