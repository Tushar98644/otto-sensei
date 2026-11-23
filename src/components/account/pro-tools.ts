"use client";

import { trashWithUndo } from "@/components/ui/trash-with-undo";
import {
  applicationLimit,
  hasProTools,
  isPaidPlan,
  MAX_RESUMES_PER_USER,
  planIncludes,
  resumeLimit,
  type Feature,
  type PlanId,
  type ProTool,
} from "@/config/plans";
import { trialHeadline } from "@/lib/billing/prices";
import { resumeTitle } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import type { ReplaceOffer } from "./upgrade-dialog";
import { openFeaturePrompt, openFullPrompt, openUpgradePrompt } from "./upgrade-prompt";
import { currentPlan, useMe } from "./use-me";

// The routes enforce Pro tools; these only spare a refused request by offering the trial first.

export type Library = { resumes: Readonly<Record<string, Resume>>; order: readonly string[] };

// Signed out counts as Free, as currentPlan does; null until the account is read.
export function usePlan(): PlanId | null {
  const { me } = useMe();
  if (!me) return null;
  return me.user?.plan ?? "free";
}

export function useProTools(): boolean | null {
  const plan = usePlan();
  return plan === null ? null : hasProTools(plan);
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

// The backup route's count: samples apart from the rest against the plan's number, and all of them against the ceiling.
function resumeCounts({ resumes, order }: Library): { own: number; samples: number } {
  const live = order.filter((id) => resumes[id] !== undefined);
  const samples = live.filter((id) => isSample(resumes[id])).length;
  return { own: live.length - samples, samples };
}

export function hasResumeRoom(library: Library, plan: PlanId, sample = false): boolean {
  const { own, samples } = resumeCounts(library);
  return (sample ? samples : own) < resumeLimit(plan) && own + samples < MAX_RESUMES_PER_USER;
}

// Free's number is the smallest, so room there is room on every plan and the plan needn't be read.
export function noRoomForResume(plan: PlanId = "free"): boolean {
  return !hasResumeRoom(useStudioStore.getState(), plan);
}

function askPaidForRoom(sample: boolean): void {
  const { own, samples } = resumeCounts(useStudioStore.getState());
  openFullPrompt("resumes", sample ? samples : own);
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
  if (plan === null || !noRoomForResume(plan)) return true;
  if (isPaidPlan(plan)) {
    askPaidForRoom(false);
    return false;
  }
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
  if (hasResumeRoom(useStudioStore.getState(), "free", true)) return true;
  const plan = await currentPlan();
  if (plan === null || hasResumeRoom(useStudioStore.getState(), plan, true)) return true;
  if (isPaidPlan(plan)) askPaidForRoom(true);
  else openUpgradePrompt("resumes");
  return false;
}

export async function roomForApplication(logged: number): Promise<boolean> {
  if (logged < applicationLimit("free")) return true;
  const plan = await currentPlan();
  if (plan === null || logged < applicationLimit(plan)) return true;
  if (isPaidPlan(plan)) openFullPrompt("tracker", logged);
  else openUpgradePrompt("tracker");
  return false;
}
