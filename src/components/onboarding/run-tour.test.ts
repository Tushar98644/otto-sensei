import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import onboarding from "@/i18n/messages/en/onboarding";
import type { TourStop } from "./tours";

const root = vi.hoisted(() => ({ render: vi.fn(), unmount: vi.fn() }));

vi.mock("react-dom/client", () => ({ createRoot: () => root }));

function box(top: number, bottom: number) {
  return { top, bottom, left: 40, width: 120, height: bottom - top };
}

function stubPage({ targetTop = 200, topBar = false } = {}) {
  const host = { dataset: {}, remove: vi.fn() };
  const target = {
    getBoundingClientRect: () => box(targetTop, targetTop + 44),
    closest: () => null,
    scrollIntoView: vi.fn(),
  };
  const header = { contains: () => false, getBoundingClientRect: () => box(0, 64) };
  vi.stubGlobal("document", {
    createElement: () => host,
    body: { append: vi.fn() },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelectorAll: (selector: string) => (topBar && selector.includes("header") ? [header] : []),
  });
  vi.stubGlobal("window", {
    innerHeight: 800,
    innerWidth: 1200,
    matchMedia: () => ({ matches: true }),
    getComputedStyle: () => ({ position: "sticky" }),
  });
  return { host, target };
}

function stop(target: unknown): TourStop {
  return {
    id: "fix-with-otto",
    title: "Fix a line with Otto",
    body: "Tags show lines that need work.",
    target: () => target as Element,
    shape: "control",
    screen: "fix",
  };
}

beforeEach(() => {
  root.render.mockClear();
  root.unmount.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startTour", () => {
  it("shows the first tip without scrolling when its target is already in view", async () => {
    const { target } = stubPage();
    const { startTour } = await import("./run-tour");
    const onShown = vi.fn();
    const stopTour = startTour({
      labels: onboarding.tip,
      stops: [stop(target)],
      onShown,
      onEnd: vi.fn(),
    });

    expect(stopTour).toBeTypeOf("function");
    expect(root.render).toHaveBeenCalledTimes(1);
    expect(onShown).toHaveBeenCalledTimes(1);
    expect(target.scrollIntoView).not.toHaveBeenCalled();
    stopTour?.();
  });

  it("scrolls to a target the sticky top bar covers", async () => {
    const { target } = stubPage({ targetTop: 40, topBar: true });
    const { startTour } = await import("./run-tour");
    const stopTour = startTour({
      labels: onboarding.tip,
      stops: [stop(target)],
      onShown: vi.fn(),
      onEnd: vi.fn(),
    });

    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
    stopTour?.();
  });

  it("unmounts once the caller returns, so ending inside a React cleanup doesn't warn", async () => {
    const { host, target } = stubPage();
    const { startTour } = await import("./run-tour");
    const onEnd = vi.fn();
    const stopTour = startTour({
      labels: onboarding.tip,
      stops: [stop(target)],
      onShown: vi.fn(),
      onEnd,
    });

    stopTour?.();
    expect(host.remove).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith({ finished: false, reached: 1, total: 1 });
    expect(root.unmount).not.toHaveBeenCalled();

    await Promise.resolve();
    expect(root.unmount).toHaveBeenCalledTimes(1);

    stopTour?.();
    await Promise.resolve();
    expect(root.unmount).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
