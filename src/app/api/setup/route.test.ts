import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { userSettings } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { saveAccountSetup, saveSetupDefaults } from "@/lib/setup/records";
import { NO_SETUP, type AccountSetupResponse } from "@/lib/setup/types";
import { deleteUserData } from "@/lib/users";
import { GET, PUT } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

function put(
  payload: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return PUT(
    new Request("http://localhost/api/setup", {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    }),
  );
}

async function setupOf(res: Response): Promise<AccountSetupResponse["setup"]> {
  return ((await res.json()) as AccountSetupResponse).setup;
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiErrorBody).error.code;
}

describe("/api/setup", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("needs a signed-in account", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await put({ step: "skipped" })).status).toBe(401);
  });

  it("starts with nothing answered, hidden or guessed", async () => {
    await signInAs("ines@example.com");
    expect(await setupOf(await GET())).toEqual(NO_SETUP);
  });

  it("remembers the step on a Free account, and changes only what it is sent", async () => {
    await signInAs("ines@example.com");
    const skipped = await setupOf(await put({ step: "skipped" }));
    expect(skipped).toMatchObject({ stepOutcome: "skipped", checklistHiddenAt: null });
    expect(skipped.stepAt).toEqual(expect.any(Number));

    const hidden = await setupOf(await put({ checklist: "hidden" }));
    expect(hidden).toMatchObject({ stepOutcome: "skipped", stepAt: skipped.stepAt });
    expect(hidden.checklistHiddenAt).toEqual(expect.any(Number));

    expect(await setupOf(await put({ checklist: "shown" }))).toMatchObject({
      stepOutcome: "skipped",
      checklistHiddenAt: null,
    });
    expect(await setupOf(await GET())).toMatchObject({ stepOutcome: "skipped" });
    expect(await (await getDb()).select().from(userSettings)).toHaveLength(1);
  });

  it("keeps each account's setup to itself", async () => {
    await signInAs("ines@example.com");
    await put({ step: "saved", checklist: "hidden" });
    await signInAs("tomas@example.com");
    expect(await setupOf(await GET())).toEqual(NO_SETUP);
  });

  it("confirms Otto's guess without touching anything else", async () => {
    const user = await signInAs("ines@example.com");
    const guessed = await saveSetupDefaults(user.id, {
      place: { country: "GB", from: "device", timeZone: "Europe/London" },
    });
    expect(guessed).toMatchObject({ setup: { guess: { country: "GB", region: "uk" } } });
    await put({ checklist: "hidden" });
    const confirmed = await setupOf(await put({ guess: "confirmed" }));
    expect(confirmed).toMatchObject({ guess: null, defaultsAt: expect.any(Number) });
    expect(confirmed.checklistHiddenAt).toEqual(expect.any(Number));
    expect(await setupOf(await GET())).toMatchObject({ guess: null });
  });

  it("rejects empty or unknown changes and non-JSON or cross-site requests", async () => {
    await signInAs("ines@example.com");
    expect(await errorCode(await put({}))).toBe("bad_request");
    expect(await errorCode(await put({ step: "later" }))).toBe("bad_request");
    expect(await errorCode(await put({ guess: "rejected" }))).toBe("bad_request");
    expect((await put({ step: "saved" }, { "content-type": "text/plain" })).status).toBe(415);
    expect(
      (
        await put(
          { step: "saved" },
          { "content-type": "application/json", "sec-fetch-site": "cross-site" },
        )
      ).status,
    ).toBe(403);
  });

  it("goes with the account, and refuses to write for a deleted one", async () => {
    const user = await signInAs("ines@example.com");
    await put({ step: "saved" });
    await deleteUserData(user.id);
    expect(await (await getDb()).select().from(userSettings)).toHaveLength(0);
    expect((await saveAccountSetup(user.id, { step: "saved" })).status).toBe("no_user");
  });
});
