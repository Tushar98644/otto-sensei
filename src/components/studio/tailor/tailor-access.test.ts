import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentPlan, meSnapshot, type Me, type MeState } from "@/components/account/use-me";
import { PLANS, type PlanId, type UsageSnapshot } from "@/config/plans";
import { canTailor, tailorIncluded } from "./tailor-access";

vi.mock("@/components/account/use-me", () => ({ currentPlan: vi.fn(), meSnapshot: vi.fn() }));

function usage(plan: PlanId, tailor: { used: number; limit: number }): UsageSnapshot {
  const limits = PLANS[plan].limits;
  const snapshot = Object.fromEntries(
    Object.entries(limits).map(([feature, limit]) => [feature, { used: 0, limit }]),
  ) as UsageSnapshot;
  return { ...snapshot, tailor };
}

function onAccount(plan: PlanId | null, tailor?: { used: number; limit: number }) {
  vi.mocked(currentPlan).mockResolvedValue(plan);
  const me = plan
    ? ({ user: null, usage: tailor ? usage(plan, tailor) : null } as unknown as Me)
    : null;
  vi.mocked(meSnapshot).mockReturnValue({ status: "ready", me } satisfies MeState);
}

beforeEach(() => {
  vi.mocked(currentPlan).mockReset();
  vi.mocked(meSnapshot).mockReset();
});

describe("tailorIncluded", () => {
  it("gives Free and signed-out visitors the free word check", async () => {
    onAccount("free", { used: 0, limit: 0 });
    expect(await tailorIncluded()).toBe(false);
    onAccount("free");
    expect(await tailorIncluded()).toBe(false);
  });

  it("tailors on Pro, on the trial (a Pro plan) and on Max, even with the allowance used up", async () => {
    onAccount("pro", { used: 0, limit: 3 });
    expect(await tailorIncluded()).toBe(true);
    onAccount("pro", { used: 3, limit: 3 });
    expect(await tailorIncluded()).toBe(true);
    onAccount("max", { used: 0, limit: 30 });
    expect(await tailorIncluded()).toBe(true);
  });

  it("leaves it to the server when the plan can't be read", async () => {
    onAccount(null);
    expect(await tailorIncluded()).toBe(true);
  });

  it("tailors on Free while invite extras are left, then goes back to the free check", async () => {
    onAccount("free", { used: 0, limit: 2 });
    expect(await tailorIncluded()).toBe(true);
    onAccount("free", { used: 2, limit: 2 });
    expect(await tailorIncluded()).toBe(false);
  });
});

describe("canTailor", () => {
  it("decides from the plan first, then the allowance", () => {
    expect(canTailor("pro", null)).toBe(true);
    expect(canTailor(null, null)).toBe(true);
    expect(canTailor("free", undefined)).toBe(false);
    expect(canTailor("free", { used: 1, limit: 2 })).toBe(true);
  });
});
