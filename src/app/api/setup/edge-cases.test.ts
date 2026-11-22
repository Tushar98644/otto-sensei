import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users, userSettings } from "@/db/schema";
import { execSql } from "@/db/testing";
import type { ApiErrorBody } from "@/lib/api/types";
import { AUTH_COOKIE, cookieJar, fakeAuth, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { saveSetupDefaults } from "@/lib/setup/records";
import { NO_SETUP, type AccountSetupResponse } from "@/lib/setup/types";
import { deleteUserData } from "@/lib/users";
import { GET, PUT } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const JSON_TYPE = { "content-type": "application/json" };

function putRaw(body: BodyInit, headers: Record<string, string> = JSON_TYPE) {
  return PUT(new Request("http://localhost/api/setup", { method: "PUT", headers, body }));
}

const put = (payload: unknown, headers?: Record<string, string>) =>
  putRaw(JSON.stringify(payload), headers);

// The body only arrives after sign-in was checked, like a delete from another tab landing mid-save.
function putWhileDeleting(userId: string, payload: unknown) {
  const body = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        await deleteUserData(userId);
        controller.enqueue(new TextEncoder().encode(JSON.stringify(payload)));
        controller.close();
      },
    },
    { highWaterMark: 0 },
  );
  const init: RequestInit & { duplex: "half" } = {
    method: "PUT",
    headers: JSON_TYPE,
    body,
    duplex: "half",
  };
  return PUT(new Request("http://localhost/api/setup", init));
}

async function setupOf(res: Response): Promise<AccountSetupResponse["setup"]> {
  return ((await res.json()) as AccountSetupResponse).setup;
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function setupRows() {
  return (await getDb()).select().from(userSettings);
}

const PLACE = { country: "GB", from: "device", timeZone: "Europe/London" } as const;

describe("/api/setup when something fails", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers a database outage on read with a retryable 500, and keeps the address out of the log", async () => {
    await signInAs("ines@example.com");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await execSql("alter table public.user_settings rename to user_settings_away");
    let res: Response;
    try {
      res = await GET();
    } finally {
      await execSql("alter table public.user_settings_away rename to user_settings");
    }
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Couldn't load your setup. Please try again.",
    });
    const output = JSON.stringify(logged.mock.calls);
    expect(output).toContain("setup.read_failed");
    expect(output).toContain("does not exist");
    expect(output).not.toContain("ines@example.com");
    expect(await setupOf(await GET())).toEqual(NO_SETUP);
  });

  it("keeps the setup as it was when a save fails", async () => {
    await signInAs("ines@example.com");
    const before = await setupOf(await put({ step: "skipped" }));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await execSql(
      "create function fail_write() returns trigger language plpgsql as $$ begin raise exception 'disk full'; end $$",
    );
    await execSql(
      "create trigger fail_write before insert or update on public.user_settings for each row execute function fail_write()",
    );
    let res: Response;
    try {
      res = await put({ step: "saved", checklist: "hidden" });
    } finally {
      await execSql("drop trigger fail_write on public.user_settings");
      await execSql("drop function fail_write()");
    }
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Couldn't save that. Please try again.",
    });
    expect(JSON.stringify(logged.mock.calls)).toContain("setup.save_failed");
    expect(await setupOf(await GET())).toEqual(before);
  });

  it("treats a Supabase outage as an error, not as signed out, so the next try still works", async () => {
    await signInAs("ines@example.com");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 0));
    const read = await GET();
    expect(read.status).toBe(500);
    expect(read.headers.get("cache-control")).toBe("no-store");
    expect((await errorOf(read)).code).toBe("server_error");

    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 0));
    const save = await put({ step: "saved" });
    expect(save.status).toBe(500);
    expect(await setupRows()).toHaveLength(0);

    expect(cookieJar.get(AUTH_COOKIE)?.value).toBeTruthy();
    expect(await setupOf(await put({ step: "saved" }))).toMatchObject({ stepOutcome: "saved" });
  });

  it("refuses a save for an account deleted while the request was on its way", async () => {
    const user = await signInAs("ines@example.com");
    const res = await putWhileDeleting(user.id, { step: "saved" });
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to keep your setup.",
    });
    expect(await setupRows()).toHaveLength(0);
    expect(await (await getDb()).select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
  });
});

describe("/api/setup input", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("answers a body that isn't JSON, or is far too large, with 400 and saves nothing", async () => {
    await signInAs("ines@example.com");
    for (const res of [
      await putRaw("{step: saved"),
      await putRaw(""),
      await put(null),
      await put({ step: "saved", padding: "x".repeat(600 * 1024) }),
    ]) {
      expect(res.status).toBe(400);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(await errorOf(res)).toEqual({
        code: "bad_request",
        message: "That change isn't valid.",
      });
    }
    expect(await setupRows()).toHaveLength(0);
  });

  it("turns away another website by its Origin, and lets the app's own pages through", async () => {
    await signInAs("ines@example.com");
    const elsewhere = await put(
      { step: "saved" },
      { ...JSON_TYPE, origin: "https://elsewhere.example" },
    );
    expect(elsewhere.status).toBe(403);
    expect((await errorOf(elsewhere)).code).toBe("forbidden");
    expect(await setupRows()).toHaveLength(0);

    const own = await put({ step: "saved" }, { ...JSON_TYPE, origin: "http://localhost" });
    expect(own.status).toBe(200);
    expect(await setupRows()).toHaveLength(1);
  });

  it("ignores fields it doesn't know, so a change can't touch the plan", async () => {
    const user = await signInAs("ines@example.com");
    const res = await put({ step: "saved", plan: "max", userId: crypto.randomUUID() });
    expect(res.status).toBe(200);
    expect(await setupOf(res)).toMatchObject({ stepOutcome: "saved" });
    const [row] = await (await getDb()).select().from(users).where(eq(users.id, user.id));
    expect(row?.plan).toBe("free");
    const rows = await setupRows();
    expect(rows.map((setup) => setup.userId)).toEqual([user.id]);
  });
});

describe("/api/setup changes", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("confirms on an account with no guess and leaves everything blank", async () => {
    await signInAs("ines@example.com");
    expect(await setupOf(await put({ guess: "confirmed" }))).toEqual(NO_SETUP);
    expect(await setupRows()).toHaveLength(1);
  });

  it("shows the checklist on a fresh account without hiding or answering anything", async () => {
    await signInAs("ines@example.com");
    expect(await setupOf(await put({ checklist: "shown" }))).toEqual(NO_SETUP);
  });

  it("changes the step's answer when it is answered again", async () => {
    await signInAs("ines@example.com");
    await put({ step: "skipped" });
    const saved = await setupOf(await put({ step: "saved" }));
    expect(saved).toMatchObject({ stepOutcome: "saved", stepAt: expect.any(Number) });
    expect(await setupOf(await GET())).toEqual(saved);
  });

  it("takes all three changes in one request and keeps when the defaults ran", async () => {
    const user = await signInAs("ines@example.com");
    const guessed = await saveSetupDefaults(user.id, { place: PLACE });
    if (guessed.status !== "saved") throw new Error("expected the guess to save");
    const setup = await setupOf(
      await put({ step: "saved", checklist: "hidden", guess: "confirmed" }),
    );
    expect(setup).toEqual({
      stepAt: expect.any(Number),
      stepOutcome: "saved",
      checklistHiddenAt: expect.any(Number),
      defaultsAt: guessed.setup.defaultsAt,
      lookingForAt: null,
      guess: null,
    });
  });
});
