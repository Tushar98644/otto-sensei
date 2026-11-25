import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import type { FollowUpAction } from "@/lib/notifications/types";
import { followUpActionUrl, unsubscribePageUrl } from "@/lib/notifications/unsubscribe";
import type { ReminderRequest } from "./_components/reminder-action";
import ReminderPage from "./page";
import { reminderJob } from "./records";

async function seed(userId: string, role = "Product Designer") {
  const id = crypto.randomUUID();
  const now = Date.now();
  await (await getDb()).insert(applications).values({
    id,
    userId,
    company: "Northwind",
    role,
    appliedAt: now,
    statusChangedAt: now,
    followUpAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

function params(link: string | null): Record<string, string> {
  return Object.fromEntries(new URL(link ?? "https://otto.test/reminder").searchParams);
}

function requestFrom(link: string | null): Extract<ReminderRequest, { a: string }> {
  const p = params(link);
  return { kind: p.do as FollowUpAction, u: p.u ?? "", a: p.a ?? "", t: p.t ?? "" };
}

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#x27;", "'")
    .replace(/\s+/g, " ");

describe("reminderJob", () => {
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

  it("reads the company and role from a signed reminder link", async () => {
    const maya = await createUser("maya@example.com");
    const id = await seed(maya.id);
    for (const act of ["done", "snooze"] as const) {
      await expect(reminderJob(requestFrom(followUpActionUrl(maya.id, id, act)))).resolves.toEqual({
        company: "Northwind",
        role: "Product Designer",
      });
    }
  });

  it("reads nothing for a link it didn't sign, or for another account's application", async () => {
    const maya = await createUser("maya@example.com");
    const ben = await createUser("ben@example.com");
    const id = await seed(maya.id);
    const done = requestFrom(followUpActionUrl(maya.id, id, "done"));
    await expect(reminderJob({ ...done, kind: "snooze" })).resolves.toBeNull();
    await expect(reminderJob({ ...done, t: "A".repeat(43) })).resolves.toBeNull();
    await expect(
      reminderJob(requestFrom(followUpActionUrl(ben.id, id, "done"))),
    ).resolves.toBeNull();
    await expect(reminderJob(null)).resolves.toBeNull();
    const unsubscribe = params(unsubscribePageUrl(maya.id));
    await expect(
      reminderJob({ kind: "unsubscribe", u: unsubscribe.u ?? "", t: unsubscribe.t ?? "" }),
    ).resolves.toBeNull();
  });

  it("reads nothing once the server has no signing secret", async () => {
    const maya = await createUser("maya@example.com");
    const id = await seed(maya.id);
    const done = requestFrom(followUpActionUrl(maya.id, id, "done"));
    delete process.env.CRON_SECRET;
    resetEnvForTests();
    await expect(reminderJob(done)).resolves.toBeNull();
  });

  it("names the job on the page, and keeps the plain question when it can't", async () => {
    const maya = await createUser("maya@example.com");
    const id = await seed(maya.id);
    const named = await ReminderPage({
      searchParams: Promise.resolve(params(followUpActionUrl(maya.id, id, "done"))),
    });
    expect(text(renderToStaticMarkup(named))).toContain(
      "Followed up with Northwind about the Product Designer job?",
    );
    const snoozed = await ReminderPage({
      searchParams: Promise.resolve(params(followUpActionUrl(maya.id, id, "snooze"))),
    });
    expect(text(renderToStaticMarkup(snoozed))).toContain(
      "Not ready to follow up with Northwind yet?",
    );
    const noRole = await seed(maya.id, "");
    const companyOnly = await ReminderPage({
      searchParams: Promise.resolve(params(followUpActionUrl(maya.id, noRole, "done"))),
    });
    expect(text(renderToStaticMarkup(companyOnly))).toContain("Followed up with Northwind? Mark");
    const forged = await ReminderPage({
      searchParams: Promise.resolve({ do: "done", u: maya.id, a: id, t: "A".repeat(43) }),
    });
    const html = text(renderToStaticMarkup(forged));
    expect(html).toContain("Followed up on this one?");
    expect(html).not.toContain("Northwind");
  });
});
