import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanId } from "@/config/plans";
import { createSampleResume } from "@/lib/resume/sample";
import { emptyResume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import {
  askForResumeRoom,
  ownResumeIds,
  roomForCopyOf,
  roomForResume,
  unlockFeature,
  unlockProTool,
} from "./pro-tools";
import type { ReplaceOffer } from "./upgrade-dialog";
import { openFeaturePrompt, openUpgradePrompt } from "./upgrade-prompt";
import { currentPlan } from "./use-me";

vi.mock("./use-me", () => ({ currentPlan: vi.fn(), useMe: vi.fn() }));
vi.mock("./upgrade-prompt", () => ({ openUpgradePrompt: vi.fn(), openFeaturePrompt: vi.fn() }));

const onPlan = (plan: PlanId | null) => vi.mocked(currentPlan).mockResolvedValue(plan);

function offered(): ReplaceOffer | undefined {
  return vi.mocked(openUpgradePrompt).mock.calls.at(-1)?.[1];
}

beforeEach(() => {
  vi.mocked(openUpgradePrompt).mockClear();
  vi.mocked(openFeaturePrompt).mockClear();
  vi.mocked(currentPlan).mockReset();
  useStudioStore.getState().clearAll();
});

describe("unlockProTool", () => {
  it("offers the trial on Free and stops the action", async () => {
    onPlan("free");
    expect(await unlockProTool("word")).toBe(false);
    expect(openUpgradePrompt).toHaveBeenCalledExactlyOnceWith("word");
  });

  it("lets Pro, Max and the trial (a Pro plan) straight through", async () => {
    for (const plan of ["pro", "max"] as const) {
      onPlan(plan);
      expect(await unlockProTool("formats")).toBe(true);
    }
    expect(openUpgradePrompt).not.toHaveBeenCalled();
  });

  it("leaves it to the server when the plan can't be read", async () => {
    onPlan(null);
    expect(await unlockProTool("share")).toBe(true);
    expect(openUpgradePrompt).not.toHaveBeenCalled();
  });
});

describe("roomForResume", () => {
  it("lets the first resume in without asking", async () => {
    expect(await roomForResume()).toBe(true);
    expect(currentPlan).not.toHaveBeenCalled();
  });

  it("offers the trial for a second one on Free, and not on Pro", async () => {
    useStudioStore.getState().addResume(emptyResume(1_000));
    onPlan("free");
    expect(await roomForResume()).toBe(false);
    expect(openUpgradePrompt).toHaveBeenCalledExactlyOnceWith("resumes", undefined);
    onPlan("pro");
    expect(await roomForResume()).toBe(true);
  });

  it("never counts a sample against Free's one resume", async () => {
    const sample = createSampleResume(1_000);
    useStudioStore.getState().addResume(sample);
    onPlan("free");
    expect(await roomForResume()).toBe(true);
    expect(openUpgradePrompt).not.toHaveBeenCalled();
    expect(ownResumeIds(useStudioStore.getState())).toEqual([]);
  });

  it("offers to replace the one resume, which moves it to Recently deleted and carries on", async () => {
    const old = { ...emptyResume(1_000), title: "Old one" };
    useStudioStore.getState().addResume(old);
    useStudioStore.getState().addResume(createSampleResume(2_000));
    onPlan("free");
    const retry = vi.fn();
    expect(await roomForResume(retry)).toBe(false);
    const offer = offered();
    expect(offer?.title).toBe("Old one");

    offer?.onReplace();
    const state = useStudioStore.getState();
    expect(state.resumes[old.id]).toBeUndefined();
    expect(state.trash.map((entry) => entry.resume.id)).toEqual([old.id]);
    expect(retry).toHaveBeenCalledOnce();
    expect(await roomForResume()).toBe(true);
  });

  it("offers no replacement without a next step, or with more than one resume to choose from", async () => {
    useStudioStore.getState().addResume(emptyResume(1_000));
    onPlan("free");
    await roomForResume();
    expect(offered()).toBeUndefined();

    useStudioStore.getState().addResume(emptyResume(2_000));
    await roomForResume(() => {});
    expect(offered()).toBeUndefined();
  });

  it("keeps the old resume until the next step has the new one, so a closed picker loses nothing", () => {
    const old = emptyResume(1_000);
    useStudioStore.getState().addResume(old);
    const next = vi.fn<(replaceOld: () => boolean) => void>();
    askForResumeRoom(next);
    offered()?.onReplace();
    expect(useStudioStore.getState().resumes[old.id]).toBeDefined();

    const replaceOld = next.mock.calls[0]?.[0];
    expect(replaceOld?.()).toBe(true);
    expect(useStudioStore.getState().resumes[old.id]).toBeUndefined();
    expect(replaceOld?.()).toBe(true);
  });
});

describe("roomForCopyOf", () => {
  it("gives a copy of the sample the sample's slot, beside Free's one resume", async () => {
    const sample = createSampleResume(1_000);
    const mine = emptyResume(2_000);
    useStudioStore.getState().addResume(mine);
    onPlan("free");
    expect(await roomForCopyOf(sample)).toBe(true);
    expect(openUpgradePrompt).not.toHaveBeenCalled();
    expect(await roomForCopyOf(mine)).toBe(false);
    expect(openUpgradePrompt).toHaveBeenLastCalledWith("resumes", undefined);

    useStudioStore.getState().addResume(sample);
    expect(await roomForCopyOf(sample)).toBe(false);
    expect(openUpgradePrompt).toHaveBeenLastCalledWith("resumes");
    onPlan("pro");
    expect(await roomForCopyOf(sample)).toBe(true);
  });
});

describe("unlockFeature", () => {
  it("offers the trial before Free starts a draft, and lets the trial and Pro through", async () => {
    onPlan("free");
    expect(await unlockFeature("draft")).toBe(false);
    expect(openFeaturePrompt).toHaveBeenCalledExactlyOnceWith("draft");
    for (const plan of ["pro", "max", null] as const) {
      onPlan(plan);
      expect(await unlockFeature("draft")).toBe(true);
    }
    expect(openFeaturePrompt).toHaveBeenCalledOnce();
  });
});
