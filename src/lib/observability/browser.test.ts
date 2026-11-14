import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  sentryOptions: vi.fn(() => ({ dsn: "https://public@o0.ingest.sentry.io/0" })),
}));
vi.mock("./sentry-browser", () => sdk);

type Listener = (event: unknown) => void;

function stubWindow(pathname: string) {
  const listeners = new Map<string, Set<Listener>>();
  const idle: Array<() => void> = [];
  const win = {
    location: { pathname, origin: "https://otto.example" },
    addEventListener: vi.fn((type: string, listener: Listener) => {
      listeners.set(type, (listeners.get(type) ?? new Set()).add(listener));
    }),
    removeEventListener: vi.fn((type: string, listener: Listener) => {
      listeners.get(type)?.delete(listener);
    }),
    requestIdleCallback: vi.fn((run: () => void) => {
      idle.push(run);
      return idle.length;
    }),
    setTimeout: vi.fn(),
  };
  vi.stubGlobal("window", win);
  return {
    win,
    fire: (type: string, event: unknown) => {
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
    listening: (type: string) => listeners.get(type)?.size ?? 0,
    runIdle: () => {
      for (const run of idle.splice(0)) run();
    },
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@o0.ingest.sentry.io/0");
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DEV", "");
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("early errors", () => {
  it("holds an uncaught error until the SDK is up, then sends it as unhandled", async () => {
    const page = stubWindow("/pricing");
    const { holdEarlyErrors } = await import("./browser");
    holdEarlyErrors();
    const error = new TypeError("boom");
    page.fire("error", { error });

    await vi.waitFor(() => expect(sdk.captureException).toHaveBeenCalledTimes(1));
    expect(sdk.init).toHaveBeenCalledOnce();
    expect(sdk.captureException).toHaveBeenCalledWith(error, {
      mechanism: { handled: false, type: "auto.browser.global_handlers.onerror" },
    });
    expect(page.listening("error")).toBe(0);
    expect(page.listening("unhandledrejection")).toBe(0);
  });

  it("holds unhandled rejections too", async () => {
    const page = stubWindow("/studio");
    const { holdEarlyErrors } = await import("./browser");
    holdEarlyErrors();
    const reason = new Error("save failed");
    page.fire("unhandledrejection", { reason });

    await vi.waitFor(() => expect(sdk.captureException).toHaveBeenCalledTimes(1));
    expect(sdk.captureException).toHaveBeenCalledWith(reason, {
      mechanism: { handled: false, type: "auto.browser.global_handlers.onunhandledrejection" },
    });
  });

  it("doesn't load the SDK for events without an error", async () => {
    const page = stubWindow("/");
    const { holdEarlyErrors } = await import("./browser");
    holdEarlyErrors();
    page.fire("error", { error: null, message: "Script error." });
    page.fire("unhandledrejection", { reason: "cancelled" });
    await settle();

    expect(sdk.init).not.toHaveBeenCalled();
    expect(page.listening("error")).toBe(1);
  });

  it("keeps what it holds when the SDK fails to load, and sends it on the next try", async () => {
    const page = stubWindow("/dashboard");
    const { holdEarlyErrors } = await import("./browser");
    holdEarlyErrors();
    vi.doMock("./sentry-browser", () => {
      throw new TypeError("Failed to fetch dynamically imported module");
    });
    const first = new Error("first");
    page.fire("error", { error: first });
    await settle();
    expect(sdk.init).not.toHaveBeenCalled();

    vi.doMock("./sentry-browser", () => sdk);
    const second = new Error("second");
    page.fire("error", { error: second });

    await vi.waitFor(() => expect(sdk.captureException).toHaveBeenCalledTimes(2));
    expect(sdk.captureException.mock.calls.map(([sent]) => sent)).toEqual([first, second]);
  });

  it("holds at most ten errors while the SDK can't load", async () => {
    const page = stubWindow("/p/jane");
    const { holdEarlyErrors, reportClientError } = await import("./browser");
    holdEarlyErrors();
    vi.doMock("./sentry-browser", () => {
      throw new TypeError("Failed to fetch dynamically imported module");
    });
    for (let i = 0; i < 12; i += 1) page.fire("error", { error: new Error(`error ${i}`) });
    await settle();

    vi.doMock("./sentry-browser", () => sdk);
    const shown = new Error("render failed");
    reportClientError(shown);

    await vi.waitFor(() => expect(sdk.captureException).toHaveBeenCalledWith(shown));
    expect(sdk.captureException).toHaveBeenCalledTimes(11);
  });

  it("sends errors from error screens through the same SDK", async () => {
    stubWindow("/p/jane");
    const { reportClientError } = await import("./browser");
    const error = new Error("render failed");
    reportClientError(error);

    await vi.waitFor(() => expect(sdk.captureException).toHaveBeenCalledWith(error));
    expect(sdk.init).toHaveBeenCalledWith({ dsn: "https://public@o0.ingest.sentry.io/0" });
  });
});

describe("startup", () => {
  it("loads the SDK on app pages once the page is idle", async () => {
    const page = stubWindow("/dashboard/jobs");
    await import("@/instrumentation-client");

    expect(page.win.requestIdleCallback).toHaveBeenCalledOnce();
    await settle();
    expect(sdk.init).not.toHaveBeenCalled();

    page.runIdle();
    await vi.waitFor(() => expect(sdk.init).toHaveBeenCalledOnce());
  });

  it("leaves public pages alone until the visitor moves into the app", async () => {
    const page = stubWindow("/s/abc123");
    const { onRouterTransitionStart } = await import("@/instrumentation-client");

    expect(page.listening("error")).toBe(1);
    expect(page.win.requestIdleCallback).not.toHaveBeenCalled();

    onRouterTransitionStart("/pricing");
    expect(page.win.requestIdleCallback).not.toHaveBeenCalled();

    onRouterTransitionStart("/studio");
    onRouterTransitionStart("/dashboard");
    expect(page.win.requestIdleCallback).toHaveBeenCalledOnce();
  });

  it("tries again on the next move into the app when the SDK fails to load", async () => {
    const page = stubWindow("/studio");
    vi.doMock("./sentry-browser", () => {
      throw new TypeError("Failed to fetch dynamically imported module");
    });
    const { onRouterTransitionStart } = await import("@/instrumentation-client");
    page.runIdle();
    await settle();
    expect(sdk.init).not.toHaveBeenCalled();

    vi.doMock("./sentry-browser", () => sdk);
    onRouterTransitionStart("/dashboard");
    expect(page.win.requestIdleCallback).toHaveBeenCalledTimes(2);
    page.runIdle();
    await vi.waitFor(() => expect(sdk.init).toHaveBeenCalledOnce());
  });

  it("falls back to a timer where idle callbacks don't exist", async () => {
    const page = stubWindow("/studio");
    vi.stubGlobal("window", { ...page.win, requestIdleCallback: undefined });
    const { loadSentrySoon } = await import("./browser");
    loadSentrySoon();

    expect(page.win.setTimeout).toHaveBeenCalledWith(expect.any(Function), 1_500);
  });

  it("does nothing without the public DSN", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    const page = stubWindow("/studio");
    await import("@/instrumentation-client");

    expect(page.win.addEventListener).not.toHaveBeenCalled();
    expect(page.win.requestIdleCallback).not.toHaveBeenCalled();
  });
});
