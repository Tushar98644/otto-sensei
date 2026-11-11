import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { rateLimits, shares } from "@/db/schema";
import { createUser, resetDb } from "@/lib/auth/test-helpers";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { deleteUserData } from "@/lib/users";
import { openSharePage, PAGE_OPENS_PER_MINUTE } from "./page";
import {
  VIEW_LIMITS,
  findPublicShare,
  listShares,
  newSlug,
  readerKey,
  recordView,
  revokeShare,
  saveShare,
  updateShareOptions,
} from "./records";
import { SHARE_LIMITS, SHARE_SLUG } from "./types";

const NOW = 1_800_000_000_000;

function resume(id = "resume-1", updatedAt = 5_000): Resume {
  return {
    ...emptyResume(1_000),
    id,
    title: "My private title",
    basics: {
      name: "Maya Chen",
      headline: "Product designer",
      email: "maya@example.com",
      phone: "+1 415 555 0100",
      location: "Lisbon",
      links: [],
    },
    summary: "Designs calm tools.",
    updatedAt,
  };
}

const share = (
  userId: string,
  input: Partial<{ resume: Resume; showContact: boolean; allowIndexing: boolean }> = {},
  now = NOW,
) =>
  saveShare(userId, { resume: resume(), showContact: false, allowIndexing: false, ...input }, now);

async function saved(userId: string, input?: Parameters<typeof share>[1], now?: number) {
  const result = await share(userId, input, now);
  if (result.status !== "saved") throw new Error(`expected saved, got ${result.status}`);
  return result;
}

describe("share records", () => {
  beforeEach(resetDb);

  it("makes random, URL-safe slugs", () => {
    const slugs = new Set(Array.from({ length: 200 }, () => newSlug()));
    expect(slugs.size).toBe(200);
    for (const slug of slugs) {
      expect(slug).toHaveLength(SHARE_LIMITS.slugLength);
      expect(SHARE_SLUG.test(slug)).toBe(true);
    }
  });

  it("makes one link per resume and points it at the newest version", async () => {
    const user = await createUser();
    const first = await saved(user.id);
    expect(first.created).toBe(true);
    expect(first.link).toMatchObject({
      resumeId: "resume-1",
      name: "Maya Chen",
      versionAt: 5_000,
      showContact: false,
      views: 0,
      lastViewedAt: null,
      createdAt: NOW,
    });

    const again = await saved(
      user.id,
      { resume: resume("resume-1", 9_000), showContact: true },
      NOW + 1,
    );
    expect(again.created).toBe(false);
    expect(again.link.slug).toBe(first.link.slug);
    expect(again.link.versionAt).toBe(9_000);
    expect(again.link.showContact).toBe(true);
    expect(await listShares(user.id)).toHaveLength(1);
  });

  it("stores the shared copy without hidden content, tailoring or the file's own title", async () => {
    const user = await createUser();
    const tailored: Resume = {
      ...resume(),
      tailor: { baseResumeId: "b", jobTitle: "Lead", company: "Acme", keywords: [], createdAt: 1 },
    };
    const { link } = await saved(user.id, { resume: tailored });
    const [row] = await (await getDb()).select().from(shares).where(eq(shares.id, link.id));
    expect(row?.snapshot?.tailor).toBeNull();
    expect(row?.snapshot?.title).toBe("");
  });

  it("lists newest first and keeps each account's links to itself", async () => {
    const maya = await createUser("maya@example.com");
    const tom = await createUser("tom@example.com");
    await saved(maya.id, { resume: resume("a") }, NOW);
    await saved(maya.id, { resume: resume("b") }, NOW + 10);
    const tomLink = await saved(tom.id, { resume: resume("a") }, NOW);

    expect((await listShares(maya.id)).map((link) => link.resumeId)).toEqual(["b", "a"]);
    expect(await updateShareOptions(maya.id, tomLink.link.id, { showContact: true })).toBeNull();
    expect(await revokeShare(maya.id, tomLink.link.id)).toBe(false);
    expect((await listShares(tom.id))[0]?.showContact).toBe(false);
  });

  it(`stops at ${SHARE_LIMITS.live} live links, but still updates one that exists`, async () => {
    const user = await createUser();
    const db = await getDb();
    await db.insert(shares).values(
      Array.from({ length: SHARE_LIMITS.live }, (_, index) => ({
        id: crypto.randomUUID(),
        userId: user.id,
        resumeId: `r${index}`,
        slug: newSlug(),
        snapshot: resume(`r${index}`),
        createdAt: NOW,
        updatedAt: NOW,
      })),
    );
    expect((await share(user.id, { resume: resume("one-more") })).status).toBe("limit_reached");
    expect((await share(user.id, { resume: resume("r3", 7_000) })).status).toBe("saved");
  });

  it("refuses to write for a deleted account, and goes with it", async () => {
    const user = await createUser();
    await saved(user.id);
    await deleteUserData(user.id);
    expect(await (await getDb()).select().from(shares)).toHaveLength(0);
    expect((await share(user.id)).status).toBe("no_user");
  });

  it("changes what a live link shows", async () => {
    const user = await createUser();
    const { link } = await saved(user.id);
    const changed = await updateShareOptions(user.id, link.id, { allowIndexing: true }, NOW + 5);
    expect(changed).toMatchObject({ allowIndexing: true, showContact: false, updatedAt: NOW + 5 });
    expect((await findPublicShare(link.slug))?.allowIndexing).toBe(true);
  });

  it("turns a link off for good and deletes its copy of the resume", async () => {
    const user = await createUser();
    const { link } = await saved(user.id);
    expect(await revokeShare(user.id, link.id, NOW + 1)).toBe(true);
    expect(await revokeShare(user.id, link.id, NOW + 2)).toBe(false);
    expect(await findPublicShare(link.slug)).toBeNull();
    expect(await listShares(user.id)).toEqual([]);
    expect(await updateShareOptions(user.id, link.id, { showContact: true })).toBeNull();
    const [row] = await (await getDb()).select().from(shares).where(eq(shares.id, link.id));
    expect(row).toMatchObject({ snapshot: null, revokedAt: NOW + 1 });

    const fresh = await saved(user.id, undefined, NOW + 3);
    expect(fresh.created).toBe(true);
    expect(fresh.link.slug).not.toBe(link.slug);
  });

  it(`keeps only the newest ${SHARE_LIMITS.keptRevoked} turned-off links`, async () => {
    const user = await createUser();
    const total = SHARE_LIMITS.keptRevoked + 3;
    for (let index = 0; index < total; index++) {
      const { link } = await saved(user.id, { resume: resume(`r${index}`) }, NOW + index);
      await revokeShare(user.id, link.id, NOW + 100 + index);
    }
    const rows = await (await getDb()).select().from(shares).where(eq(shares.userId, user.id));
    expect(rows).toHaveLength(SHARE_LIMITS.keptRevoked);
    expect(rows.some((row) => row.resumeId === "r0")).toBe(false);
    expect(rows.some((row) => row.resumeId === `r${total - 1}`)).toBe(true);
  });

  it("gives readers the copy with email and phone only when the owner shows them", async () => {
    const user = await createUser();
    const { link } = await saved(user.id);
    const hidden = await findPublicShare(link.slug);
    expect(hidden).toMatchObject({ id: link.id, ownerId: user.id, allowIndexing: false });
    expect(hidden?.resume.basics).toMatchObject({ name: "Maya Chen", email: "", phone: "" });

    await updateShareOptions(user.id, link.id, { showContact: true });
    expect((await findPublicShare(link.slug))?.resume.basics.email).toBe("maya@example.com");
  });

  it("finds nothing for a malformed or unknown slug", async () => {
    expect(await findPublicShare("short")).toBeNull();
    expect(await findPublicShare("../../etc/passwd")).toBeNull();
    expect(await findPublicShare(newSlug())).toBeNull();
  });
});

describe("view counting", () => {
  beforeEach(resetDb);

  async function liveLink() {
    const user = await createUser();
    return (await saved(user.id)).link;
  }

  const views = async (id: string) =>
    (await (await getDb()).select().from(shares).where(eq(shares.id, id)))[0];

  it("counts a reader once per half hour", async () => {
    const link = await liveLink();
    const reader = readerKey("198.51.100.4", "Mozilla/5.0");
    expect(await recordView(link.id, reader, NOW)).toBe(true);
    expect(await recordView(link.id, reader, NOW + 1_000)).toBe(false);
    expect(await recordView(link.id, readerKey("198.51.100.5", "Mozilla/5.0"), NOW + 2_000)).toBe(
      true,
    );
    expect(await recordView(link.id, reader, NOW + VIEW_LIMITS.sameReaderWindowMs)).toBe(true);
    expect(await views(link.id)).toMatchObject({
      views: 3,
      lastViewedAt: NOW + VIEW_LIMITS.sameReaderWindowMs,
    });
  });

  it("keeps readers apart without storing their address", async () => {
    const link = await liveLink();
    await recordView(link.id, readerKey("198.51.100.4", "Mozilla/5.0"), NOW);
    const keys = (await (await getDb()).select().from(rateLimits)).map((row) => row.key).join(" ");
    expect(keys).not.toContain("198.51.100.4");
    expect(readerKey("198.51.100.4", "A")).not.toBe(readerKey("198.51.100.4", "B"));
    expect(readerKey("198.51.100.4", "A")).toBe(readerKey("198.51.100.4", "A"));
  });

  it("stops counting a flood for the rest of the hour", async () => {
    const link = await liveLink();
    const hour = Math.ceil(NOW / 3_600_000) * 3_600_000;
    for (let index = 0; index < VIEW_LIMITS.perLinkPerHour; index++) {
      expect(await recordView(link.id, `reader-${index}`, hour + index)).toBe(true);
    }
    expect(await recordView(link.id, "one-too-many", hour + 5_000)).toBe(false);
    expect((await views(link.id))?.views).toBe(VIEW_LIMITS.perLinkPerHour);
    expect(await recordView(link.id, "next-hour", hour + 3_600_000)).toBe(true);
  });

  it("never runs past its ceiling or counts a turned-off link", async () => {
    const link = await liveLink();
    const db = await getDb();
    await db.update(shares).set({ views: VIEW_LIMITS.max }).where(eq(shares.id, link.id));
    expect(await recordView(link.id, "reader", NOW)).toBe(true);
    expect((await views(link.id))?.views).toBe(VIEW_LIMITS.max);

    const user = (await views(link.id))!.userId;
    await revokeShare(user, link.id);
    expect(await recordView(link.id, "another-reader", NOW + 1)).toBe(false);
  });
});

describe("openSharePage", () => {
  beforeEach(resetDb);

  it("opens a live link and limits opens per address", async () => {
    const user = await createUser();
    const { link } = await saved(user.id);
    const minute = Math.ceil(NOW / 60_000) * 60_000;
    for (let index = 0; index < PAGE_OPENS_PER_MINUTE; index++) {
      expect((await openSharePage(link.slug, "203.0.113.9", minute + index)).status).toBe("ok");
    }
    const limited = await openSharePage(link.slug, "203.0.113.9", minute + 100);
    expect(limited).toEqual({ status: "rate_limited", retryAfterMs: 60_000 - 100 });
    expect((await openSharePage(link.slug, "203.0.113.10", minute + 100)).status).toBe("ok");
  });

  it("answers missing for unknown and malformed slugs, without counting a malformed one", async () => {
    expect((await openSharePage(newSlug(), "203.0.113.9", NOW)).status).toBe("missing");
    expect((await openSharePage("not a slug!", "203.0.113.9", NOW)).status).toBe("missing");
    const counters = await (await getDb()).select().from(rateLimits);
    expect(counters).toHaveLength(1);
  });
});
