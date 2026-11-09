import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { workProfiles } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, resetDb, setPlan, signInAs as signInFree } from "@/lib/auth/test-helpers";
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

function put(
  payload: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return PUT(
    new Request("http://localhost/api/profile", {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    }),
  );
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiErrorBody).error.code;
}

// The work profile feeds Pro tools only; "the work profile on Free" below covers Free.
const signInAs = async (email: string) => setPlan(await signInFree(email), "pro");

describe("the work profile on Free", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("reads it, but offers the trial instead of saving", async () => {
    await signInFree("ines@example.com");
    expect((await GET()).status).toBe(200);
    const res = await put(PROFILE);
    expect(res.status).toBe(402);
    expect(await errorCode(res)).toBe("upgrade_required");
  });
});

describe("/api/profile", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("needs a signed-in account", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await put(PROFILE)).status).toBe(401);
  });

  it("returns an empty, unsaved profile before the first save", async () => {
    await signInAs("ines@example.com");
    const body = (await (await GET()).json()) as WorkProfileResponse;
    expect(body.updatedAt).toBeNull();
    expect(body.profile).toEqual({
      country: "",
      timeZone: "",
      rights: { us: null, uk: null, eu: null, ca: null },
      fullTime: true,
      contract: true,
      remoteOnly: false,
    });
  });

  it("saves, reads back and replaces the profile", async () => {
    await signInAs("ines@example.com");
    const saved = (await (await put(PROFILE)).json()) as WorkProfileResponse;
    expect(saved.profile).toEqual(PROFILE);
    expect(saved.updatedAt).toEqual(expect.any(Number));

    const changed = { ...PROFILE, country: "US", timeZone: "America/New_York", contract: true };
    expect((await put(changed)).status).toBe(200);
    const read = (await (await GET()).json()) as WorkProfileResponse;
    expect(read.profile).toEqual(changed);
    const rows = await (await getDb()).select().from(workProfiles);
    expect(rows).toHaveLength(1);
  });

  it("keeps the remote-only choice when an older page leaves it out", async () => {
    await signInAs("ines@example.com");
    await put({ ...PROFILE, remoteOnly: true });
    const { remoteOnly: _left, ...older } = PROFILE;
    void _left;
    const saved = (await (await put(older)).json()) as WorkProfileResponse;
    expect(saved.profile.remoteOnly).toBe(true);
  });

  it("keeps each account's profile to itself", async () => {
    const ines = await signInAs("ines@example.com");
    await put(PROFILE);
    await signInAs("tomas@example.com");
    const other = (await (await GET()).json()) as WorkProfileResponse;
    expect(other.updatedAt).toBeNull();
    const rows = await (
      await getDb()
    )
      .select()
      .from(workProfiles)
      .where(eq(workProfiles.userId, ines.id));
    expect(rows).toHaveLength(1);
  });

  it("rejects unknown countries and time zones, empty job types and non-JSON bodies", async () => {
    await signInAs("ines@example.com");
    expect(await errorCode(await put({ ...PROFILE, country: "XX" }))).toBe("bad_request");
    expect(await errorCode(await put({ ...PROFILE, timeZone: "Mars/Olympus" }))).toBe(
      "bad_request",
    );
    expect(await errorCode(await put({ ...PROFILE, fullTime: false, contract: false }))).toBe(
      "bad_request",
    );
    expect(await errorCode(await put({ ...PROFILE, rights: { us: "maybe" } }))).toBe("bad_request");
    expect((await put(PROFILE, { "content-type": "text/plain" })).status).toBe(415);
    expect(
      (await put(PROFILE, { "content-type": "application/json", "sec-fetch-site": "cross-site" }))
        .status,
    ).toBe(403);
  });

  it("goes with the account, and refuses to write for a deleted one", async () => {
    const user = await signInAs("ines@example.com");
    await put(PROFILE);
    await deleteUserData(user.id);
    expect(await (await getDb()).select().from(workProfiles)).toHaveLength(0);
    const result = await saveWorkProfile(user.id, { ...PROFILE, rights: { ...PROFILE.rights } });
    expect(result.status).toBe("no_user");
  });
});
