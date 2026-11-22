import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WAIT_FOR_IMPORT } from "@/lib/timing-testing";

type Report = (metric: { name: string; value: number }) => void;

const library = vi.hoisted(() => ({ reports: [] as Report[] }));
const sent = vi.hoisted(() => [] as unknown[][]);

vi.mock("web-vitals", () => {
  const on = (report: Report) => void library.reports.push(report);
  return { onLCP: on, onINP: on, onCLS: on, onTTFB: on };
});
vi.mock("./client", () => ({ trackVitals: (...args: unknown[]) => sent.push(args) }));

function stubPage() {
  const idle: Array<() => void> = [];
  const listeners: Array<() => void> = [];
  const document = {
    visibilityState: "visible",
    addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      listeners.splice(listeners.indexOf(listener), 1),
  };
  vi.stubGlobal("document", document);
  vi.stubGlobal("window", { requestIdleCallback: (run: () => void) => idle.push(run) });
  return {
    idle,
    listening: () => listeners.length,
    hide: () => {
      document.visibilityState = "hidden";
      for (const listener of [...listeners]) listener();
    },
  };
}

beforeEach(() => {
  vi.resetModules();
  library.reports = [];
  sent.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startVitals", () => {
  it("skips most page loads without loading anything", async () => {
    const page = stubPage();
    const { startVitals } = await import("./vitals");
    startVitals("/pricing", 0.2);
    expect(page.idle).toHaveLength(0);
  });

  it("loads the library once idle on a sampled load and sends one beacon as the page hides", async () => {
    const page = stubPage();
    const { startVitals } = await import("./vitals");
    startVitals("/resume-examples/[role]", 0.05);
    startVitals("/pricing", 0.05);
    expect(page.idle).toHaveLength(1);

    page.idle[0]?.();
    await vi.waitFor(() => expect(library.reports).toHaveLength(4), WAIT_FOR_IMPORT);
    const [lcp, inp, cls, ttfb] = library.reports;
    lcp?.({ name: "LCP", value: 1840.4 });
    inp?.({ name: "INP", value: 96 });
    cls?.({ name: "CLS", value: 0.04321 });
    ttfb?.({ name: "TTFB", value: 310.6 });

    page.hide();
    page.hide();
    expect(sent).toEqual([
      ["/resume-examples/[role]", { LCP: 1840, INP: 96, CLS: 0.043, TTFB: 311 }],
    ]);
    expect(page.listening()).toBe(0);
  });

  it("sends nothing when nothing was measured", async () => {
    const page = stubPage();
    const { startVitals } = await import("./vitals");
    startVitals("/", 0);
    page.idle[0]?.();
    await vi.waitFor(() => expect(library.reports).toHaveLength(4), WAIT_FOR_IMPORT);
    page.hide();
    expect(sent).toEqual([]);
  });
});
