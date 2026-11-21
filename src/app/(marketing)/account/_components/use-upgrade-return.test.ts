import { beforeEach, describe, expect, it, vi } from "vitest";
import { readArrival } from "./use-account-arrival";
import { useUpgradeReturn } from "./use-upgrade-return";
import { planArrived } from "./use-upgrade-watch";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  toast: vi.fn(),
  ref: { current: false },
}));

// Effects run as soon as the hook is called, and one ref lives across calls, like one mounted page.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useEffect: (effect: () => void) => effect(),
  useRef: () => mocks.ref,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/components/ui/toast", () => ({ toast: mocks.toast }));

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.toast.mockReset();
  mocks.ref.current = false;
});

describe("useUpgradeReturn", () => {
  it("goes back to the page and says why", () => {
    useUpgradeReturn("/studio", "You're on Pro. Let's pick up where you left off.");
    expect(mocks.replace).toHaveBeenCalledWith("/studio");
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "You're on Pro. Let's pick up where you left off.",
      variant: "success",
    });
  });

  it("goes back only once, however often the page renders", () => {
    useUpgradeReturn("/dashboard/jobs", "You're on Max. Let's pick up where you left off.");
    useUpgradeReturn("/dashboard/jobs", "You're on Max. Let's pick up where you left off.");
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
  });

  it.each<[string | null, string | null]>([
    ["/studio", null],
    [null, "You're on Pro. Let's pick up where you left off."],
  ])("stays on Account with page %s and message %s", (next, message) => {
    useUpgradeReturn(next, message);
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });
});

describe("planArrived", () => {
  it("counts the bought plan or a bigger one", () => {
    expect(planArrived("pro", "pro")).toBe(true);
    expect(planArrived("max", "pro")).toBe(true);
    expect(planArrived("pro", "max")).toBe(false);
    expect(planArrived("free", "pro")).toBe(false);
  });

  it("without a named plan, counts any paid plan", () => {
    expect(planArrived("pro", null)).toBe(true);
    expect(planArrived("free", null)).toBe(false);
  });
});

describe("readArrival", () => {
  const read = (query: string) => readArrival(new URLSearchParams(query));

  it("reads the page to go back to after an upgrade", () => {
    expect(read("checkout=success&plan=pro&next=%2Fstudio%3Fstep%3Dtailor")).toMatchObject({
      checkout: "success",
      plan: "pro",
      next: "/studio?step=tailor",
    });
    expect(read("upgrade=1&plan=max&interval=year&next=/dashboard/letters")).toMatchObject({
      upgrade: true,
      plan: "max",
      interval: "year",
      next: "/dashboard/letters",
    });
  });

  it.each([
    ["https%3A%2F%2Fevil.example"],
    ["%2F%2Fevil.example"],
    ["%2F%5Cevil.example"],
    ["%2F%09%2Fevil.example"],
    ["javascript%3Aalert(1)"],
    ["%2Faccount%3Fupgrade%3D1"],
    ["%2Fdashboard%2Faccount"],
    ["%2Flogin"],
    [""],
  ])("drops next=%s, which isn't a page to go back to", (next) => {
    expect(read(`checkout=success&plan=pro&next=${next}`).next).toBeNull();
  });

  it("has no page to go back to when the link names none", () => {
    expect(read("checkout=success&plan=pro").next).toBeNull();
  });
});
