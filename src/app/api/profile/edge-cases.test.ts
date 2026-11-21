import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users, workProfiles } from "@/db/schema";
import { execSql } from "@/db/testing";
import type { ApiErrorBody } from "@/lib/api/types";
import {
  AUTH_COOKIE,
  cookieJar,
  fakeAuth,
  resetDb,
  setPlan,
  signInAs,
  signInOnTrial,
} from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import type { WorkProfileBody, WorkProfileResponse } from "@/lib/eligibility/profile";
import { saveWorkProfile } from "@/lib/eligibility/records";
import { deleteUserData } from "@/lib/users";
import { GET, PUT } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const PROFILE: WorkProfileBody = {
  country: "PT",
  timeZone: "Europe/Lisbon",
  rights: { us: "sponsorship", uk: null, eu: "authorized", ca: null },
  fullTime: true,
  contract: false,
  remoteOnly: false,
};

const JSON_TYPE = { "content-type": "application/json" };

function putRaw(body: BodyInit, headers: Record<string, string> = JSON_TYPE) {
  return PUT(new Request("http://localhost/api/profile", { method: "PUT", headers, body }));
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
  return PUT(new Request("http://localhost/api/profile", init));
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function profileRows() {
  return (await getDb()).select().from(workProfiles);
}

const signInPro = async (email = "ines@example.com") => setPlan(await signInAs(email), "pro");

describe("/api/profile when something fails", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers a database outage on read with a retryable 500, and keeps the address out of the log", async () => {
    await signInPro();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await execSql("alter table public.work_profiles rename to work_profiles_away");
    let res: Response;
    try {
      res = await GET();
    } finally {
      await execSql("alter table public.work_profiles_away rename to work_profiles");
    }
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Couldn't load your work profile. Please try again.",
    });
    const output = JSON.stringify(logged.mock.calls);
    expect(output).toContain("profile.read_failed");
    expect(output).toContain("does not exist");
    expect(output).not.toContain("ines@example.com");
    expect((await GET()).status).toBe(200);
  });

  it("keeps the saved profile as it was when a save fails", async () => {
    await signInPro();
    const first = (await (await put(PROFILE)).json()) as WorkProfileResponse;
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await execSql(
      "create function fail_write() returns trigger language plpgsql as $$ begin raise exception 'disk full'; end $$",
    );
    await execSql(
      "create trigger fail_write before insert or update on public.work_profiles for each row execute function fail_write()",
    );
    let res: Response;
    try {
      res = await put({ ...PROFILE, country: "US", timeZone: "America/New_York" });
    } finally {
      await execSql("drop trigger fail_write on public.work_profiles");
      await execSql("drop function fail_write()");
    }
    expect(res.status).toBe(500);
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Couldn't save your work profile. Please try again.",
    });
    expect(JSON.stringify(logged.mock.calls)).toContain("profile.save_failed");
    const read = (await (await GET()).json()) as WorkProfileResponse;
    expect(read.profile).toEqual(PROFILE);
    expect(read.updatedAt).toBe(first.updatedAt);
  });

  it("treats a Supabase outage as an error, not as signed out, so the next try still works", async () => {
    await signInPro();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 0));
    const read = await GET();
    expect(read.status).toBe(500);
    expect((await errorOf(read)).code).toBe("server_error");

    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 0));
    const save = await put(PROFILE);
    expect(save.status).toBe(500);
    expect((await errorOf(save)).code).toBe("server_error");
    expect(await profileRows()).toHaveLength(0);
    expect(JSON.stringify(logged.mock.calls)).toContain("profile.save_failed");

    expect(cookieJar.get(AUTH_COOKIE)?.value).toBeTruthy();
    expect((await put(PROFILE)).status).toBe(200);
  });

  it("refuses a save for an account deleted while the request was on its way", async () => {
    const user = await signInPro();
    const res = await putWhileDeleting(user.id, PROFILE);
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to save your work profile.",
    });
    expect(await profileRows()).toHaveLength(0);
    expect(await (await getDb()).select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
  });

  it("answers a session ended on another device with 401 and writes nothing", async () => {
    await signInPro();
    const token = cookieJar.get(AUTH_COOKIE)?.value ?? "";
    await fakeAuth.server.signOut();
    cookieJar.set(AUTH_COOKIE, token);
    expect((await GET()).status).toBe(401);
    const res = await put(PROFILE);
    expect(res.status).toBe(401);
    expect((await errorOf(res)).code).toBe("unauthorized");
    expect(await profileRows()).toHaveLength(0);
  });
});

describe("/api/profile input it can't use", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("answers a body that isn't JSON, or is far too large, with 400 and saves nothing", async () => {
    await signInPro();
    for (const res of [
      await putRaw("{country: PT"),
      await putRaw(""),
      await put({ ...PROFILE, padding: "x".repeat(600 * 1024) }),
      await putRaw(JSON.stringify(PROFILE), { ...JSON_TYPE, "content-length": String(600 * 1024) }),
    ]) {
      expect(res.status).toBe(400);
      expect(await errorOf(res)).toEqual({
        code: "bad_request",
        message: "Some of those details aren't valid. Check them and try again.",
      });
    }
    expect(await profileRows()).toHaveLength(0);
  });

  it("rejects a country or time zone that is too long and a profile with fields missing", async () => {
    await signInPro();
    const { rights: _rights, ...noRights } = PROFILE;
    void _rights;
    for (const payload of [
      { ...PROFILE, country: "PRT" },
      { ...PROFILE, timeZone: `Europe/${"x".repeat(64)}` },
      noRights,
      { ...PROFILE, fullTime: "yes" },
      [PROFILE],
      null,
    ]) {
      expect((await errorOf(await put(payload))).code).toBe("bad_request");
    }
    expect(await profileRows()).toHaveLength(0);
  });

  it("accepts a blank country and time zone, so a person can clear them", async () => {
    await signInPro();
    await put(PROFILE);
    const res = await put({ ...PROFILE, country: "", timeZone: "" });
    expect(res.status).toBe(200);
    const saved = (await res.json()) as WorkProfileResponse;
    expect(saved.profile).toMatchObject({ country: "", timeZone: "", rights: PROFILE.rights });
  });

  it("turns away another website by its Origin, and lets the app's own pages through", async () => {
    await signInPro();
    const elsewhere = await put(PROFILE, { ...JSON_TYPE, origin: "https://elsewhere.example" });
    expect(elsewhere.status).toBe(403);
    expect((await errorOf(elsewhere)).code).toBe("forbidden");
    expect(await profileRows()).toHaveLength(0);

    const own = await put(PROFILE, { ...JSON_TYPE, origin: "http://localhost" });
    expect(own.status).toBe(200);
    expect(await profileRows()).toHaveLength(1);
  });
});

describe("/api/profile and the plan", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  const PAID: [string, () => Promise<SessionUser>][] = [
    ["the trial", () => signInOnTrial("ines@example.com")],
    ["Pro", () => signInPro()],
    ["Max", async () => setPlan(await signInAs("ines@example.com"), "max")],
  ];

  it.each(PAID)("saves it on %s", async (_, signIn) => {
    const user = await signIn();
    const res = await put(PROFILE);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(((await res.json()) as WorkProfileResponse).profile).toEqual(PROFILE);
    const rows = await (
      await getDb()
    )
      .select()
      .from(workProfiles)
      .where(eq(workProfiles.userId, user.id));
    expect(rows).toHaveLength(1);
  });

  it("offers Free the trial with a reason, before reading the body, and writes nothing", async () => {
    await signInAs("ines@example.com");
    for (const res of [await put(PROFILE), await putRaw("{not json")]) {
      expect(res.status).toBe(402);
      const error = await errorOf(res);
      expect(error.code).toBe("upgrade_required");
      expect(error.message).toMatch(/^The work-rights check comes with Pro\. Try /);
    }
    expect(await profileRows()).toHaveLength(0);
  });

  it("lets a Free account read the profile it saved while paid, but not change it", async () => {
    const user = await signInAs("ines@example.com");
    const stored = await saveWorkProfile(user.id, PROFILE);
    expect(stored.status).toBe("saved");

    const read = (await (await GET()).json()) as WorkProfileResponse;
    expect(read.profile).toEqual(PROFILE);
    expect(read.updatedAt).toEqual(expect.any(Number));

    expect((await put({ ...PROFILE, country: "US" })).status).toBe(402);
    const after = (await (await GET()).json()) as WorkProfileResponse;
    expect(after).toEqual(read);
  });
});
