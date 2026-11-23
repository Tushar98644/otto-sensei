import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiErrorBody } from "@/lib/api/types";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import {
  cookieJar,
  jsonRequest,
  resetDb,
  setPlan,
  signInAs as signInFree,
} from "@/lib/auth/test-helpers";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { findPublicShare } from "@/lib/share/records";
import { SHARE_LIMITS, type ShareResponse, type SharesResponse } from "@/lib/share/types";
import { freezeClock } from "@/lib/timing-testing";
import { DELETE, PATCH } from "./[id]/route";
import { GET, POST } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const signInAs = async (email: string) => setPlan(await signInFree(email), "pro");

function resume(id = "resume-1", updatedAt = 5_000): Resume {
  return {
    ...emptyResume(1_000),
    id,
    basics: {
      name: "Maya Chen",
      headline: "",
      email: "maya@example.com",
      phone: "+1 415 555 0100",
      location: "",
      links: [],
    },
    updatedAt,
  };
}

const create = (body: unknown, options?: Parameters<typeof jsonRequest>[2]) =>
  POST(jsonRequest("/api/share", body, options));

function patch(id: string, body: unknown, headers: Record<string, string> = {}) {
  return PATCH(
    new Request(`http://localhost/api/share/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function remove(id: string, headers: Record<string, string> = {}) {
  return DELETE(new Request(`http://localhost/api/share/${id}`, { method: "DELETE", headers }), {
    params: Promise.resolve({ id }),
  });
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiErrorBody).error.code;
}

describe("share links on Free", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("offers the trial instead of a new link", async () => {
    await signInFree("maya@example.com");
    const res = await create({ resume: resume() });
    expect(res.status).toBe(402);
    expect(((await res.json()) as ApiErrorBody).error).toEqual({
      code: "upgrade_required",
      message: "Share links come with Pro. Try Pro for 7 days.",
    });
    expect(((await (await GET()).json()) as SharesResponse).links).toEqual([]);
  });

  it("keeps a link made on Pro live after the plan ends, in Classic, with its settings open", async () => {
    const maya = await signInAs("maya@example.com");
    const made = await create({ resume: { ...resume(), template: "modern" } });
    const { link } = (await made.json()) as ShareResponse;
    expect((await findPublicShare(link.slug))?.resume.template).toBe("modern");

    await (await getDb()).update(users).set({ plan: "free", planStatus: "canceled" }).where(eq(users.id, maya.id));
    expect((await findPublicShare(link.slug))?.resume.template).toBe("classic");
    expect((await patch(link.id, { showContact: true })).status).toBe(200);
    expect((await create({ resume: { ...resume(), updatedAt: 9_000 } })).status).toBe(402);
    expect((await remove(link.id)).status).toBe(200);
    expect(await findPublicShare(link.slug)).toBeNull();
  });
});

describe("/api/share", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("needs a signed-in account", async () => {
    const list = await GET();
    expect(list.status).toBe(401);
    expect(list.headers.get("cache-control")).toBe("no-store");
    expect((await create({ resume: resume() })).status).toBe(401);
    expect((await patch(crypto.randomUUID(), { showContact: true })).status).toBe(401);
    expect((await remove(crypto.randomUUID())).status).toBe(401);
  });

  it("makes a link, then updates the same one", async () => {
    await signInAs("maya@example.com");
    const first = await create({ resume: resume() });
    expect(first.status).toBe(201);
    const made = (await first.json()) as ShareResponse;
    expect(made.created).toBe(true);
    expect(made.link).toMatchObject({
      resumeId: "resume-1",
      showContact: false,
      allowIndexing: false,
    });

    const second = await create({ resume: resume("resume-1", 8_000), allowIndexing: true });
    expect(second.status).toBe(200);
    const updated = (await second.json()) as ShareResponse;
    expect(updated.link.slug).toBe(made.link.slug);
    expect(updated.link).toMatchObject({ versionAt: 8_000, allowIndexing: true });

    const list = (await (await GET()).json()) as SharesResponse;
    expect(list.links.map((link) => link.id)).toEqual([made.link.id]);
  });

  it("changes options and turns links off, for their owner only", async () => {
    await signInAs("maya@example.com");
    const { link } = (await (await create({ resume: resume() })).json()) as ShareResponse;

    const changed = await patch(link.id, { showContact: true });
    expect(changed.status).toBe(200);
    expect(((await changed.json()) as ShareResponse).link.showContact).toBe(true);
    expect((await findPublicShare(link.slug))?.resume.basics.email).toBe("maya@example.com");

    await signInAs("tom@example.com");
    expect(await errorCode(await patch(link.id, { showContact: false }))).toBe("not_found");
    expect((await remove(link.id)).status).toBe(200);
    expect(await findPublicShare(link.slug)).not.toBeNull();

    await signInAs("maya@example.com");
    expect((await remove(link.id)).status).toBe(200);
    expect(await findPublicShare(link.slug)).toBeNull();
    expect((await remove(link.id)).status).toBe(200);
    expect(await errorCode(await patch(link.id, { showContact: false }))).toBe("not_found");
    expect(await errorCode(await patch("not-a-uuid", { showContact: false }))).toBe("not_found");
  });

  it("rejects bad bodies, non-JSON and other websites", async () => {
    await signInAs("maya@example.com");
    expect(await errorCode(await create({ resume: { id: "x" } }))).toBe("bad_request");
    expect(await errorCode(await create({ resume: resume(), showContact: "yes" }))).toBe(
      "bad_request",
    );
    expect((await create({ resume: resume() }, { contentType: "text/plain" })).status).toBe(415);
    const crossSite = await POST(
      new Request("http://localhost/api/share", {
        method: "POST",
        headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" },
        body: JSON.stringify({ resume: resume() }),
      }),
    );
    expect(crossSite.status).toBe(403);

    const { link } = (await (await create({ resume: resume() })).json()) as ShareResponse;
    expect(await errorCode(await patch(link.id, {}))).toBe("bad_request");
    expect((await remove(link.id, { "sec-fetch-site": "cross-site" })).status).toBe(403);
  });

  it("limits how many links an account makes in an hour", async () => {
    freezeClock();
    await signInAs("maya@example.com");
    for (let index = 0; index < SHARE_LIMITS.writesPerHour; index++) {
      const res = await create({ resume: resume(`r${index % 3}`) });
      expect(res.status).toBeLessThan(300);
    }
    const limited = await create({ resume: resume() });
    expect(limited.status).toBe(429);
    expect(await errorCode(limited)).toBe("rate_limited");
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});
