import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { userSettings } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { deleteUserData } from "@/lib/users";
import { saveWritingStyle } from "@/lib/writing-style/records";
import {
  DEFAULT_WRITING_STYLE,
  STYLE_LIMITS,
  type WritingStyleBody,
  type WritingStyleResponse,
} from "@/lib/writing-style/schema";
import { GET, PUT } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const STYLE: WritingStyleBody = {
  tone: "warm",
  length: "shorter",
  spelling: "uk",
  signOff: "Kind regards",
  notes: "Mention that I prefer remote work.",
};

function put(
  payload: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
) {
  return PUT(
    new Request("http://localhost/api/writing-style", {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    }),
  );
}

async function styleOf(res: Response): Promise<WritingStyleResponse["style"]> {
  return ((await res.json()) as WritingStyleResponse).style;
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiErrorBody).error.code;
}

describe("/api/writing-style", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("needs a signed-in account", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await put(STYLE)).status).toBe(401);
  });

  it("starts with Otto's default style", async () => {
    await signInAs("ines@example.com");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await styleOf(res)).toEqual(DEFAULT_WRITING_STYLE);
  });

  it("saves a style, tidies the text and reads it back", async () => {
    await signInAs("ines@example.com");
    const saved = await styleOf(
      await put({ ...STYLE, signOff: "  Kind\n regards ", notes: `  ${STYLE.notes}\n` }),
    );
    expect(saved).toEqual({ ...STYLE, updatedAt: expect.any(Number) });
    expect(await styleOf(await GET())).toEqual(saved);

    const changed = await styleOf(await put({ ...STYLE, tone: "formal", notes: "" }));
    expect(changed).toMatchObject({ tone: "formal", notes: "", signOff: "Kind regards" });
    expect(await (await getDb()).select().from(userSettings)).toHaveLength(1);
  });

  it("keeps each account's style to itself", async () => {
    await signInAs("ines@example.com");
    await put(STYLE);
    await signInAs("tomas@example.com");
    expect(await styleOf(await GET())).toEqual(DEFAULT_WRITING_STYLE);
  });

  it("rejects unknown choices, missing fields and over-long text", async () => {
    await signInAs("ines@example.com");
    expect(await errorCode(await put({ ...STYLE, tone: "playful" }))).toBe("bad_request");
    expect(await errorCode(await put({ tone: "warm" }))).toBe("bad_request");
    expect(
      await errorCode(await put({ ...STYLE, signOff: "a".repeat(STYLE_LIMITS.signOff + 1) })),
    ).toBe("bad_request");
    const res = await put({ ...STYLE, notes: "a".repeat(STYLE_LIMITS.notes + 1) });
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await styleOf(await GET())).toEqual(DEFAULT_WRITING_STYLE);
  });

  it("refuses non-JSON and cross-site requests", async () => {
    await signInAs("ines@example.com");
    expect((await put(STYLE, { "content-type": "text/plain" })).status).toBe(415);
    const crossSite = await put(STYLE, {
      "content-type": "application/json",
      "sec-fetch-site": "cross-site",
    });
    expect(crossSite.status).toBe(403);
    expect(await styleOf(await GET())).toEqual(DEFAULT_WRITING_STYLE);
  });

  it("goes with the account, and refuses to write for a deleted one", async () => {
    const user = await signInAs("ines@example.com");
    await put(STYLE);
    await deleteUserData(user.id);
    expect(await (await getDb()).select().from(userSettings)).toHaveLength(0);
    expect(await saveWritingStyle(user.id, STYLE)).toBeNull();
  });
});
