import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users, userSettings } from "@/db/schema";
import { execSql } from "@/db/testing";
import type { ApiErrorBody } from "@/lib/api/types";
import { AUTH_COOKIE, cookieJar, fakeAuth, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { readWorkProfile, saveWorkProfile } from "@/lib/eligibility/records";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import { NO_CHOICE } from "@/lib/job-feed/types";
import type { SetupDefaults, SetupDefaultsResponse } from "@/lib/setup/types";
import { deleteUserData } from "@/lib/users";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const PLACE = { country: "PT", from: "resume", timeZone: "Europe/Lisbon" } as const;
const ROLE = {
  role: { title: "Backend Engineer", family: "engineering", occupation: null },
  level: "senior",
} as const;
const JSON_TYPE = { "content-type": "application/json" };
const NO_RIGHTS = { us: null, uk: null, eu: null, ca: null };

function postRaw(body: BodyInit, headers: Record<string, string> = JSON_TYPE) {
  return POST(
    new Request("http://localhost/api/setup/defaults", { method: "POST", headers, body }),
  );
}

const post = (payload: unknown, headers?: Record<string, string>) =>
  postRaw(JSON.stringify(payload), headers);

// The body only arrives after sign-in was checked, like a delete from another tab landing mid-save.
function postWhileDeleting(userId: string, payload: unknown) {
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
    method: "POST",
    headers: JSON_TYPE,
    body,
    duplex: "half",
  };
  return POST(new Request("http://localhost/api/setup/defaults", init));
}

async function saved(payload: SetupDefaults): Promise<Omit<SetupDefaultsResponse, "ok">> {
  const res = await post(payload);
  expect(res.status).toBe(200);
  return (await res.json()) as SetupDefaultsResponse;
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function rowCounts() {
  const rows = await (await getDb()).select().from(userSettings);
  return {
    profiles: rows.filter((row) => row.workUpdatedAt !== null).length,
    setups: rows.filter((row) => row.setupDefaultsAt !== null || row.setupLookingForAt !== null)
      .length,
  };
}

// Fails only the write that sets what `when` names, so each half of the save can fail alone.
async function failingTrigger(when: string): Promise<() => Promise<void>> {
  await execSql(
    `create function fail_write() returns trigger language plpgsql as $$ begin if ${when} then raise exception 'disk full'; end if; return new; end $$`,
  );
  await execSql(
    "create trigger fail_write before insert or update on public.user_settings for each row execute function fail_write()",
  );
  return async () => {
    await execSql("drop trigger fail_write on public.user_settings");
    await execSql("drop function fail_write()");
  };
}

describe("POST /api/setup/defaults when something fails", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers a database outage with a retryable 500, and keeps the address out of the log", async () => {
    await signInAs("ines@example.com");
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await execSql("alter table public.user_settings rename to user_settings_away");
    let res: Response;
    try {
      res = await post({ place: PLACE });
    } finally {
      await execSql("alter table public.user_settings_away rename to user_settings");
    }
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Couldn't save that. Please try again.",
    });
    const output = JSON.stringify(logged.mock.calls);
    expect(output).toContain("setup.defaults_failed");
    expect(output).not.toContain("ines@example.com");
    expect(await rowCounts()).toEqual({ profiles: 0, setups: 0 });
  });

  it("keeps none of the guesses when the setup can't be marked, so the next visit fills them", async () => {
    const user = await signInAs("ines@example.com");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const restore = await failingTrigger("new.setup_defaults_at is not null");
    let res: Response;
    try {
      res = await post({ place: PLACE, lookingFor: ROLE });
    } finally {
      await restore();
    }
    expect(res.status).toBe(500);
    expect(await rowCounts()).toEqual({ profiles: 0, setups: 0 });
    expect((await readWorkProfile(user.id)).profile).toEqual(emptyWorkProfile());

    const retry = await saved({ place: PLACE, lookingFor: ROLE });
    expect(retry.profile).toMatchObject({ country: "PT", timeZone: "Europe/Lisbon" });
    expect(retry.lookingFor).toMatchObject(ROLE);
    expect(retry.setup.defaultsAt).toEqual(expect.any(Number));
  });

  it("marks nothing as done when the profile can't be written", async () => {
    await signInAs("ines@example.com");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const restore = await failingTrigger("new.work_updated_at is not null");
    let res: Response;
    try {
      res = await post({ place: PLACE });
    } finally {
      await restore();
    }
    expect(res.status).toBe(500);
    expect(await rowCounts()).toEqual({ profiles: 0, setups: 0 });
    expect((await saved({ place: PLACE })).setup.guess).toEqual({
      country: "PT",
      from: "resume",
      region: "eu",
    });
  });

  it("treats a Supabase outage as an error, not as signed out, so the next try still works", async () => {
    await signInAs("ines@example.com");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 0));
    const res = await post({ place: PLACE });
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await errorOf(res)).code).toBe("server_error");
    expect(await rowCounts()).toEqual({ profiles: 0, setups: 0 });

    expect(cookieJar.get(AUTH_COOKIE)?.value).toBeTruthy();
    expect((await saved({ place: PLACE })).profile.country).toBe("PT");
  });

  it("refuses to fill an account deleted while the request was on its way", async () => {
    const user = await signInAs("ines@example.com");
    const res = await postWhileDeleting(user.id, { place: PLACE, lookingFor: ROLE });
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to keep your setup.",
    });
    expect(await rowCounts()).toEqual({ profiles: 0, setups: 0 });
    expect(await (await getDb()).select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
  });
});

describe("POST /api/setup/defaults input", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("answers a body that isn't JSON, or is far too large, with 400 and saves nothing", async () => {
    await signInAs("ines@example.com");
    for (const res of [
      await postRaw("{place: PT"),
      await postRaw(""),
      await post(null),
      await post({ place: PLACE, padding: "x".repeat(600 * 1024) }),
      await post({ place: { ...PLACE, country: "", from: "device" } }),
      await post({ place: { ...PLACE, timeZone: "Mars/Olympus" } }),
    ]) {
      expect(res.status).toBe(400);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(await errorOf(res)).toEqual({
        code: "bad_request",
        message: "That change isn't valid.",
      });
    }
    expect(await rowCounts()).toEqual({ profiles: 0, setups: 0 });
  });

  it("turns away another website by its Origin, and lets the app's own pages through", async () => {
    await signInAs("ines@example.com");
    const elsewhere = await post(
      { place: PLACE },
      { ...JSON_TYPE, origin: "https://elsewhere.example" },
    );
    expect(elsewhere.status).toBe(403);
    expect((await errorOf(elsewhere)).code).toBe("forbidden");
    expect(await rowCounts()).toEqual({ profiles: 0, setups: 0 });

    const own = await post({ place: PLACE }, { ...JSON_TYPE, origin: "http://localhost" });
    expect(own.status).toBe(200);
    expect(await rowCounts()).toEqual({ profiles: 1, setups: 1 });
  });
});

describe("POST /api/setup/defaults guesses", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["GB", "Europe/London", "uk"],
    ["US", "America/Chicago", "us"],
    ["PR", "America/Puerto_Rico", "us"],
    ["CA", "America/Toronto", "ca"],
    ["DE", "Europe/Berlin", "eu"],
  ] as const)(
    "marks %s as a place the person can already work, under %s rights",
    async (country, timeZone, region) => {
      await signInAs("ines@example.com");
      const res = await saved({ place: { country, from: "device", timeZone } });
      expect(res.profile.rights).toEqual({ ...NO_RIGHTS, [region]: "authorized" });
      expect(res.setup.guess).toEqual({ country, from: "device", region });
    },
  );

  it("keeps a country outside the four work-rights regions, without guessing any rights", async () => {
    await signInAs("ines@example.com");
    const res = await saved({ place: { country: "JP", from: "device", timeZone: "Asia/Tokyo" } });
    expect(res.profile).toMatchObject({ country: "JP", timeZone: "Asia/Tokyo", rights: NO_RIGHTS });
    expect(res.setup.guess).toEqual({ country: "JP", from: "device", region: null });
  });

  it("fills only the time zone when no country could be told, and leaves nothing to confirm", async () => {
    await signInAs("ines@example.com");
    const res = await saved({ place: { country: "", from: null, timeZone: "Asia/Tokyo" } });
    expect(res.profile).toMatchObject({ country: "", timeZone: "Asia/Tokyo", rights: NO_RIGHTS });
    expect(res.setup).toMatchObject({ guess: null, defaultsAt: expect.any(Number) });

    const later = await saved({ place: PLACE });
    expect(later.profile.country).toBe("");
    expect(later.setup.defaultsAt).toBe(res.setup.defaultsAt);
  });

  it("marks the place step done even when there was nothing at all to fill", async () => {
    await signInAs("ines@example.com");
    const res = await saved({ place: { country: "", from: null, timeZone: "" } });
    expect(res.updatedAt).toBeNull();
    expect(res.profile).toEqual(emptyWorkProfile());
    expect(res.setup).toMatchObject({
      guess: null,
      defaultsAt: expect.any(Number),
      lookingForAt: null,
    });
    expect(await rowCounts()).toEqual({ profiles: 0, setups: 1 });
  });

  it("keeps a time zone the person chose while it fills in the country", async () => {
    const user = await signInAs("ines@example.com");
    await saveWorkProfile(user.id, { ...emptyWorkProfile(), timeZone: "Atlantic/Azores" });
    const res = await saved({ place: PLACE });
    expect(res.profile).toMatchObject({ country: "PT", timeZone: "Atlantic/Azores" });
    expect(res.setup.guess).toEqual({ country: "PT", from: "resume", region: "eu" });
  });

  it("guesses Looking for first and the place on a later visit", async () => {
    await signInAs("ines@example.com");
    const first = await saved({ lookingFor: { role: null, level: "junior" } });
    expect(first.lookingFor).toEqual({ ...NO_CHOICE, level: "junior" });
    expect(first.setup).toMatchObject({ defaultsAt: null, lookingForAt: expect.any(Number) });
    expect(first.profile.country).toBe("");

    const second = await saved({ place: PLACE, lookingFor: ROLE });
    expect(second.profile.country).toBe("PT");
    expect(second.lookingFor).toEqual(first.lookingFor);
    expect(second.setup.lookingForAt).toBe(first.setup.lookingForAt);
  });

  it("answers a repeat visit with what is stored, without writing again", async () => {
    vi.setSystemTime(Date.UTC(2026, 10, 7, 12));
    await signInAs("ines@example.com");
    const first = await saved({ place: PLACE, lookingFor: ROLE });
    const [before] = await (await getDb()).select().from(userSettings);
    // Ten minutes later, so any write would leave a newer updatedAt behind.
    vi.setSystemTime(Date.UTC(2026, 10, 7, 12, 10));
    const again = await saved({
      place: { country: "GB", from: "device", timeZone: "Europe/London" },
    });
    expect(again).toEqual(first);
    const [after] = await (await getDb()).select().from(userSettings);
    expect(after?.updatedAt).toBe(before?.updatedAt);
  });
});
