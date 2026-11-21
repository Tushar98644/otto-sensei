import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { users, writingStyles } from "@/db/schema";
import { execSql } from "@/db/testing";
import type { ApiErrorBody } from "@/lib/api/types";
import {
  AUTH_COOKIE,
  cookieJar,
  fakeAuth,
  resetDb,
  setPlan,
  signInAs,
} from "@/lib/auth/test-helpers";
import { deleteUserData } from "@/lib/users";
import {
  DEFAULT_WRITING_STYLE,
  STYLE_LIMITS,
  type WritingStyleBody,
  type WritingStyleResponse,
} from "@/lib/writing-style/schema";
import { GET, PUT } from "./route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const STYLE: WritingStyleBody = {
  tone: "direct",
  length: "shorter",
  spelling: "uk",
  signOff: "Best",
  notes: "Keep it to the point.",
};

const JSON_TYPE = { "content-type": "application/json" };
const INVALID =
  "Otto couldn't save that. Keep the sign-off to 40 characters and your notes to 500.";

function putRaw(body: BodyInit, headers: Record<string, string> = JSON_TYPE) {
  return PUT(new Request("http://localhost/api/writing-style", { method: "PUT", headers, body }));
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
  return PUT(new Request("http://localhost/api/writing-style", init));
}

async function styleOf(res: Response): Promise<WritingStyleResponse["style"]> {
  return ((await res.json()) as WritingStyleResponse).style;
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function styleRows() {
  return (await getDb()).select().from(writingStyles);
}

describe("/api/writing-style when something fails", () => {
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
    await execSql("alter table public.writing_styles rename to writing_styles_away");
    let res: Response;
    try {
      res = await GET();
    } finally {
      await execSql("alter table public.writing_styles_away rename to writing_styles");
    }
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Couldn't load your writing style. Please try again.",
    });
    const output = JSON.stringify(logged.mock.calls);
    expect(output).toContain("writing_style.read_failed");
    expect(output).toContain("does not exist");
    expect(output).not.toContain("ines@example.com");
    expect(await styleOf(await GET())).toEqual(DEFAULT_WRITING_STYLE);
  });

  it("keeps the saved style as it was when a save fails, and keeps the notes out of the log", async () => {
    await signInAs("ines@example.com");
    const before = await styleOf(await put(STYLE));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await execSql(
      "create function fail_write() returns trigger language plpgsql as $$ begin raise exception 'disk full'; end $$",
    );
    await execSql(
      "create trigger fail_write before insert or update on public.writing_styles for each row execute function fail_write()",
    );
    let res: Response;
    try {
      res = await put({ ...STYLE, tone: "formal", notes: "Mention my visa status." });
    } finally {
      await execSql("drop trigger fail_write on public.writing_styles");
      await execSql("drop function fail_write()");
    }
    expect(res.status).toBe(500);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "server_error",
      message: "Couldn't save your writing style. Please try again.",
    });
    const output = JSON.stringify(logged.mock.calls);
    expect(output).toContain("writing_style.save_failed");
    expect(output).toContain("disk full");
    expect(output).not.toContain("visa status");
    expect(await styleOf(await GET())).toEqual(before);
  });

  it("treats a Supabase outage as an error, not as signed out, so the next try still works", async () => {
    await signInAs("ines@example.com");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 0));
    const read = await GET();
    expect(read.status).toBe(500);
    expect((await errorOf(read)).code).toBe("server_error");

    fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed", 0));
    const save = await put(STYLE);
    expect(save.status).toBe(500);
    expect(save.headers.get("cache-control")).toBe("no-store");
    expect(await styleRows()).toHaveLength(0);

    expect(cookieJar.get(AUTH_COOKIE)?.value).toBeTruthy();
    expect(await styleOf(await put(STYLE))).toMatchObject(STYLE);
  });

  it("refuses a save for an account deleted while the request was on its way", async () => {
    const user = await signInAs("ines@example.com");
    const res = await putWhileDeleting(user.id, STYLE);
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to change your writing style.",
    });
    expect(await styleRows()).toHaveLength(0);
    expect(await (await getDb()).select().from(users).where(eq(users.id, user.id))).toHaveLength(0);
  });
});

describe("/api/writing-style input", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("answers a body that isn't JSON, or is far too large, with the limits and saves nothing", async () => {
    await signInAs("ines@example.com");
    for (const res of [
      await putRaw("{tone: warm"),
      await putRaw(""),
      await put(null),
      await put({ ...STYLE, padding: "x".repeat(600 * 1024) }),
      await put({ ...STYLE, spelling: "au" }),
      await put({ ...STYLE, length: "longer" }),
      await put({ ...STYLE, notes: 42 }),
    ]) {
      expect(res.status).toBe(400);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(await errorOf(res)).toEqual({ code: "bad_request", message: INVALID });
    }
    expect(await styleRows()).toHaveLength(0);
  });

  it("takes a sign-off and notes right at the limits", async () => {
    await signInAs("ines@example.com");
    const signOff = "S".repeat(STYLE_LIMITS.signOff);
    const notes = "n".repeat(STYLE_LIMITS.notes);
    const style = await styleOf(await put({ ...STYLE, signOff, notes }));
    expect(style).toMatchObject({ signOff, notes });
    expect(await styleOf(await GET())).toMatchObject({ signOff, notes });
  });

  it("saves a blank sign-off and notes, and a sign-off of only spaces comes back empty", async () => {
    await signInAs("ines@example.com");
    const style = await styleOf(await put({ ...STYLE, signOff: " \n\t ", notes: "\n  \n" }));
    expect(style).toEqual({ ...STYLE, signOff: "", notes: "", updatedAt: expect.any(Number) });
  });

  it("keeps line breaks inside the notes while it trims their ends", async () => {
    await signInAs("ines@example.com");
    const style = await styleOf(await put({ ...STYLE, notes: "\n First line.\nSecond line. \n" }));
    expect(style.notes).toBe("First line.\nSecond line.");
  });

  it("goes back to Otto's defaults when they are saved again", async () => {
    await signInAs("ines@example.com");
    await put(STYLE);
    const { updatedAt: _updatedAt, ...defaults } = DEFAULT_WRITING_STYLE;
    void _updatedAt;
    const style = await styleOf(await put(defaults));
    expect(style).toEqual({ ...DEFAULT_WRITING_STYLE, updatedAt: expect.any(Number) });
    expect(await styleRows()).toHaveLength(1);
  });

  it("turns away another website by its Origin, and lets the app's own pages through", async () => {
    await signInAs("ines@example.com");
    const elsewhere = await put(STYLE, { ...JSON_TYPE, origin: "https://elsewhere.example" });
    expect(elsewhere.status).toBe(403);
    expect((await errorOf(elsewhere)).code).toBe("forbidden");
    expect(await styleRows()).toHaveLength(0);

    const own = await put(STYLE, { ...JSON_TYPE, origin: "http://localhost" });
    expect(own.status).toBe(200);
    expect(await styleRows()).toHaveLength(1);
  });

  it("is open on every plan, Free included", async () => {
    const user = await signInAs("ines@example.com");
    expect(await styleOf(await put(STYLE))).toMatchObject(STYLE);
    await setPlan(user, "max");
    expect(await styleOf(await put({ ...STYLE, tone: "warm" }))).toMatchObject({ tone: "warm" });
  });
});
