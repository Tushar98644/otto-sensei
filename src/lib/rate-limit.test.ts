import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { rateLimits } from "@/db/schema";
import { resetDb } from "@/lib/auth/test-helpers";
import { giveBackRateLimit, rateLimit, retryAfterHeader, waitText } from "./rate-limit";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const WINDOW_START = 1_800_000_000_000;

async function storedKeys(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select({ key: rateLimits.key }).from(rateLimits);
  return rows.map((row) => row.key).sort();
}

beforeEach(resetDb);

describe("rateLimit", () => {
  it("allows calls up to the limit, then blocks until the window ends", async () => {
    for (const [i, offset] of [1, 2, 3].entries()) {
      const result = await rateLimit("test:a", 3, MINUTE, WINDOW_START + offset);
      expect(result).toEqual({ allowed: true, remaining: 2 - i, retryAfterMs: 0 });
    }
    const blocked = await rateLimit("test:a", 3, MINUTE, WINDOW_START + 10_001);
    expect(blocked).toEqual({ allowed: false, remaining: 0, retryAfterMs: MINUTE - 10_001 });
  });

  it("starts a fresh count in the next window", async () => {
    for (let i = 1; i <= 4; i++) await rateLimit("test:b", 3, MINUTE, WINDOW_START + i);
    const next = await rateLimit("test:b", 3, MINUTE, WINDOW_START + MINUTE + 1);
    expect(next).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });
  });

  it("counts each key on its own", async () => {
    await rateLimit("test:c", 1, MINUTE, WINDOW_START + 1);
    expect((await rateLimit("test:c", 1, MINUTE, WINDOW_START + 2)).allowed).toBe(false);
    expect((await rateLimit("test:d", 1, MINUTE, WINDOW_START + 3)).allowed).toBe(true);
  });

  it("prunes windows older than two days only when cleanup runs", async () => {
    await rateLimit("old", 5, MINUTE, WINDOW_START - 3 * DAY + 1);
    await rateLimit("recent", 5, MINUTE, WINDOW_START - DAY + 1);

    await rateLimit("no-cleanup", 5, MINUTE, WINDOW_START + 1);
    expect(await storedKeys()).toEqual(["no-cleanup", "old", "recent"]);

    await rateLimit("cleanup", 5, MINUTE, WINDOW_START + 50);
    expect(await storedKeys()).toEqual(["cleanup", "no-cleanup", "recent"]);
  });

  it("caps very long keys", async () => {
    await rateLimit(`test:${"x".repeat(5_000)}`, 5, MINUTE, WINDOW_START + 1);
    const [key] = await storedKeys();
    expect(key).toHaveLength(512);
  });

  it("rejects a window that isn't positive", async () => {
    await expect(rateLimit("test:e", 5, 0, WINDOW_START + 1)).rejects.toThrow(RangeError);
    await expect(giveBackRateLimit("test:e", 0, WINDOW_START + 1)).rejects.toThrow(RangeError);
  });
});

describe("giveBackRateLimit", () => {
  it("returns a call to its own window, so the next one is allowed again", async () => {
    for (let i = 1; i <= 2; i++) await rateLimit("test:f", 2, MINUTE, WINDOW_START + i);
    await giveBackRateLimit("test:f", MINUTE, WINDOW_START + 2);
    expect((await rateLimit("test:f", 2, MINUTE, WINDOW_START + 3)).allowed).toBe(true);
    expect((await rateLimit("test:f", 2, MINUTE, WINDOW_START + 4)).allowed).toBe(false);
  });

  it("never credits the next window or goes below zero", async () => {
    await rateLimit("test:g", 1, MINUTE, WINDOW_START + 1);
    await rateLimit("test:g", 1, MINUTE, WINDOW_START + MINUTE + 1);
    await Promise.all([1, 2, 3].map(() => giveBackRateLimit("test:g", MINUTE, WINDOW_START + 2)));
    expect((await rateLimit("test:g", 1, MINUTE, WINDOW_START + MINUTE + 2)).allowed).toBe(false);
    expect(await rateLimit("test:g", 1, MINUTE, WINDOW_START + 3)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
  });

  it("finds a very long key the way rateLimit stored it", async () => {
    const key = `test:${"x".repeat(5_000)}`;
    await rateLimit(key, 1, MINUTE, WINDOW_START + 1);
    await giveBackRateLimit(key, MINUTE, WINDOW_START + 1);
    expect((await rateLimit(key, 1, MINUTE, WINDOW_START + 2)).allowed).toBe(true);
  });
});

describe("retryAfterHeader", () => {
  it("rounds up to whole seconds, at least one", () => {
    expect(retryAfterHeader(0)).toEqual({ "Retry-After": "1" });
    expect(retryAfterHeader(1_001)).toEqual({ "Retry-After": "2" });
    expect(retryAfterHeader(60_000)).toEqual({ "Retry-After": "60" });
  });
});

describe("waitText", () => {
  it("rounds up to whole minutes for people", () => {
    expect(waitText(1)).toBe("1 minute");
    expect(waitText(MINUTE + 1)).toBe("2 minutes");
    expect(waitText(59 * MINUTE)).toBe("59 minutes");
  });
});
