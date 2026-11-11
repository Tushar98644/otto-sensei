import { afterEach, describe, expect, it, vi } from "vitest";
import { resetEnvForTests } from "@/lib/env";
import { rejectCrossSite, rejectNonJson } from "./route-guards";

function post(headers: Record<string, string>, url = "https://otto.example/api/import"): Request {
  return new Request(url, { method: "POST", headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
  resetEnvForTests();
});

describe("rejectCrossSite", () => {
  it("lets same-origin, same-site and user-started browser requests through", () => {
    for (const site of ["same-origin", "same-site", "none"]) {
      expect(rejectCrossSite(post({ "sec-fetch-site": site }))).toBeNull();
    }
  });

  it("refuses requests another website's page sent", async () => {
    const res = rejectCrossSite(post({ "sec-fetch-site": "cross-site", origin: "https://evil.example" }));
    expect(res?.status).toBe(403);
    expect(await res?.json()).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });

  it("trusts Sec-Fetch-Site over Origin when a browser sends both", () => {
    expect(rejectCrossSite(post({ "sec-fetch-site": "same-origin", origin: "https://otto.example" }))).toBeNull();
    expect(rejectCrossSite(post({ "sec-fetch-site": "cross-site", origin: "https://otto.example" }))).not.toBeNull();
  });

  it("checks Origin against this host for browsers without Sec-Fetch-Site", () => {
    expect(rejectCrossSite(post({ origin: "https://otto.example" }))).toBeNull();
    expect(rejectCrossSite(post({ origin: "https://OTTO.example:443" }))).toBeNull();
    expect(rejectCrossSite(post({ origin: "https://evil.example" }))?.status).toBe(403);
    expect(rejectCrossSite(post({ origin: "https://otto.example.evil.example" }))?.status).toBe(403);
    expect(rejectCrossSite(post({ origin: "null" }))?.status).toBe(403);
  });

  it("accepts the host a proxy forwarded and the configured public URL", () => {
    const internal = "http://10.0.0.5:3000/api/import";
    expect(
      rejectCrossSite(post({ origin: "https://otto.example", "x-forwarded-host": "otto.example" }, internal)),
    ).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.otto.example");
    resetEnvForTests();
    expect(rejectCrossSite(post({ origin: "https://www.otto.example" }, internal))).toBeNull();
    expect(rejectCrossSite(post({ origin: "https://evil.example" }, internal))?.status).toBe(403);
  });

  it("lets non-browser callers through", () => {
    expect(rejectCrossSite(post({}))).toBeNull();
  });
});

describe("rejectNonJson", () => {
  it("accepts JSON bodies only", () => {
    expect(rejectNonJson(post({ "content-type": "application/json; charset=utf-8" }))).toBeNull();
    expect(rejectNonJson(post({ "content-type": "text/plain" }))?.status).toBe(415);
    expect(rejectNonJson(post({}))?.status).toBe(415);
  });
});
