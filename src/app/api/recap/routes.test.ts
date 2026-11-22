import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { applications, users, weeklyRecaps } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, resetDb, signInAs } from "@/lib/auth/test-helpers";
import type { RecapIndexResponse, RecapResponse } from "@/lib/recap/types";
import { GET } from "./[week]/route";
import { PATCH, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

function send(method: "POST" | "PATCH", body: unknown, headers: Record<string, string> = {}) {
  const handler = method === "POST" ? POST : PATCH;
  return handler(
    new Request("http://localhost/api/recap", {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

function read(week: string) {
  return GET(new Request(`http://localhost/api/recap/${week}`), {
    params: Promise.resolve({ week }),
  });
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

describe("/api/recap", () => {
  it("asks for a sign-in", async () => {
    expect((await send("POST", {})).status).toBe(401);
    expect((await send("PATCH", { week: "2026-11-16" })).status).toBe(401);
    expect((await read("2026-11-16")).status).toBe(401);
  });

  it("refuses other sites and bad bodies", async () => {
    await signInAs();
    expect((await send("POST", {}, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await send("POST", { timeZone: "x".repeat(65) })).status).toBe(400);
    expect((await send("PATCH", { week: "next monday" })).status).toBe(400);
    const missing = await read("not-a-week");
    expect(missing.status).toBe(404);
    expect(((await missing.json()) as ApiErrorBody).error.code).toBe("not_found");
  });

  it("builds last week, marks it seen, and reads it back", async () => {
    const user = await signInAs();
    const now = Date.now();
    await (await getDb()).insert(applications).values({
      id: crypto.randomUUID(),
      userId: user.id,
      company: "Stripe",
      appliedAt: now - 9 * 86_400_000,
      statusChangedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const db = await getDb();
    await db.update(users).set({ createdAt: 0 }).where(eq(users.id, user.id));

    const res = await send("POST", { timeZone: "UTC" });
    expect(res.status).toBe(200);
    const index = (await res.json()) as RecapIndexResponse;
    const week = index.current?.recap.week;
    expect(week).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(index.current?.seen).toBe(false);

    expect((await send("PATCH", { week })).status).toBe(200);
    const [row] = await db.select().from(weeklyRecaps).where(eq(weeklyRecaps.userId, user.id));
    expect(row?.seenAt).not.toBeNull();

    const back = await read(week!);
    expect(back.status).toBe(200);
    expect(((await back.json()) as RecapResponse).recap.week).toBe(week);
  });
});
