import { beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  captureImmediate: vi.fn<(message: unknown) => Promise<void>>(async () => {}),
}));
const scheduled = vi.hoisted(() => ({ tasks: [] as Array<() => Promise<void>> }));

vi.mock("posthog-node", () => ({
  PostHog: class {
    captureImmediate = sdk.captureImmediate;
  },
}));
vi.mock("./config", () => ({
  posthogKey: () => "phc_test",
  posthogServerHost: () => "https://us.i.posthog.com",
}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => {
    scheduled.tasks.push(task);
  },
}));

const { resetServerAnalyticsForTests } = await import("./server");
const retention = await import("./retention");

type Sent = { distinctId: string; event: string; properties: Record<string, unknown> };

async function sent(): Promise<Array<Omit<Sent, "disableGeoip">>> {
  const tasks = scheduled.tasks.splice(0);
  await Promise.all(tasks.map((task) => task()));
  return sdk.captureImmediate.mock.calls.map(([message]) => {
    const { distinctId, event, properties } = message as Sent;
    return { distinctId, event, properties };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  scheduled.tasks = [];
  resetServerAnalyticsForTests();
});

describe("retention events", () => {
  it("dashboard_viewed names the section only", async () => {
    retention.trackDashboardView("user-1", "applications");
    expect(await sent()).toEqual([
      { distinctId: "user-1", event: "dashboard_viewed", properties: { section: "applications" } },
    ]);
  });

  it("returned carries the days away, and none on the first day", async () => {
    retention.trackReturn("user-1", "home", 3);
    retention.trackReturn("user-2", "studio", null);
    expect(await sent()).toEqual([
      { distinctId: "user-1", event: "returned", properties: { section: "home", days_away: 3 } },
      { distinctId: "user-2", event: "returned", properties: { section: "studio" } },
    ]);
  });

  it("email_clicked names the email and the link", async () => {
    retention.trackEmailClick("user-1", { campaign: "weekly_jobs", link: "tailor" });
    retention.trackEmailClick("user-1", { campaign: "tips" });
    expect(await sent()).toEqual([
      {
        distinctId: "user-1",
        event: "email_clicked",
        properties: { campaign: "weekly_jobs", link: "tailor" },
      },
      { distinctId: "user-1", event: "email_clicked", properties: { campaign: "tips" } },
    ]);
  });

  it("job_saved says where it was saved from", async () => {
    retention.trackJobSaved("user-1", "jobs");
    retention.trackJobSaved("user-1", "extension");
    expect((await sent()).map((event) => [event.event, event.properties])).toEqual([
      ["job_saved", { source: "jobs" }],
      ["job_saved", { source: "extension" }],
    ]);
  });

  it("application_status_changed sends one event per kind of move, with a count", async () => {
    retention.trackStatusChanges("user-1", [
      { from: "applied", to: "interview" },
      { from: "applied", to: "no_reply" },
      { from: "applied", to: "no_reply" },
      { from: "offer", to: "offer" },
    ]);
    expect(await sent()).toEqual([
      {
        distinctId: "user-1",
        event: "application_status_changed",
        properties: { from: "applied", to: "interview", count: 1 },
      },
      {
        distinctId: "user-1",
        event: "application_status_changed",
        properties: { from: "applied", to: "no_reply", count: 2 },
      },
    ]);
  });

  it("sends nothing when no status moved", async () => {
    retention.trackStatusChanges("user-1", []);
    expect(await sent()).toEqual([]);
  });

  it("tailored_copy_made, extension_connected and the view events carry no properties", async () => {
    retention.trackTailoredCopy("user-1");
    retention.trackExtensionConnected("user-1");
    retention.trackShareViewed("owner-1");
    retention.trackPortfolioViewed("owner-1");
    expect(await sent()).toEqual([
      { distinctId: "user-1", event: "tailored_copy_made", properties: {} },
      { distinctId: "user-1", event: "extension_connected", properties: {} },
      { distinctId: "owner-1", event: "share_link_viewed", properties: {} },
      { distinctId: "owner-1", event: "portfolio_viewed", properties: {} },
    ]);
  });

  it("portfolio_published names the design", async () => {
    retention.trackPortfolioPublished("user-1", "gazette");
    expect(await sent()).toEqual([
      { distinctId: "user-1", event: "portfolio_published", properties: { template: "gazette" } },
    ]);
  });
});
