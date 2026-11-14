import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { portfolios, users } from "@/db/schema";
import { createUser as createFreeUser, resetDb, setPlan } from "@/lib/auth/test-helpers";
import {
  checkSlug,
  countView,
  createPortfolio,
  findPublicPortfolio,
  findViewTarget,
  followResume,
  getPortfolio,
  indexablePortfolios,
  portfolioSlugsOf,
  updatePortfolio,
  type SaveResult,
} from "./records";
import { sampleResume } from "./testing";
import { PORTFOLIO_LIMITS, type Portfolio } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const PRO = { plan: "pro" } as const;
const createUser = async (email?: string) => setPlan(await createFreeUser(email), "pro");

function saved(result: SaveResult): Portfolio {
  if (result.status !== "saved") throw new Error(`expected saved, got ${result.status}`);
  return result.portfolio;
}

describe("portfolio records", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("makes a private draft from the resume, with every privacy switch off", async () => {
    const user = await createUser("maya@example.com");
    const result = await createPortfolio(user.id, { resume: sampleResume() }, 10_000);
    expect(result).toMatchObject({ status: "saved", created: true });
    const portfolio = saved(result);
    expect(portfolio).toMatchObject({
      slug: "maya-chen",
      resumeId: "resume-1",
      template: "navy",
      published: false,
      showEmail: false,
      showPhone: false,
      allowIndexing: false,
      sync: true,
      hiddenSections: [],
      views: 0,
      versionAt: 1_000,
      publishedAt: null,
    });
    expect(portfolio.snapshot.tailor).toBeNull();
    expect(portfolio.snapshot.projects.map((project) => project.name)).toEqual(["otto-resume"]);
    expect(await findPublicPortfolio("maya-chen")).toEqual({ status: "missing" });
    expect(await getPortfolio(user.id)).toMatchObject({ id: portfolio.id });
  });

  it("keeps one portfolio per account: making it again points it at the new resume", async () => {
    const user = await createUser();
    const first = saved(await createPortfolio(user.id, { resume: sampleResume() }));
    const again = await createPortfolio(user.id, { resume: sampleResume({ id: "resume-2" }) });
    expect(again).toMatchObject({ status: "saved", created: false });
    expect(saved(again)).toMatchObject({ id: first.id, slug: first.slug, resumeId: "resume-2" });
  });

  it("numbers a suggested address someone already has", async () => {
    const maya = await createUser("maya@example.com");
    const other = await createUser("other@example.com");
    saved(await createPortfolio(maya.id, { resume: sampleResume() }));
    expect(saved(await createPortfolio(other.id, { resume: sampleResume() })).slug).toBe(
      "maya-chen-2",
    );
  });

  it("checks addresses: rules, reserved words, taken and free", async () => {
    const maya = await createUser("maya@example.com");
    const other = await createUser("other@example.com");
    saved(await createPortfolio(maya.id, { resume: sampleResume() }));
    expect(await checkSlug(other.id, "Maya Chen")).toMatchObject({
      slug: "maya-chen",
      available: false,
    });
    expect(await checkSlug(maya.id, "maya-chen")).toMatchObject({ available: true, message: null });
    expect(await checkSlug(other.id, "dashboard")).toMatchObject({ available: false });
    expect((await checkSlug(other.id, "ab")).message).toMatch(/at least 3/);
    expect(await checkSlug(other.id, "maya-builds")).toMatchObject({ available: true });
    expect(
      await createPortfolio(other.id, { resume: sampleResume(), slug: "admin" }),
    ).toMatchObject({
      status: "bad_slug",
    });
    expect(await createPortfolio(other.id, { resume: sampleResume(), slug: "maya-chen" })).toEqual({
      status: "slug_taken",
    });
  });

  it("publishes and unpublishes; only a published page can be read", async () => {
    const user = await createUser();
    saved(await createPortfolio(user.id, { resume: sampleResume() }));
    const live = saved(await updatePortfolio(user.id, { published: true }, PRO, 20_000));
    expect(live).toMatchObject({ published: true, publishedAt: 20_000 });
    const page = await findPublicPortfolio("maya-chen");
    expect(page.status).toBe("ok");
    if (page.status !== "ok") return;
    expect(page.portfolio.view.email).toBeNull();
    expect(page.portfolio.view.phone).toBeNull();
    expect(page.portfolio.allowIndexing).toBe(false);

    saved(await updatePortfolio(user.id, { published: false }, PRO));
    expect(await findPublicPortfolio("maya-chen")).toEqual({ status: "missing" });
    expect(await findViewTarget("maya-chen")).toBeNull();
  });

  it("applies the owner's privacy and section choices to the public page", async () => {
    const user = await createUser();
    saved(await createPortfolio(user.id, { resume: sampleResume() }));
    saved(
      await updatePortfolio(
        user.id,
        { published: true, showEmail: true, hiddenSections: ["experience"], allowIndexing: true },
        PRO,
      ),
    );
    const page = await findPublicPortfolio("maya-chen");
    if (page.status !== "ok") throw new Error("expected the page");
    expect(page.portfolio.view.email).toBe("maya@example.com");
    expect(page.portfolio.view.phone).toBeNull();
    expect(page.portfolio.view.experience).toEqual([]);
    expect(page.portfolio.allowIndexing).toBe(true);
  });

  it("draws the public page without pictures", async () => {
    const user = await createUser();
    saved(await createPortfolio(user.id, { resume: sampleResume() }));
    const updated = saved(
      await updatePortfolio(user.id, { published: true, template: "reel" }, PRO),
    );
    expect(updated.template).toBe("reel");
    expect(updated).not.toHaveProperty("projectImages");
    expect(updated).not.toHaveProperty("mediaBase");
    const page = await findPublicPortfolio("maya-chen");
    if (page.status !== "ok") throw new Error("expected the page");
    expect(page.portfolio.template).toBe("reel");
    expect(page.portfolio.view.projects[0]).not.toHaveProperty("image");
  });

  it("takes the page offline (kept) when the plan ends", async () => {
    const user = await createUser();
    saved(await createPortfolio(user.id, { resume: sampleResume() }));
    saved(await updatePortfolio(user.id, { published: true }, PRO));
    expect((await findPublicPortfolio("maya-chen")).status).toBe("ok");

    const free = { ...user, plan: "free" as const };
    await (
      await getDb()
    )
      .update(users)
      .set({ plan: "free", planInterval: null })
      .where(eq(users.id, user.id));
    expect(await findPublicPortfolio("maya-chen")).toEqual({ status: "missing" });
    expect(await getPortfolio(user.id)).toMatchObject({ published: true });
    expect(await updatePortfolio(user.id, { showEmail: true }, free)).toEqual({
      status: "needs_portfolio_plan",
    });

    await setPlan(user, "pro");
    expect((await findPublicPortfolio("maya-chen")).status).toBe("ok");
  });

  it("lets a trial publish, and takes the page offline if the plan drops to Free", async () => {
    const user = await setPlan(await createFreeUser(), "trial", 50_000);
    saved(await createPortfolio(user.id, { resume: sampleResume() }));
    saved(await updatePortfolio(user.id, { template: "reel", published: true }, user));
    expect((await findPublicPortfolio("maya-chen")).status).toBe("ok");

    await (await getDb()).update(users).set({ plan: "free" }).where(eq(users.id, user.id));
    expect(await findPublicPortfolio("maya-chen")).toEqual({ status: "missing" });
    expect((await getPortfolio(user.id))?.published).toBe(true);
  });

  it("keeps an old address redirecting after a change, and frees it when it expires", async () => {
    const maya = await createUser("maya@example.com");
    const other = await createUser("other@example.com");
    saved(await createPortfolio(maya.id, { resume: sampleResume() }, 1_000));
    saved(await updatePortfolio(maya.id, { published: true }, PRO, 2_000));
    const moved = await updatePortfolio(maya.id, { slug: "Maya Builds" }, PRO, 3_000);
    expect(moved).toMatchObject({ status: "saved", touched: ["maya-chen", "maya-builds"] });
    expect(await findPublicPortfolio("maya-builds", 4_000)).toMatchObject({ status: "ok" });
    expect(await findPublicPortfolio("maya-chen", 4_000)).toEqual({
      status: "redirect",
      slug: "maya-builds",
    });
    expect(await checkSlug(other.id, "maya-chen", 4_000)).toMatchObject({ available: false });
    expect(await checkSlug(maya.id, "maya-chen", 4_000)).toMatchObject({ available: true });
    expect((await portfolioSlugsOf(maya.id)).sort()).toEqual(["maya-builds", "maya-chen"]);
    const expired = 3_000 + PORTFOLIO_LIMITS.redirectDays * DAY + 1;
    expect(await findPublicPortfolio("maya-chen", expired)).toEqual({ status: "missing" });
    expect(await checkSlug(other.id, "maya-chen", expired)).toMatchObject({ available: true });
  });

  it("keeps only the newest few old addresses", async () => {
    const user = await createUser();
    saved(await createPortfolio(user.id, { resume: sampleResume() }, 1_000));
    saved(await updatePortfolio(user.id, { published: true }, PRO, 1_500));
    const names = Array.from(
      { length: PORTFOLIO_LIMITS.keptRedirects + 2 },
      (_, i) => `maya-v${i}`,
    );
    for (const [index, slug] of names.entries()) {
      saved(await updatePortfolio(user.id, { slug }, PRO, 2_000 + index));
    }
    expect((await findPublicPortfolio("maya-chen", 10_000)).status).toBe("missing");
    expect(await findPublicPortfolio(names.at(-2)!, 10_000)).toMatchObject({ status: "redirect" });
  });

  it("follows its resume while in sync, and never rolls back to an older copy", async () => {
    const user = await createUser();
    saved(await createPortfolio(user.id, { resume: sampleResume() }));
    const newer = sampleResume({ summary: "New intro.", updatedAt: 5_000 });
    expect(await followResume(user.id, newer)).toBe("maya-chen");
    expect((await getPortfolio(user.id))?.snapshot.summary).toBe("New intro.");
    expect(
      await followResume(user.id, sampleResume({ summary: "Old", updatedAt: 4_000 })),
    ).toBeNull();
    expect(await followResume(user.id, sampleResume({ id: "another" }))).toBeNull();

    saved(await updatePortfolio(user.id, { sync: false }, PRO));
    expect(
      await followResume(user.id, sampleResume({ summary: "Later", updatedAt: 9_000 })),
    ).toBeNull();
    expect((await getPortfolio(user.id))?.snapshot.summary).toBe("New intro.");
  });

  it("keeps serving, listing and counting a live page whose address became reserved", async () => {
    const user = await createUser();
    const portfolio = saved(await createPortfolio(user.id, { resume: sampleResume() }));
    saved(await updatePortfolio(user.id, { published: true, allowIndexing: true }, PRO));
    await (
      await getDb()
    )
      .update(portfolios)
      .set({ slug: "support" })
      .where(eq(portfolios.id, portfolio.id));

    expect((await findPublicPortfolio("support")).status).toBe("ok");
    expect((await indexablePortfolios(10)).map((page) => page.slug)).toEqual(["support"]);
    expect(await findViewTarget("support")).toEqual({ id: portfolio.id, ownerId: user.id });
    expect(await findViewTarget("Support")).toBeNull();
  });

  it("counts views of published pages only, without keeping anything about the visitor", async () => {
    const user = await createUser();
    const portfolio = saved(await createPortfolio(user.id, { resume: sampleResume() }));
    expect(await countView(portfolio.id)).toBe(false);
    saved(await updatePortfolio(user.id, { published: true }, PRO));
    expect(await findViewTarget("maya-chen")).toEqual({ id: portfolio.id, ownerId: user.id });
    expect(await countView(portfolio.id)).toBe(true);
    expect(await countView(portfolio.id)).toBe(true);
    expect((await getPortfolio(user.id))?.views).toBe(2);
  });
});
