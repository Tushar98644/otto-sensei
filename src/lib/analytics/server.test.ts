import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  constructed: vi.fn(),
  captureImmediate: vi.fn<(message: unknown) => Promise<void>>(async () => {}),
}));
const config = vi.hoisted(() => ({ key: "phc_test" as string | undefined }));
const scheduled = vi.hoisted(() => ({
  tasks: [] as Array<() => Promise<void>>,
  outsideRequest: false,
}));
const env = vi.hoisted(() => ({ ai: true }));

vi.mock("posthog-node", () => ({
  PostHog: class {
    constructor(key: string, options: unknown) {
      sdk.constructed(key, options);
    }
    captureImmediate = sdk.captureImmediate;
  },
}));
vi.mock("./config", () => ({
  posthogKey: () => config.key,
  posthogServerHost: () => "https://us.i.posthog.com",
}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => {
    if (scheduled.outsideRequest) throw new Error("`after` was called outside a request scope");
    scheduled.tasks.push(task);
  },
}));
vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/env")>()),
  aiEnabled: () => env.ai,
}));

const { ANONYMOUS_ID, captureBatch, captureServerEvent, resetServerAnalyticsForTests } =
  await import("./server");
const { trackAICall, trackMeteredCall, trackStructureCall } = await import("./ai");
const { AIError } = await import("@/lib/ai/types");

async function runScheduled() {
  const tasks = scheduled.tasks.splice(0);
  await Promise.all(tasks.map((task) => task()));
}

function sent(): Array<{ distinctId: string; event: string; properties: Record<string, unknown> }> {
  return sdk.captureImmediate.mock.calls.map(
    ([message]) =>
      message as { distinctId: string; event: string; properties: Record<string, unknown> },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  scheduled.tasks = [];
  scheduled.outsideRequest = false;
  config.key = "phc_test";
  env.ai = true;
  resetServerAnalyticsForTests();
});

describe("captureServerEvent", () => {
  it("does nothing without a key", async () => {
    config.key = undefined;
    captureServerEvent("user-1", "signed_up", {});
    await runScheduled();
    expect(sdk.constructed).not.toHaveBeenCalled();
    expect(scheduled.tasks).toHaveLength(0);
  });

  it("sends after the response, keyed by user id, without geolocation", async () => {
    captureServerEvent("user-1", "application_logged", { status: "applied" });
    expect(sdk.captureImmediate).not.toHaveBeenCalled();
    await runScheduled();
    expect(sdk.constructed).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({ disableGeoip: true }),
    );
    expect(sent()).toEqual([
      {
        distinctId: "user-1",
        event: "application_logged",
        properties: { status: "applied" },
        disableGeoip: true,
      },
    ]);
  });

  it("never sends an email or long text, even if a caller slips one in", async () => {
    const sneaky = { plan: "pro", email: "jane@example.com", note: "x".repeat(500) } as unknown as {
      plan: "pro";
    };
    captureServerEvent("user-1", "checkout_completed", sneaky, { set: { plan: "pro" } });
    await runScheduled();
    expect(sent()[0]?.properties).toEqual({ plan: "pro", $set: { plan: "pro" } });
  });

  it("doesn't build a person profile for anonymous events", async () => {
    captureServerEvent(ANONYMOUS_ID, "signed_up", {});
    await runScheduled();
    expect(sent()[0]?.properties).toEqual({ $process_person_profile: false });
  });

  it("sends at once outside a request", async () => {
    scheduled.outsideRequest = true;
    captureServerEvent("user-1", "signed_up", {});
    await vi.waitFor(() => expect(sdk.captureImmediate).toHaveBeenCalledOnce());
  });

  it("swallows a PostHog failure", async () => {
    sdk.captureImmediate.mockRejectedValueOnce(new Error("network down"));
    captureServerEvent("user-1", "signed_up", {});
    await expect(runScheduled()).resolves.toBeUndefined();
  });

  it("reuses one client", async () => {
    captureServerEvent("user-1", "signed_up", {});
    captureServerEvent("user-2", "signed_up", {});
    await runScheduled();
    expect(sdk.constructed).toHaveBeenCalledOnce();
    expect(sdk.captureImmediate).toHaveBeenCalledTimes(2);
  });
});

describe("trackMeteredCall", () => {
  const call = {
    userId: "user-1",
    path: "/api/fix",
    feature: "fix" as const,
    startedAt: Date.now() - 1_200,
  };

  it("sends the AI call and the funnel step on success", async () => {
    trackMeteredCall(call);
    await runScheduled();
    const [ai, step] = sent();
    expect(ai?.event).toBe("ai_call");
    expect(ai?.properties).toMatchObject({ task: "fix", outcome: "ok" });
    expect(typeof ai?.properties.model).toBe("string");
    expect(ai?.properties.latency_ms).toBeGreaterThanOrEqual(1_200);
    expect(step).toMatchObject({
      distinctId: "user-1",
      event: "line_fixed",
      properties: { demo: false },
    });
  });

  it("names the endpoint, not the allowance it draws on", async () => {
    trackMeteredCall({ ...call, path: "/api/summary" });
    await runScheduled();
    expect(sent().map((m) => m.event)).toEqual(["ai_call"]);
    expect(sent()[0]?.properties.task).toBe("summary");
  });

  it("maps tailor and letter to their funnel steps", async () => {
    trackMeteredCall({ ...call, path: "/api/tailor", feature: "tailor" });
    trackMeteredCall({ ...call, path: "/api/letter", feature: "letter" });
    await runScheduled();
    expect(sent().map((m) => m.event)).toEqual([
      "ai_call",
      "tailor_run",
      "ai_call",
      "letter_written",
    ]);
  });

  it("records the failure and no funnel step", async () => {
    trackMeteredCall(call, new AIError("refused", "declined"));
    trackMeteredCall(call, new Error("boom"));
    await runScheduled();
    expect(sent().map((m) => [m.event, m.properties.outcome])).toEqual([
      ["ai_call", "refused"],
      ["ai_call", "error"],
    ]);
  });

  it("sends and works out nothing without a key", async () => {
    config.key = undefined;
    trackMeteredCall(call);
    trackAICall({ userId: "user-1", task: "draft", aiTask: "fix", startedAt: Date.now() });
    trackStructureCall(Date.now(), true);
    await runScheduled();
    expect(scheduled.tasks).toHaveLength(0);
    expect(sdk.constructed).not.toHaveBeenCalled();
  });

  it("skips ai_call in demo mode but still counts the step", async () => {
    env.ai = false;
    trackMeteredCall(call);
    await runScheduled();
    expect(sent()).toEqual([
      expect.objectContaining({ event: "line_fixed", properties: { demo: true } }),
    ]);
  });
});

describe("trackAICall", () => {
  it("counts a signed-out call without a person profile", async () => {
    trackAICall(
      { userId: null, task: "draft", aiTask: "fix", startedAt: Date.now() },
      new AIError("unavailable", "down"),
    );
    await runScheduled();
    expect(sent()[0]).toMatchObject({
      distinctId: ANONYMOUS_ID,
      event: "ai_call",
      properties: { task: "draft", outcome: "unavailable", $process_person_profile: false },
    });
  });

  it("does nothing in demo mode", async () => {
    env.ai = false;
    trackAICall({ userId: "user-1", task: "draft", aiTask: "fix", startedAt: Date.now() });
    await runScheduled();
    expect(sdk.captureImmediate).not.toHaveBeenCalled();
  });
});

describe("trackStructureCall", () => {
  it("reports a fallback to the rules as its own outcome, anonymously", async () => {
    trackStructureCall(Date.now() - 5_000, false);
    await runScheduled();
    expect(sent()[0]).toMatchObject({
      distinctId: ANONYMOUS_ID,
      event: "ai_call",
      properties: { task: "structure", outcome: "fallback", $process_person_profile: false },
    });
  });

  it("does nothing without an AI key", async () => {
    env.ai = false;
    trackStructureCall(Date.now(), true);
    await runScheduled();
    expect(sdk.captureImmediate).not.toHaveBeenCalled();
  });
});

describe("config", () => {
  it("keeps analytics off under test, even with a key in the environment", async () => {
    const actual = await vi.importActual<typeof import("./config")>("./config");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_real");
    expect(actual.posthogKey()).toBeUndefined();
    vi.unstubAllEnvs();
  });
});

describe("captureBatch", () => {
  const posted = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () => new Response("{}"),
  );

  beforeEach(() => {
    posted.mockClear();
    vi.stubGlobal("fetch", posted);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does nothing without a key or without events", async () => {
    captureBatch([]);
    config.key = undefined;
    captureBatch([{ event: "$pageview", distinctId: "v1", properties: {} }]);
    await runScheduled();
    expect(posted).not.toHaveBeenCalled();
  });

  it("sends a whole beacon as one batch request, scrubbed, once the response is out", async () => {
    captureBatch([
      {
        event: "$pageview",
        distinctId: "v1",
        properties: { $pathname: "/s/abc123", note: "jane@example.com" },
      },
      { event: "resume_imported", distinctId: "v1", properties: { source: "pdf" } },
    ]);
    expect(posted).not.toHaveBeenCalled();
    await runScheduled();

    expect(posted).toHaveBeenCalledOnce();
    const [url, init] = posted.mock.calls[0] ?? [];
    expect(url).toBe("https://us.i.posthog.com/batch/");
    const body = JSON.parse(String(init?.body)) as {
      api_key: string;
      batch: Array<{ event: string; distinct_id: string; properties: Record<string, unknown> }>;
    };
    expect(body.api_key).toBe("phc_test");
    expect(
      body.batch.map(({ event, distinct_id, properties }) => ({ event, distinct_id, properties })),
    ).toEqual([
      {
        event: "$pageview",
        distinct_id: "v1",
        properties: { $pathname: "/s/:token", $lib: "otto-web", $geoip_disable: true },
      },
      {
        event: "resume_imported",
        distinct_id: "v1",
        properties: { source: "pdf", $lib: "otto-web", $geoip_disable: true },
      },
    ]);
  });

  it("keeps a failed send away from the caller", async () => {
    posted.mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    captureBatch([{ event: "$pageview", distinctId: "v1", properties: {} }]);
    await expect(runScheduled()).resolves.toBeUndefined();
  });
});
