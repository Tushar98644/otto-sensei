import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { notifications, portfolios, resumes, shares } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { resetEnvForTests } from "@/lib/env";
import { sampleResume } from "@/lib/portfolio/testing";
import { newSlug } from "@/lib/share/records";
import { DAY_MS } from "@/lib/time";
import {
  noteShareView,
  portfolioViewsNotice,
  runViewAlerts,
  shareViewNotice,
  VIEW_ALERTS,
} from "./view-alerts";

const NOW = Date.UTC(2026, 10, 22, 13, 15);
const context = (now = NOW) => ({ now, deadline: Date.now() + 30_000 });

async function share(userId: string, overrides: Partial<typeof shares.$inferInsert> = {}) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.insert(shares).values({
    id,
    userId,
    resumeId: "resume-1",
    slug: newSlug(),
    snapshot: sampleResume(),
    views: 1,
    createdAt: NOW - 10 * DAY_MS,
    updatedAt: NOW - 10 * DAY_MS,
    ...overrides,
  });
  return id;
}

async function portfolio(userId: string, overrides: Partial<typeof portfolios.$inferInsert> = {}) {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.insert(portfolios).values({
    id,
    userId,
    resumeId: "resume-1",
    slug: `maya-${id.slice(0, 8)}`,
    snapshot: sampleResume(),
    published: true,
    publishedAt: NOW - 20 * DAY_MS,
    createdAt: NOW - 20 * DAY_MS,
    updatedAt: NOW - 20 * DAY_MS,
    ...overrides,
  });
  return id;
}

async function bell(userId: string) {
  const db = await getDb();
  return db
    .select({
      kind: notifications.kind,
      title: notifications.title,
      body: notifications.body,
      link: notifications.link,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId));
}

beforeEach(async () => {
  await resetDb();
  process.env.CRON_SECRET = "test-cron-secret";
  process.env.NEXT_PUBLIC_APP_URL = "https://otto.test";
  resetEnvForTests();
});

describe("the notices", () => {
  it("say how many views, never who", () => {
    expect(shareViewNotice("Maya Chen, Stripe", 3, "en")).toEqual({
      title: "Someone opened your resume link",
      body: "Your link for “Maya Chen, Stripe” has 3 views so far.",
      link: "/dashboard/resumes",
    });
    expect(shareViewNotice("", 1, "en").body).toBe("Your resume link has 1 view so far.");
  });

  it("call a week a week, and name the day a longer stretch starts", () => {
    expect(portfolioViewsNotice(12, NOW - 7 * DAY_MS, NOW, "en").title).toBe(
      "Your portfolio got 12 views this week",
    );
    expect(portfolioViewsNotice(1, Date.UTC(2026, 10, 2), NOW, "en").title).toBe(
      "Your portfolio got 1 view since Nov 2",
    );
  });

  it("speak the owner's language", () => {
    expect(shareViewNotice("Maya Chen, Stripe", 1_204, "de")).toMatchObject({
      title: "Jemand hat deinen Lebenslauf-Link geöffnet",
      body: "Dein Link für „Maya Chen, Stripe“ hat bisher 1.204 Aufrufe.",
    });
    expect(portfolioViewsNotice(1, Date.UTC(2026, 10, 2), NOW, "es").title).toBe(
      "Tu portafolio tuvo 1 visita desde el 2 nov",
    );
    expect(portfolioViewsNotice(12, NOW - 7 * DAY_MS, NOW, "de").title).toBe(
      "Dein Portfolio hatte diese Woche 12 Aufrufe",
    );
  });
});

describe("noteShareView", () => {
  it("rings the bell once a day per link, named the way the owner named the resume", async () => {
    const maya = await createUser("maya@example.com");
    const db = await getDb();
    await db.insert(resumes).values({
      userId: maya.id,
      id: "resume-1",
      data: { ...sampleResume(), title: "Stripe, product design" },
      createdAt: NOW,
      updatedAt: NOW,
    });
    const id = await share(maya.id, { views: 2 });
    expect(await noteShareView(id, maya.id, NOW)).toBe(true);
    expect(await noteShareView(id, maya.id, NOW + 3 * 60 * 60 * 1000)).toBe(false);
    expect(await bell(maya.id)).toEqual([
      {
        kind: "share_viewed",
        title: "Someone opened your resume link",
        body: "Your link for “Stripe, product design” has 2 views so far.",
        link: "/dashboard/resumes",
      },
    ]);
    expect(await noteShareView(id, maya.id, NOW + VIEW_ALERTS.shareEveryMs)).toBe(true);
    expect(await bell(maya.id)).toHaveLength(2);
  });

  it("falls back to the name on the resume, and stays quiet for a link that was turned off", async () => {
    const maya = await createUser("maya@example.com");
    const open = await share(maya.id);
    const off = await share(maya.id, { revokedAt: NOW - DAY_MS });
    expect(await noteShareView(open, maya.id, NOW)).toBe(true);
    expect(await noteShareView(off, maya.id, NOW)).toBe(false);
    expect((await bell(maya.id)).map((row) => row.body)).toEqual([
      "Your link for “Maya Chen” has 1 view so far.",
    ]);
  });

  it("never alerts anyone but the link's owner", async () => {
    const maya = await createUser("maya@example.com");
    const ada = await createUser("ada@example.com");
    const id = await share(maya.id);
    expect(await noteShareView(id, ada.id, NOW)).toBe(false);
    expect(await bell(ada.id)).toEqual([]);
  });
});

describe("runViewAlerts", () => {
  it("counts a live portfolio's views once a week, and moves on when nothing is new", async () => {
    const maya = await createUser("maya@example.com");
    const ada = await createUser("ada@example.com");
    await portfolio(maya.id, { views: 15, viewsNoted: 3, viewsNotedAt: NOW - 7 * DAY_MS });
    await portfolio(ada.id, { views: 4, viewsNoted: 4, viewsNotedAt: NOW - 7 * DAY_MS });
    const first = await runViewAlerts(context());
    expect(first.stats).toMatchObject({ portfoliosChecked: 2, portfolioAlerts: 1 });
    expect(await bell(maya.id)).toEqual([
      {
        kind: "portfolio_views",
        title: "Your portfolio got 12 views this week",
        body: "Counted without you, link previews or search engines.",
        link: "/dashboard/portfolio",
      },
    ]);
    expect(await bell(ada.id)).toEqual([]);
    const again = await runViewAlerts(context(NOW + DAY_MS));
    expect(again.stats).toMatchObject({ portfoliosChecked: 0, portfolioAlerts: 0 });
  });

  it("leaves hidden pages and pages checked this week alone", async () => {
    const maya = await createUser("maya@example.com");
    const ada = await createUser("ada@example.com");
    await portfolio(maya.id, { published: false, views: 9 });
    await portfolio(ada.id, { views: 9, viewsNotedAt: NOW - 2 * DAY_MS });
    expect((await runViewAlerts(context())).stats).toMatchObject({
      portfoliosChecked: 0,
    });
  });
});
