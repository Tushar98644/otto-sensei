import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { notifications } from "@/db/schema";
import type { ApiErrorBody } from "@/lib/api/types";
import { cookieJar, createUser, resetDb, signInAs } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type {
  MarkNotificationsReadResponse,
  NotificationsResponse,
  ReminderSettingsResponse,
} from "@/lib/notifications/types";
import { readEmailReminders, setEmailReminders } from "@/lib/notifications/records";
import { unsubscribeToken } from "@/lib/notifications/unsubscribe";
import { GET, PATCH } from "./route";
import { GET as getSettings, PUT as putSettings } from "./settings/route";
import { GET as openUnsubscribe, POST as unsubscribe } from "./unsubscribe/route";

vi.mock("next/headers", async () => (await import("@/lib/auth/test-helpers")).nextHeadersMock);

const JSON_TYPE = { "content-type": "application/json" };

async function seed(userId: string, createdAt: number, readAt: number | null = null) {
  const id = crypto.randomUUID();
  await (await getDb()).insert(notifications).values({
    id,
    userId,
    kind: "application_follow_up",
    title: `Notice ${createdAt}`,
    body: "Stripe hasn't replied in 3 weeks. Mark it as no reply?",
    link: "/dashboard/applications",
    readAt,
    createdAt,
  });
  return id;
}

function patch(body: unknown, headers: Record<string, string> = JSON_TYPE) {
  return PATCH(
    new Request("http://localhost/api/notifications", {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

function put(body: unknown) {
  return putSettings(
    new Request("http://localhost/api/notifications/settings", {
      method: "PUT",
      headers: JSON_TYPE,
      body: JSON.stringify(body),
    }),
  );
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiErrorBody).error.code;
}

describe("/api/notifications", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  it("needs a signed-in account", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await patch({ all: true })).status).toBe(401);
  });

  it("lists the newest first with the unread count, and only the account's own", async () => {
    const other = await createUser("other@example.com");
    await seed(other.id, 5_000);
    const maya = await signInAs("maya@example.com");
    await seed(maya.id, 1_000, 1_500);
    await seed(maya.id, 3_000);
    await seed(maya.id, 2_000);

    const body = (await (await GET()).json()) as NotificationsResponse;
    expect(body.unread).toBe(2);
    expect(body.notifications.map((item) => item.createdAt)).toEqual([3_000, 2_000, 1_000]);
    expect(body.notifications[0]).toMatchObject({
      kind: "application_follow_up",
      link: "/dashboard/applications",
      readAt: null,
    });
  });

  it("marks chosen ones, or all, as read, never another account's", async () => {
    const other = await createUser("other@example.com");
    const theirs = await seed(other.id, 1_000);
    const maya = await signInAs("maya@example.com");
    const first = await seed(maya.id, 1_000);
    await seed(maya.id, 2_000);

    const one = (await (await patch({ ids: [first, theirs] })).json()) as MarkNotificationsReadResponse;
    expect(one.unread).toBe(1);
    const all = (await (await patch({ all: true })).json()) as MarkNotificationsReadResponse;
    expect(all.unread).toBe(0);

    const [still] = await (await getDb())
      .select({ readAt: notifications.readAt })
      .from(notifications)
      .where(eq(notifications.id, theirs));
    expect(still?.readAt).toBeNull();
  });

  it("rejects bad bodies and non-JSON requests", async () => {
    await signInAs("maya@example.com");
    expect(await errorCode(await patch({ ids: ["not-a-uuid"] }))).toBe("bad_request");
    expect(await errorCode(await patch({ ids: [] }))).toBe("bad_request");
    expect(await errorCode(await patch({ all: false }))).toBe("bad_request");
    expect((await patch({ all: true }, { "content-type": "text/plain" })).status).toBe(415);
  });
});

describe("/api/notifications/settings", () => {
  beforeEach(async () => {
    await resetDb();
    cookieJar.clear();
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    resetEnvForTests();
  });

  it("needs a signed-in account", async () => {
    expect((await getSettings()).status).toBe(401);
    expect((await put({ emailReminders: false })).status).toBe(401);
  });

  it("starts with email off and a 7-day follow-up, and changes only what it is sent", async () => {
    await signInAs("maya@example.com");
    const initial = (await (await getSettings()).json()) as ReminderSettingsResponse;
    expect(initial).toMatchObject({
      emailReminders: false,
      followUpDays: 7,
      emailAvailable: false,
      chosen: false,
    });

    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Otto Sensei <otto@example.com>";
    resetEnvForTests();
    const later = (await (await put({ followUpDays: 10 })).json()) as ReminderSettingsResponse;
    expect(later).toMatchObject({
      emailReminders: false,
      followUpDays: 10,
      emailAvailable: true,
      chosen: true,
    });

    const on = (await (await put({ emailReminders: true })).json()) as ReminderSettingsResponse;
    expect(on).toMatchObject({ emailReminders: true, followUpDays: 10 });
    const off = (await (await put({ emailReminders: false })).json()) as ReminderSettingsResponse;
    expect(off.emailReminders).toBe(false);
    expect((await (await getSettings()).json()) as ReminderSettingsResponse).toMatchObject({
      followUpDays: 10,
      chosen: true,
    });

    for (const body of [{ emailReminders: "no" }, {}, { followUpDays: 0 }, { followUpDays: 61 }, { followUpDays: 2.5 }]) {
      expect(await errorCode(await put(body))).toBe("bad_request");
    }
  });
});

describe("/api/notifications/unsubscribe", () => {
  beforeEach(async () => {
    await resetDb();
    process.env.CRON_SECRET = "test-cron-secret-0123456789";
    process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
    resetEnvForTests();
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_APP_URL;
    resetEnvForTests();
  });

  function oneClick(query: string) {
    return unsubscribe(
      new Request(`http://localhost/api/notifications/unsubscribe?${query}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "sec-fetch-site": "cross-site" },
        body: "List-Unsubscribe=One-Click",
      }),
    );
  }

  const remindersOf = (userId: string) => readEmailReminders(userId);

  it("turns reminder emails off from a signed one-click link", async () => {
    const maya = await createUser("maya@example.com");
    await setEmailReminders(maya.id, true);
    const res = await oneClick(`u=${maya.id}&t=${unsubscribeToken(maya.id)}`);
    expect(res.status).toBe(200);
    expect(await remindersOf(maya.id)).toBe(false);
  });

  it("refuses a link signed for someone else, a bad token or a bad id", async () => {
    const maya = await createUser("maya@example.com");
    const sam = await createUser("sam@example.com");
    await setEmailReminders(maya.id, true);
    for (const query of [
      `u=${maya.id}&t=${unsubscribeToken(sam.id)}`,
      `u=${maya.id}&t=${"A".repeat(43)}`,
      `u=${maya.id}`,
      `u=not-a-user&t=${unsubscribeToken(maya.id)}`,
    ]) {
      expect((await oneClick(query)).status).toBe(400);
    }
    expect(await remindersOf(maya.id)).toBe(true);
  });

  it("refuses every link once the secret is gone", async () => {
    const maya = await createUser("maya@example.com");
    const token = unsubscribeToken(maya.id);
    delete process.env.CRON_SECRET;
    resetEnvForTests();
    expect((await oneClick(`u=${maya.id}&t=${token}`)).status).toBe(400);
  });

  it("sends a plain visit to the Account page's switch without changing anything", async () => {
    const res = openUnsubscribe();
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://otto.test/dashboard/account#reminders");
  });
});
