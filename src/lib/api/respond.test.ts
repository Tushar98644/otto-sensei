import { describe, expect, it } from "vitest";
import { fail, NO_STORE, ok } from "./respond";

describe("ok", () => {
  it("answers 200 with ok: true alongside the data", async () => {
    const res = ok({ url: "https://checkout.example/session" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ ok: true, url: "https://checkout.example/session" });
  });

  it("keeps the status and headers it is given", async () => {
    const res = ok({ id: "r1" }, { status: 201, headers: NO_STORE });
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, id: "r1" });
  });
});

describe("fail", () => {
  it("answers with the code, message and status, and no reason unless there is one", async () => {
    const res = fail("not_found", "That resume is gone.", 404);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "not_found", message: "That resume is gone." },
    });
  });

  it("names the reason and passes on headers such as Retry-After", async () => {
    const res = fail(
      "limit_reached",
      "Otto is resting.",
      429,
      { "Retry-After": "60" },
      "ai_budget",
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: "limit_reached", message: "Otto is resting.", reason: "ai_budget" },
    });
  });
});
