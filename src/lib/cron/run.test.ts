import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const reported = vi.hoisted(() => [] as unknown[][]);
vi.mock("@/lib/observability/report", () => ({
  reportError: (...args: unknown[]) => reported.push(args),
}));

const { runCronRoute } = await import("./run");

const SECRET = "a-long-enough-cron-secret";

function call() {
  return new Request("https://otto.example/api/cron/test", {
    headers: { authorization: `Bearer ${SECRET}` },
  });
}

beforeEach(() => {
  reported.length = 0;
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("runCronRoute", () => {
  it("reports a run where some steps failed, not only one that threw", async () => {
    const res = await runCronRoute(call(), "test", async () => ({
      stats: { sent: 3 },
      complete: true,
      failed: ["digest", "cleanup"],
    }));
    expect(res.status).toBe(500);
    expect(reported).toHaveLength(1);
    const [event, error, fields] = reported[0] ?? [];
    expect(event).toBe("cron.test.partial_failure");
    expect((error as Error).message).toBe("Cron steps failed: digest,cleanup");
    expect(fields).toMatchObject({ job: "test", sent: 3 });
  });

  it("reports nothing for a clean run", async () => {
    const res = await runCronRoute(call(), "test", async () => ({
      stats: {},
      complete: true,
      failed: [],
    }));
    expect(res.status).toBe(200);
    expect(reported).toEqual([]);
  });
});
