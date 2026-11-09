import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanId } from "@/config/plans";
import { emptyResume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { roomForResume, unlockProTool } from "./pro-tools";
import { openUpgradePrompt } from "./upgrade-prompt";
import { currentPlan } from "./use-me";

vi.mock("./use-me", () => ({ currentPlan: vi.fn(), useMe: vi.fn() }));
vi.mock("./upgrade-prompt", () => ({ openUpgradePrompt: vi.fn() }));

const onPlan = (plan: PlanId | null) => vi.mocked(currentPlan).mockResolvedValue(plan);

beforeEach(() => {
  vi.mocked(openUpgradePrompt).mockClear();
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
    expect(openUpgradePrompt).toHaveBeenCalledExactlyOnceWith("resumes");
    onPlan("pro");
    expect(await roomForResume()).toBe(true);
  });
});
