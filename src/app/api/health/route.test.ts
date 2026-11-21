import { afterEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import type { ApiErrorBody } from "@/lib/api/types";
import { GET } from "./route";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("answers 200 with the database up, never cached", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, db: "up" });
  });

  it("asks the database every time instead of remembering the last answer", async () => {
    const execute = vi.spyOn(await getDb(), "execute");
    expect((await GET()).status).toBe(200);
    expect((await GET()).status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("answers 503 when the database can't run a query, without the driver's error", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(await getDb(), "execute").mockRejectedValueOnce(
      new Error("connect ECONNREFUSED 10.0.0.12:5432 user=otto_admin"),
    );

    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = (await res.json()) as ApiErrorBody;
    expect(body).toEqual({
      ok: false,
      error: { code: "server_error", message: "Database unavailable." },
    });
    expect(JSON.stringify(body)).not.toContain("ECONNREFUSED");
    expect(errors).toHaveBeenCalledWith(
      "[error] health.db_down",
      expect.objectContaining({ errorMessage: expect.stringContaining("ECONNREFUSED") }),
    );
  });

  it("reports up again as soon as the database recovers", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(await getDb(), "execute").mockRejectedValueOnce(new Error("too many connections"));
    expect((await GET()).status).toBe(503);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, db: "up" });
  });
});
