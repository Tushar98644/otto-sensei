import { AuthRetryableFetchError } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { notifications, userSettings } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { getCurrentUser } from "@/lib/auth/session";
import { cookieJar, createUser, fakeAuth, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { readEmailReminders, setEmailReminders } from "@/lib/notifications/records";
import type {
  MarkNotificationsReadResponse,
  NotificationsResponse,
  ReminderSettingsResponse,
} from "@/lib/notifications/types";
import { unsubscribeToken, unsubscribeUrl } from "@/lib/notifications/unsubscribe";
import { unsubscribeCopy } from "@/lib/notifications/unsubscribe-page";
import { deleteUserData } from "@/lib/users";
import { GET, PATCH } from "./route";
import { GET as getSettings, PUT as putSettings } from "./settings/route";
import { GET as openUnsubscribe, POST as unsubscribe } from "./unsubscribe/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...actual, getCurrentUser: vi.fn(actual.getCurrentUser) };
});

const JSON_TYPE = { "content-type": "application/json" };

function send(
  handler: (req: Request) => Promise<Response>,
  path: string,
  method: string,
  body: unknown,
  headers: Record<string, string> = JSON_TYPE,
): Promise<Response> {
  return handler(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const patch = (body: unknown, headers?: Record<string, string>) =>
  send(PATCH, "/api/notifications", "PATCH", body, headers);
const saveSettings = (body: unknown, headers?: Record<string, string>) =>
  send(putSettings, "/api/notifications/settings", "PUT", body, headers);

type OldEmailChoices = { jobEmails?: boolean; tipEmails?: boolean; viewEmails?: boolean };

// The opt-out choices of the emails no longer sent, as the unsubscribe links leave them.
async function setEmailChoices(userId: string, choices: OldEmailChoices) {
  await (
    await getDb()
  )
    .insert(userSettings)
    .values({ userId, ...choices, updatedAt: 1 })
    .onConflictDoUpdate({ target: userSettings.userId, set: choices });
}

async function emailChoicesOf(userId: string) {
  const [row] = await (
    await getDb()
  )
    .select({
      jobEmails: userSettings.jobEmails,
      tipEmails: userSettings.tipEmails,
      viewEmails: userSettings.viewEmails,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return row ?? { jobEmails: false, tipEmails: true, viewEmails: false };
}

async function errorOf(res: Response): Promise<ApiErrorBody["error"]> {
  return ((await res.json()) as ApiErrorBody).error;
}

async function seed(userId: string, createdAt: number, readAt: number | null = null) {
  const id = crypto.randomUUID();
  await (await getDb()).insert(notifications).values({
    id,
    userId,
    kind: "trial_ending",
    title: `Notice ${createdAt}`,
    body: "Your trial ends tomorrow.",
    link: "/dashboard/account",
    readAt,
    createdAt,
  });
  return id;
}

async function readAtOf(id: string) {
  const [row] = await (
    await getDb()
  )
    .select({ readAt: notifications.readAt })
    .from(notifications)
    .where(eq(notifications.id, id));
  return row?.readAt;
}

async function settingsRowOf(userId: string) {
  const [row] = await (
    await getDb()
  )
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return row ?? null;
}

// The account is deleted from another tab after this request's session check passed.
function deleteAccountAfterSessionCheck(): void {
  const real = vi.mocked(getCurrentUser).getMockImplementation();
  if (!real) throw new Error("getCurrentUser has no implementation");
  vi.mocked(getCurrentUser).mockImplementationOnce(async () => {
    const user = await real();
    if (user) await deleteUserData(user.id);
    return user;
  });
}

function signInOutage(): void {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  fakeAuth.failNext("getUser", new AuthRetryableFetchError("fetch failed at 10.0.0.7", 0));
}

async function databaseDown(method: "transaction" | "update" | "select" | "bell"): Promise<void> {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const db = await getDb();
  // The bell's list is one select (with its unread count); the session's own reads still work.
  if (method === "bell") {
    const select = db.select.bind(db);
    let failed = false;
    vi.spyOn(db, "select").mockImplementation(((fields?: Record<string, unknown>) => {
      if (!failed && fields && "unread" in fields) {
        failed = true;
        throw new Error("database is down");
      }
      return select(fields as never);
    }) as typeof db.select);
    return;
  }
  if (method === "transaction") {
    vi.spyOn(db, "transaction").mockRejectedValueOnce(new Error("database is down"));
    return;
  }
  vi.spyOn(db, method).mockImplementationOnce(() => {
    throw new Error("database is down");
  });
}

async function expectServerError(res: Response, message: string): Promise<void> {
  const text = await res.text();
  expect(res.status).toBe(500);
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(JSON.parse(text)).toEqual({ ok: false, error: { code: "server_error", message } });
  expect(text).not.toContain("10.0.0.7");
  expect(text).not.toContain("database is down");
}

beforeEach(async () => {
  await resetDb();
  cookieJar.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/api/notifications", () => {
  it("lists only the newest 30 while the unread count covers them all", async () => {
    const maya = await signInAs("maya@example.com");
    for (let i = 1; i <= 32; i++) await seed(maya.id, i * 1_000);
    await seed(maya.id, 500, 600);

    const res = await GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as NotificationsResponse;
    expect(body.unread).toBe(32);
    expect(body.notifications).toHaveLength(30);
    expect(body.notifications[0]?.createdAt).toBe(32_000);
    expect(body.notifications.at(-1)?.createdAt).toBe(3_000);
  });

  it("keeps when a notification was first read, and counts nothing for unknown ids", async () => {
    const maya = await signInAs("maya@example.com");
    const old = await seed(maya.id, 1_000, 1_500);
    const fresh = await seed(maya.id, 2_000);

    const unknown = (await (
      await patch({ ids: [crypto.randomUUID()] })
    ).json()) as MarkNotificationsReadResponse;
    expect(unknown).toEqual({ ok: true, unread: 1 });
    expect(await readAtOf(fresh)).toBeNull();

    const all = (await (await patch({ all: true })).json()) as MarkNotificationsReadResponse;
    expect(all.unread).toBe(0);
    expect(await readAtOf(old)).toBe(1_500);
    expect(await readAtOf(fresh)).toBeGreaterThan(1_500);
  });

  it("marks only the listed ids when a body names ids and all at once", async () => {
    const maya = await signInAs("maya@example.com");
    const first = await seed(maya.id, 1_000);
    const second = await seed(maya.id, 2_000);
    const res = (await (
      await patch({ ids: [first], all: true })
    ).json()) as MarkNotificationsReadResponse;
    expect(res.unread).toBe(1);
    expect(await readAtOf(second)).toBeNull();
  });

  it("refuses more than 100 ids, a body that isn't JSON, and another website's request", async () => {
    const maya = await signInAs("maya@example.com");
    const id = await seed(maya.id, 1_000);
    const tooMany = Array.from({ length: 101 }, () => crypto.randomUUID());
    for (const body of [{ ids: [id, ...tooMany.slice(1)] }, "{not json", "null"]) {
      const res = await patch(body);
      expect(res.status).toBe(400);
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(await errorOf(res)).toEqual({
        code: "bad_request",
        message: "Those notifications couldn't be marked as read.",
      });
    }
    const cross = await patch({ all: true }, { ...JSON_TYPE, "sec-fetch-site": "cross-site" });
    expect(cross.status).toBe(403);
    expect(await readAtOf(id)).toBeNull();
  });

  it("checks the body only after the session, so a signed-out bad body still says sign in", async () => {
    const res = await patch({ ids: ["not-a-uuid"] });
    expect(res.status).toBe(401);
    expect(await errorOf(res)).toEqual({
      code: "unauthorized",
      message: "Sign in to see your notifications.",
    });
  });

  it("hides a sign-in outage behind a retry message", async () => {
    await signInAs("maya@example.com");
    signInOutage();
    await expectServerError(await GET(), "Couldn't load your notifications. Please try again.");
    signInOutage();
    await expectServerError(
      await patch({ all: true }),
      "Couldn't mark your notifications as read. Please try again.",
    );
  });

  it("answers 500 when the database fails, leaving every notification unread", async () => {
    const maya = await signInAs("maya@example.com");
    const id = await seed(maya.id, 1_000);
    await databaseDown("bell");
    await expectServerError(await GET(), "Couldn't load your notifications. Please try again.");
    await databaseDown("update");
    await expectServerError(
      await patch({ all: true }),
      "Couldn't mark your notifications as read. Please try again.",
    );
    expect(await readAtOf(id)).toBeNull();
    expect(((await (await GET()).json()) as NotificationsResponse).unread).toBe(1);
  });
});

describe("/api/notifications/settings", () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    resetEnvForTests();
  });

  it("refuses non-JSON and another website's request without saving", async () => {
    const maya = await signInAs("maya@example.com");
    const plain = await saveSettings({ emailReminders: true }, { "content-type": "text/plain" });
    expect(plain.status).toBe(415);
    expect((await errorOf(plain)).code).toBe("unsupported_type");
    const cross = await saveSettings(
      { emailReminders: true },
      { ...JSON_TYPE, origin: "https://elsewhere.example" },
    );
    expect(cross.status).toBe(403);
    expect((await errorOf(cross)).code).toBe("forbidden");
    expect(await settingsRowOf(maya.id)).toBeNull();
  });

  it("answers 401, not an error, when the account is deleted mid-request, and writes nothing", async () => {
    const maya = await signInAs("maya@example.com");
    deleteAccountAfterSessionCheck();
    const read = await getSettings();
    expect(read.status).toBe(401);
    expect(read.headers.get("cache-control")).toBe("no-store");
    expect(await errorOf(read)).toEqual({
      code: "unauthorized",
      message: "Sign in to change your reminders.",
    });

    const sam = await signInAs("sam@example.com");
    deleteAccountAfterSessionCheck();
    const save = await saveSettings({ emailReminders: true });
    expect(save.status).toBe(401);
    expect((await errorOf(save)).code).toBe("unauthorized");
    expect(await settingsRowOf(sam.id)).toBeNull();
    expect(await settingsRowOf(maya.id)).toBeNull();
  });

  it("saves both choices in one request and reads them back as chosen", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Otto Sensei <otto@example.com>";
    resetEnvForTests();
    const maya = await signInAs("maya@example.com");
    const saved = (await (
      await saveSettings({ emailReminders: true, followUpDays: 14 })
    ).json()) as ReminderSettingsResponse;
    expect(saved).toEqual({
      ok: true,
      emailReminders: true,
      followUpDays: 14,
      emailAvailable: true,
      chosen: true,
      promptSnoozed: false,
    });
    expect(await settingsRowOf(maya.id)).toMatchObject({
      emailReminders: true,
      followUpDays: 14,
      remindersChosen: true,
    });
    expect((await (await getSettings()).json()) as ReminderSettingsResponse).toEqual(saved);
  });

  it("rests the reminders card on Not now without making the choice", async () => {
    const maya = await signInAs("maya@example.com");
    const res = await saveSettings({ snoozePrompt: true });
    expect(await res.json()).toMatchObject({ ok: true, chosen: false, promptSnoozed: true });
    expect(await settingsRowOf(maya.id)).toMatchObject({
      emailReminders: false,
      remindersChosen: false,
    });
    expect(await (await getSettings()).json()).toMatchObject({
      chosen: false,
      promptSnoozed: true,
    });
  });

  it("accepts the shortest and longest follow-up gaps", async () => {
    await signInAs("maya@example.com");
    for (const followUpDays of [1, 60]) {
      const res = (await (await saveSettings({ followUpDays })).json()) as ReminderSettingsResponse;
      expect(res.followUpDays).toBe(followUpDays);
    }
  });

  it("hides a sign-in outage or a database failure behind a retry message", async () => {
    const maya = await signInAs("maya@example.com");
    signInOutage();
    await expectServerError(
      await getSettings(),
      "Couldn't load your reminder settings. Please try again.",
    );
    await databaseDown("transaction");
    await expectServerError(
      await saveSettings({ emailReminders: true }),
      "Couldn't save your reminder settings. Please try again.",
    );
    expect(await settingsRowOf(maya.id)).toBeNull();
  });
});

describe("/api/notifications/unsubscribe", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret-0123456789";
    process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
    resetEnvForTests();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_APP_URL;
    resetEnvForTests();
  });

  const oneClick = (query: string) =>
    unsubscribe(
      new Request(`http://localhost/api/notifications/unsubscribe?${query}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "List-Unsubscribe=One-Click",
      }),
    );

  const pressed = (query: string) =>
    unsubscribe(
      new Request(`http://localhost/api/notifications/unsubscribe?${query}&page=1`, {
        method: "POST",
      }),
    );

  function expectPage(res: Response, status: number): void {
    expect(res.status).toBe(status);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  }

  it("shows the invalid-link page for a list's link with no account in it", async () => {
    const maya = await createUser("maya@example.com");
    await setEmailChoices(maya.id, { jobEmails: true });
    const res = await openUnsubscribe(
      new Request(
        `http://localhost/api/notifications/unsubscribe?t=${unsubscribeToken(maya.id, "jobs")}&l=jobs`,
      ),
    );
    expectPage(res, 400);
    const html = await res.text();
    expect(html).toContain("That link isn&#39;t valid any more.");
    expect(html).not.toContain("<form");
    expect(html).toContain('href="https://otto.test/dashboard/account#reminders"');
    expect((await emailChoicesOf(maya.id)).jobEmails).toBe(true);
  });

  it("answers a forged press on the confirm page with the invalid-link page, changing nothing", async () => {
    const maya = await createUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    const res = await pressed(`u=${maya.id}&t=${"A".repeat(43)}&l=reminders`);
    expectPage(res, 400);
    expect(await res.text()).toContain(unsubscribeCopy("en").invalid.replace("'", "&#39;"));
    expect(await readEmailReminders(maya.id)).toBe(true);
  });

  it("asks before turning off reminder emails from a link that names the list, then turns them off", async () => {
    const maya = await createUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    const res = await openUnsubscribe(
      new Request(
        `http://localhost/api/notifications/unsubscribe?u=${maya.id}&t=${unsubscribeToken(maya.id)}&l=reminders`,
      ),
    );
    expectPage(res, 200);
    const html = await res.text();
    expect(html).toContain("Turn off reminder emails");
    expect(await readEmailReminders(maya.id)).toBe(true);

    const action = /action="([^"]+)"/.exec(html)?.[1]?.replaceAll("&amp;", "&");
    const done = await unsubscribe(new Request(`http://localhost${action}`, { method: "POST" }));
    expectPage(done, 200);
    expect(await done.text()).toContain("You won&#39;t get follow-up reminder emails any more.");
    expect(await readEmailReminders(maya.id)).toBe(false);
  });

  it("turns tips off from the confirm page and leaves the other lists alone", async () => {
    const maya = await createUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    await setEmailChoices(maya.id, { jobEmails: true });
    const link = new URL(unsubscribeUrl(maya.id, "tips") ?? "");
    const res = await pressed(link.searchParams.toString());
    expectPage(res, 200);
    expect(await res.text()).toContain("Tips and reminders");
    expect(await emailChoicesOf(maya.id)).toMatchObject({ jobEmails: true, tipEmails: false });
    expect(await readEmailReminders(maya.id)).toBe(true);
  });

  it("answers 500 when the database fails, so the mail server or the visitor can try again", async () => {
    const maya = await createUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    await setEmailChoices(maya.id, { jobEmails: true });

    await databaseDown("transaction");
    const api = await oneClick(`u=${maya.id}&t=${unsubscribeToken(maya.id)}`);
    await expectServerError(api, "Couldn't turn those emails off. Please try again.");
    expect(await readEmailReminders(maya.id)).toBe(true);

    await databaseDown("transaction");
    const page = await pressed(`u=${maya.id}&t=${unsubscribeToken(maya.id, "jobs")}&l=jobs`);
    expectPage(page, 500);
    const html = await page.text();
    expect(html).toContain("The weekly jobs email");
    expect(html).toContain("Couldn&#39;t turn those emails off. Please try again.");
    expect(html).not.toContain("database is down");
    expect((await emailChoicesOf(maya.id)).jobEmails).toBe(true);

    expect((await oneClick(`u=${maya.id}&t=${unsubscribeToken(maya.id)}`)).status).toBe(200);
    expect(await readEmailReminders(maya.id)).toBe(false);
  });

  it("answers done for an account that's already deleted, without writing a row for it", async () => {
    const maya = await createUser("maya@example.com");
    const token = unsubscribeToken(maya.id);
    await deleteUserData(maya.id);
    const res = await oneClick(`u=${maya.id}&t=${token}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(await settingsRowOf(maya.id)).toBeNull();
  });
});
