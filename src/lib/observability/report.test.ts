import { DrizzleQueryError } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureRequestError: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => sdk);

const DSN = "https://public@o0.ingest.sentry.io/0";
const REQUEST = { path: "/api/draft", method: "POST", headers: {} };
const CONTEXT = { routerKind: "App Router", routePath: "/api/draft", routeType: "route" } as const;

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  for (const name of [
    "SENTRY_DSN",
    "NEXT_PUBLIC_SENTRY_DSN",
    "NEXT_PUBLIC_SENTRY_DEV",
    "NEXT_RUNTIME",
  ]) {
    vi.stubEnv(name, "");
  }
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("when Sentry is off", () => {
  it.each([
    ["no DSN, production", { NODE_ENV: "production" }],
    ["DSN, development without opt-in", { NODE_ENV: "development", SENTRY_DSN: DSN }],
    ["DSN, tests", { NODE_ENV: "test", SENTRY_DSN: DSN, NEXT_PUBLIC_SENTRY_DEV: "1" }],
  ])("does nothing (%s)", async (_label, envs) => {
    for (const [name, value] of Object.entries(envs)) vi.stubEnv(name, value);
    vi.stubEnv("NEXT_RUNTIME", "nodejs");

    const { log } = await import("@/lib/log");
    const { register, onRequestError } = await import("@/instrumentation");
    log.error("draft.failed", new Error("boom"), { route: "/api/draft" });
    await register();
    await onRequestError(new Error("boom"), REQUEST, CONTEXT);
    await settle();

    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
    expect(sdk.captureRequestError).not.toHaveBeenCalled();
  });

  it("keeps the browser off without the public DSN, even with a server DSN", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SENTRY_DSN", DSN);
    const { sentryEnabled } = await import("./config");
    expect(sentryEnabled("nodejs")).toBe(true);
    expect(sentryEnabled("browser")).toBe(false);
  });
});

describe("when Sentry is on", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SENTRY_DSN", DSN);
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc123");
    vi.stubEnv("VERCEL_ENV", "preview");
  });

  it("starts the server SDK with PII off and the scrubber in place", async () => {
    const { register } = await import("@/instrumentation");
    await register();

    expect(sdk.init).toHaveBeenCalledTimes(1);
    const options = sdk.init.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      dsn: DSN,
      enabled: true,
      environment: "preview",
      release: "abc123",
      sendDefaultPii: false,
    });
    expect(options).not.toHaveProperty("tracesSampleRate");
    expect(options.beforeSend({ message: "for maya@example.com" })).toEqual({
      message: "for [email]",
    });
    expect(options.beforeSendLog()).toBeNull();
  });

  it("starts in development only with the opt-in", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DEV", "1");
    const { sentryEnabled } = await import("./config");
    expect(sentryEnabled("nodejs")).toBe(true);
  });

  it("sends log.error with safe fields as tags", async () => {
    const { log } = await import("@/lib/log");
    const error = new TypeError("boom");
    log.error("draft.failed", error, {
      route: "/api/draft",
      status: 502,
      email: "maya@example.com",
    });

    await vi.waitFor(() => expect(sdk.captureException).toHaveBeenCalledTimes(1));
    expect(sdk.captureException).toHaveBeenCalledWith(error, {
      tags: { route: "/api/draft", status: "502", "log.event": "draft.failed" },
    });
  });

  it("sends the driver error, not the database error that lists every parameter", async () => {
    const cause = new Error("duplicate key value violates unique constraint");
    const { log } = await import("@/lib/log");
    log.error(
      "auth.request_code_failed",
      new DrizzleQueryError("insert ...", ["maya@example.com"], cause),
    );

    await vi.waitFor(() => expect(sdk.captureException).toHaveBeenCalledTimes(1));
    expect(sdk.captureException.mock.calls[0]?.[0]).toBe(cause);
  });

  it("wraps a thrown non-error so it isn't serialized whole", async () => {
    const { reportError } = await import("./report");
    reportError("import.failed", { resumeText: "Maya Chen ..." });

    await vi.waitFor(() => expect(sdk.captureException).toHaveBeenCalledTimes(1));
    const sent = sdk.captureException.mock.calls[0]?.[0];
    expect(sent).toBeInstanceOf(Error);
    expect((sent as Error).message).toBe("import.failed");
  });

  it("forwards errors that escape a request", async () => {
    const { onRequestError } = await import("@/instrumentation");
    const error = new Error("boom");
    await onRequestError(error, REQUEST, CONTEXT);
    expect(sdk.captureRequestError).toHaveBeenCalledWith(error, REQUEST, CONTEXT);
  });
});
