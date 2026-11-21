"use client";

import { trashWithUndo } from "@/components/ui/trash-with-undo";
import {
  FREE_APPLICATIONS,
  hasProTools,
  planIncludes,
  RESUME_LIMITS,
  type Feature,
  type ProTool,
} from "@/config/plans";
import { trialHeadline } from "@/lib/billing/prices";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import type { ReplaceOffer } from "./upgrade-dialog";
import { openFeaturePrompt, openUpgradePrompt } from "./upgrade-prompt";
import { currentPlan, useMe } from "./use-me";

// The routes enforce Pro tools; these only spare a refused request by offering the trial first.

export type Library = { resumes: Readonly<Record<string, Resume>>; order: readonly string[] };

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

export async function unlockFeature(feature: Feature): Promise<boolean> {
  const plan = await currentPlan();
  if (plan === null || planIncludes(plan, feature)) return true;
  openFeaturePrompt(feature);
  return false;
}

const isSample = (resume: Resume | undefined) => resume?.source === "sample";

// Samples have a slot of their own (the backup route agrees), so trying one never uses up Free's resume.
export function ownResumeIds({ resumes, order }: Library): string[] {
  return order.filter((id) => resumes[id] !== undefined && !isSample(resumes[id]));
}

export function useOwnResumeCount(): number {
  return useStudioStore((s) => ownResumeIds(s).length);
}

export function noRoomForResume(): boolean {
  return ownResumeIds(useStudioStore.getState()).length >= RESUME_LIMITS.free;
}

// `replaceOld` trashes the old resume when called, so a flow can wait until it has the new one.
type AfterReplace = (replaceOld: () => boolean) => void;

// With exactly one resume of their own, Free can swap it out instead of upgrading.
export function askForResumeRoom(next?: AfterReplace): void {
  openUpgradePrompt("resumes", next ? replaceOffer(next) : undefined);
}

function replaceOffer(next: AfterReplace): ReplaceOffer | undefined {
  const state = useStudioStore.getState();
  const own = ownResumeIds(state);
  const old = own.length === 1 && own[0] ? state.resumes[own[0]] : undefined;
  if (!old) return undefined;
  return {
    title: resumeTitle(old),
    onReplace: () => next(() => trashWithUndo(old.id) || !noRoomForResume()),
  };
}

export async function roomForResume(retry?: () => void): Promise<boolean> {
  if (!noRoomForResume()) return true;
  const plan = await currentPlan();
  if (plan === null || hasProTools(plan)) return true;
  askForResumeRoom(
    retry &&
      ((replaceOld) => {
        if (replaceOld()) retry();
      }),
  );
  return false;
}

// A copy of the sample stays a sample, so it needs the sample's slot, not Free's resume.
export async function roomForCopyOf(resume: Resume): Promise<boolean> {
  if (!isSample(resume)) return roomForResume();
  const { resumes, order } = useStudioStore.getState();
  if (!order.some((id) => isSample(resumes[id]))) return true;
  return unlockProTool("resumes");
}

export async function roomForApplication(logged: number): Promise<boolean> {
  if (logged < FREE_APPLICATIONS) return true;
  return unlockProTool("tracker");
}
