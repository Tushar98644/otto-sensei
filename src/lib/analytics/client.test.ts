import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CaptureResult } from "posthog-js";

const sdk = vi.hoisted(() => {
  const state = { distinctId: "anon-device-1", identified: false };
  return {
    state,
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn((id: string) => {
      state.distinctId = id;
      state.identified = true;
    }),
    reset: vi.fn(() => {
      state.distinctId = "anon-device-2";
      state.identified = false;
    }),
    get_distinct_id: vi.fn(() => state.distinctId),
    _isIdentified: vi.fn(() => state.identified),
  };
});

const config = vi.hoisted(() => ({ key: "phc_test" as string | undefined }));

vi.mock("posthog-js", () => ({ default: sdk }));
vi.mock("./config", () => ({
  posthogKey: () => config.key,
  posthogHost: () => "https://us.i.posthog.com",
}));

type Client = typeof import("./client");

function stubBrowser(navigator: Record<string, unknown> = { doNotTrack: null }) {
  vi.stubGlobal("window", {
    navigator,
    requestIdleCallback: (run: () => void) => run(),
    setTimeout: (run: () => void) => run(),
  });
}

async function loadClient(): Promise<Client> {
  const client = await import("./client");
  client.resetAnalyticsForTests();
  return client;
}

// Lets the dynamic import and the promise chain behind every call settle.
async function settle() {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  sdk.state.distinctId = "anon-device-1";
  sdk.state.identified = false;
  config.key = "phc_test";
  stubBrowser();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("without a key", () => {
  it("is off and never loads the SDK", async () => {
    config.key = undefined;
    const client = await loadClient();
    expect(client.analyticsEnabled()).toBe(false);
    client.startAnalytics();
    client.track("landing_viewed");
    client.identifyUser("user-1", "free");
    await settle();
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
  });
});

describe("on the server", () => {
  it("does nothing", async () => {
    vi.stubGlobal("window", undefined);
    const client = await loadClient();
    expect(client.analyticsEnabled()).toBe(false);
    client.track("landing_viewed");
    await settle();
    expect(sdk.init).not.toHaveBeenCalled();
  });
});

describe("Do Not Track and Global Privacy Control", () => {
  it.each([{ doNotTrack: "1" }, { doNotTrack: null, globalPrivacyControl: true }])(
    "send nothing for %o",
    async (navigator) => {
      stubBrowser(navigator);
      const client = await loadClient();
      client.startAnalytics();
      client.track("resume_imported", { source: "pdf" });
      await settle();
      expect(sdk.init).not.toHaveBeenCalled();
      expect(sdk.capture).not.toHaveBeenCalled();
    },
  );
});

describe("init", () => {
  it("turns off autocapture, recordings, pageviews and cookies", async () => {
    const client = await loadClient();
    client.startAnalytics();
    await settle();
    expect(sdk.init).toHaveBeenCalledOnce();
    const [key, options] = sdk.init.mock.calls[0] ?? [];
    expect(key).toBe("phc_test");
    expect(options).toMatchObject({
      api_host: "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: true,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      respect_dnt: true,
      persistence: "localStorage",
      person_profiles: "identified_only",
      save_referrer: false,
    });
  });

  it("scrubs what the SDK adds before anything is sent", async () => {
    const client = await loadClient();
    client.startAnalytics();
    await settle();
    const options = sdk.init.mock.calls[0]?.[1] as { before_send: (event: CaptureResult) => CaptureResult };
    const event = {
      uuid: "e1",
      event: "resume_imported",
      properties: {
        source: "pdf",
        $current_url: "https://otto.example/s/secret-token?email=jane@example.com",
        typed: "jane@example.com",
        resume: { name: "Jane Doe" },
      },
      $set: { $current_url: "https://otto.example/login?next=/studio" },
    } as unknown as CaptureResult;
    expect(options.before_send(event)).toEqual({
      uuid: "e1",
      event: "resume_imported",
      properties: { source: "pdf", $current_url: "https://otto.example/s/:token" },
      $set: { $current_url: "https://otto.example/login" },
    });
  });
});

describe("track", () => {
  it("sends the event with its props once the SDK is up", async () => {
    const client = await loadClient();
    client.track("recruiter_view_seen", { checks: 12, problems: 3, warnings: 2 });
    await settle();
    expect(sdk.capture).toHaveBeenCalledWith("recruiter_view_seen", { checks: 12, problems: 3, warnings: 2 });
  });

  it("drops a personal value that slipped past the types", async () => {
    const client = await loadClient();
    const sneaky = { source: "pdf", email: "jane@example.com" } as unknown as { source: "pdf" };
    client.track("resume_imported", sneaky);
    await settle();
    expect(sdk.capture).toHaveBeenCalledWith("resume_imported", { source: "pdf" });
  });

  it("loads the SDK only once", async () => {
    const client = await loadClient();
    client.startAnalytics();
    client.track("landing_viewed");
    client.track("upgrade_clicked");
    await settle();
    expect(sdk.init).toHaveBeenCalledOnce();
    expect(sdk.capture).toHaveBeenCalledTimes(2);
  });
});

describe("identity", () => {
  it("identifies by user id only and counts one sign-in", async () => {
    const client = await loadClient();
    client.identifyUser("user-1", "free");
    await settle();
    expect(sdk.identify).toHaveBeenCalledWith("user-1", { plan: "free" });
    expect(sdk.capture).toHaveBeenCalledWith("signed_in", { plan: "free" });

    // A later page load for the same person is not another sign-in.
    client.identifyUser("user-1", "free");
    await settle();
    expect(sdk.identify).toHaveBeenCalledOnce();
    expect(sdk.capture).toHaveBeenCalledOnce();
  });

  it("holds an identity seen before the SDK loads", async () => {
    const client = await loadClient();
    client.identifyUser("user-1", "pro");
    client.startAnalytics();
    await settle();
    expect(sdk.init).toHaveBeenCalledOnce();
    expect(sdk.identify).toHaveBeenCalledOnce();
    expect(sdk.identify).toHaveBeenCalledWith("user-1", { plan: "pro" });
  });

  it("gives a signed-out browser a fresh anonymous id", async () => {
    sdk.state.distinctId = "user-1";
    sdk.state.identified = true;
    const client = await loadClient();
    client.resetUser();
    await settle();
    expect(sdk.reset).toHaveBeenCalledOnce();
    expect(sdk.state.distinctId).toBe("anon-device-2");
  });

  it("leaves an anonymous visitor's id alone", async () => {
    const client = await loadClient();
    client.resetUser();
    await settle();
    expect(sdk.reset).not.toHaveBeenCalled();
  });

  it("never merges a second account into the first", async () => {
    sdk.state.distinctId = "user-1";
    sdk.state.identified = true;
    const client = await loadClient();
    client.identifyUser("user-2", "free");
    await settle();
    expect(sdk.reset).toHaveBeenCalledOnce();
    expect(sdk.identify).toHaveBeenCalledWith("user-2", { plan: "free" });
  });
});
