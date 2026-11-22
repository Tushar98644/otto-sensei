import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetBurstLimitsForTests } from "@/lib/burst-limit";
import { envelopeTarget } from "./tunnel";

const DSN = "https://abc123@o42.ingest.us.sentry.io/4242";

function envelope(dsn: string | undefined, event = { message: "boom" }): string {
  const header = JSON.stringify({ event_id: "e1", ...(dsn ? { dsn } : {}) });
  return `${header}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
}

describe("envelopeTarget", () => {
  it("sends our own project's envelopes to its ingest address", () => {
    expect(envelopeTarget(envelope(DSN), DSN)).toBe(
      "https://o42.ingest.us.sentry.io/api/4242/envelope/",
    );
  });

  it("keeps a path the DSN puts before the project", () => {
    const own = "https://key@sentry.example.com/relay/7";
    expect(envelopeTarget(envelope(own), own)).toBe(
      "https://sentry.example.com/relay/api/7/envelope/",
    );
  });

  it.each([
    ["another project", "https://abc123@o42.ingest.us.sentry.io/9999"],
    ["another host", "https://abc123@evil.example.com/4242"],
    ["another key", "https://other@o42.ingest.us.sentry.io/4242"],
    ["no DSN", undefined],
  ])("refuses %s", (_label, dsn) => {
    expect(envelopeTarget(envelope(dsn), DSN)).toBeNull();
  });

  it("refuses everything when we have no DSN, and junk headers", () => {
    expect(envelopeTarget(envelope(DSN), undefined)).toBeNull();
    expect(envelopeTarget("not json\n{}", DSN)).toBeNull();
  });
});

describe("POST /api/relay", () => {
  const upstream = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
    async () =>
      new Response(null, { status: 200, headers: { "x-sentry-rate-limits": "60:error:org" } }),
  );

  beforeEach(() => {
    vi.resetModules();
    resetBurstLimitsForTests();
    upstream.mockClear();
    vi.stubGlobal("fetch", upstream);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  async function relay(body: string, headers: Record<string, string> = {}) {
    const { POST } = await import("@/app/api/relay/route");
    return POST(
      new Request("https://otto.example/api/relay", {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8", ...headers },
        body,
      }),
    );
  }

  it("forwards our envelope as it came, without the visitor's address, and passes Sentry's limits back", async () => {
    const body = envelope(DSN);
    const res = await relay(body, { "x-forwarded-for": "203.0.113.7", cookie: "sb=1" });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-sentry-rate-limits")).toBe("60:error:org");
    const [url, init] = upstream.mock.calls[0] ?? [];
    expect(url).toBe("https://o42.ingest.us.sentry.io/api/4242/envelope/");
    expect(new TextDecoder().decode(init?.body as Uint8Array)).toBe(body);
    expect(init?.headers).toEqual({ "Content-Type": "application/x-sentry-envelope" });
  });

  it("refuses other projects, other sites and oversized bodies", async () => {
    expect((await relay(envelope("https://abc123@evil.example.com/4242"))).status).toBe(400);
    expect((await relay(envelope(DSN), { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await relay(envelope(DSN, { message: "x".repeat(300_000) }))).status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("limits how often one address can send", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 31; i += 1) {
      statuses.push((await relay(envelope(DSN), { "x-forwarded-for": "203.0.113.7" })).status);
    }
    expect(statuses.filter((status) => status === 200)).toHaveLength(30);
    expect(statuses[30]).toBe(429);
  });

  it("is not there without a public DSN", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    expect((await relay(envelope(DSN))).status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("answers 502 when Sentry can't be reached", async () => {
    upstream.mockRejectedValueOnce(new Error("timeout"));
    expect((await relay(envelope(DSN))).status).toBe(502);
  });
});
