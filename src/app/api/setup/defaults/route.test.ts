import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { workProfiles } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, resetDb, setPlan, signInAs, signInOnTrial } from "@/lib/auth/test-helpers";
import type { SessionUser } from "@/lib/auth/types";
import { readWorkProfile, saveLookingFor, saveWorkProfile } from "@/lib/eligibility/records";
import { emptyWorkProfile } from "@/lib/eligibility/profile";
import { NO_CHOICE } from "@/lib/job-feed/types";
import { saveSetupDefaults } from "@/lib/setup/records";
import type { AccountSetupResponse, SetupDefaults, SetupDefaultsResponse } from "@/lib/setup/types";
import { deleteUserData } from "@/lib/users";
import { PUT as putSetup } from "../route";
import { POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const PLACE = { country: "PT", from: "resume", timeZone: "Europe/Lisbon" } as const;
const ROLE = {
  role: { title: "Backend Engineer", family: "engineering", occupation: null },
  level: "senior",
} as const;

function post(
  payload: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return POST(
    new Request("http://localhost/api/setup/defaults", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }),
  );
}

async function saved(payload: SetupDefaults): Promise<Omit<SetupDefaultsResponse, "ok">> {
  const res = await post(payload);
  expect(res.status).toBe(200);
  expect(res.headers.get("cache-control")).toBe("no-store");
  return (await res.json()) as SetupDefaultsResponse;
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiErrorBody).error.code;
}

const PLANS: [string, () => Promise<SessionUser>][] = [
  ["Free", () => signInAs("ines@example.com")],
  ["the trial", () => signInOnTrial("ines@example.com")],
  ["Pro", async () => setPlan(await signInAs("ines@example.com"), "pro")],
];

describe("POST /api/setup/defaults", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("needs a signed-in account", async () => {
    const res = await post({ place: PLACE });
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it.each(PLANS)("saves the guesses into a blank account on %s", async (_, signIn) => {
    const user = await signIn();
    const res = await saved({ place: PLACE, lookingFor: ROLE });
    expect(res.profile).toMatchObject({
      country: "PT",
      timeZone: "Europe/Lisbon",
      rights: { us: null, uk: null, eu: "authorized", ca: null },
      fullTime: true,
      contract: true,
      remoteOnly: false,
    });
    expect(res.lookingFor).toEqual({ ...ROLE, place: null, remote: false });
    expect(res.updatedAt).toEqual(expect.any(Number));
    expect(res.setup).toMatchObject({
      guess: { country: "PT", from: "resume", region: "eu" },
      defaultsAt: expect.any(Number),
      lookingForAt: expect.any(Number),
    });
    expect(await readWorkProfile(user.id)).toMatchObject({
      profile: res.profile,
      lookingFor: res.lookingFor,
    });
  });

  it("runs once: a second visit with other guesses changes nothing", async () => {
    const user = await signInAs("ines@example.com");
    const first = await saved({ place: PLACE, lookingFor: ROLE });
    const again = await saved({
      place: { country: "CA", from: "device", timeZone: "America/Toronto" },
      lookingFor: { role: null, level: "junior" },
    });
    expect(again.setup).toEqual(first.setup);
    expect(again.profile).toEqual(first.profile);
    expect(again.lookingFor).toEqual(first.lookingFor);
    expect(again.updatedAt).toBe(first.updatedAt);
    expect(await (await getDb()).select().from(workProfiles)).toHaveLength(1);
    expect((await readWorkProfile(user.id)).profile.country).toBe("PT");
  });

  it("never writes over what the person set", async () => {
    const user = await setPlan(await signInAs("ines@example.com"), "pro");
    await saveWorkProfile(user.id, {
      ...emptyWorkProfile(),
      country: "DE",
      timeZone: "Europe/Berlin",
      rights: { us: null, uk: null, eu: null, ca: null },
    });
    await saveLookingFor(user.id, { ...NO_CHOICE, place: "c:US", remote: true });
    const before = await readWorkProfile(user.id);

    const res = await saved({ place: PLACE, lookingFor: ROLE });
    expect(res.profile).toEqual(before.profile);
    expect(res.lookingFor).toEqual(before.lookingFor);
    expect(res.updatedAt).toBe(before.updatedAt);
    expect(res.setup).toMatchObject({
      guess: null,
      defaultsAt: expect.any(Number),
      lookingForAt: expect.any(Number),
    });
  });

  it("fills only the blanks around an answer, and keeps that answer", async () => {
    const user = await signInAs("ines@example.com");
    await saveWorkProfile(user.id, {
      ...emptyWorkProfile(),
      rights: { us: "sponsorship", uk: null, eu: "sponsorship", ca: null },
      contract: false,
    });
    const res = await saved({ place: PLACE });
    expect(res.profile).toMatchObject({
      country: "PT",
      timeZone: "Europe/Lisbon",
      rights: { us: "sponsorship", uk: null, eu: "sponsorship", ca: null },
      contract: false,
    });
    expect(res.setup.guess).toEqual({ country: "PT", from: "resume", region: null });
    expect(res.lookingFor).toEqual(NO_CHOICE);
  });

  it("guesses Looking for later, once the first upload is there", async () => {
    await signInAs("ines@example.com");
    const first = await saved({ place: PLACE });
    expect(first.setup.lookingForAt).toBeNull();
    expect(first.lookingFor).toEqual(NO_CHOICE);

    const upload = await saved({ lookingFor: ROLE });
    expect(upload.setup.defaultsAt).toBe(first.setup.defaultsAt);
    expect(upload.setup.lookingForAt).toEqual(expect.any(Number));
    expect(upload.lookingFor).toMatchObject(ROLE);
    expect(upload.profile.country).toBe("PT");

    const next = await saved({ lookingFor: { role: null, level: "junior" } });
    expect(next.lookingFor).toEqual(upload.lookingFor);
  });

  it("leaves no guess to confirm once the person confirms it, and keeps the settings", async () => {
    await signInOnTrial("ines@example.com");
    const res = await saved({ place: PLACE });
    const confirmed = await putSetup(
      new Request("http://localhost/api/setup", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guess: "confirmed" }),
      }),
    );
    expect(confirmed.status).toBe(200);
    const { setup } = (await confirmed.json()) as AccountSetupResponse;
    expect(setup).toMatchObject({ guess: null, defaultsAt: res.setup.defaultsAt });
    expect((await saved({ place: PLACE })).profile).toEqual(res.profile);
  });

  it("rejects empty or made-up guesses and non-JSON or cross-site requests", async () => {
    await signInAs("ines@example.com");
    expect(await errorCode(await post({}))).toBe("bad_request");
    expect(await errorCode(await post({ place: { ...PLACE, country: "XX" } }))).toBe("bad_request");
    expect(await errorCode(await post({ place: { ...PLACE, from: null } }))).toBe("bad_request");
    expect(await errorCode(await post({ lookingFor: { role: null, level: null } }))).toBe(
      "bad_request",
    );
    expect((await post({ place: PLACE }, { "content-type": "text/plain" })).status).toBe(415);
    expect(
      (
        await post(
          { place: PLACE },
          { "content-type": "application/json", "sec-fetch-site": "cross-site" },
        )
      ).status,
    ).toBe(403);
    expect(await (await getDb()).select().from(workProfiles)).toHaveLength(0);
  });

  it("refuses to write for a deleted account", async () => {
    const user = await signInAs("ines@example.com");
    await deleteUserData(user.id);
    expect((await saveSetupDefaults(user.id, { place: PLACE })).status).toBe("no_user");
  });
});
