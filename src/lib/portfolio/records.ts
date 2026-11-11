import { and, desc, eq, gt, lt, notInArray, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { portfolioRedirects, portfolios, users } from "@/db/schema";
import type { PlanId } from "@/config/plans";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { parseStoredStats } from "@/lib/github/stats";
import { shareSnapshot } from "@/lib/share/snapshot";
import { parseStoredContent, type PortfolioContentView } from "./content";
import { contentView } from "./content-view";
import { canBuildPortfolio, canPublishPortfolio } from "./plan";
import { normalizeSlug, numberedSlug, SLUG_MESSAGES, slugProblem, suggestSlug } from "./slug";
import {
  DEFAULT_PORTFOLIO_SETTINGS,
  DEFAULT_PORTFOLIO_TEMPLATE,
  PORTFOLIO_LIMITS,
  PORTFOLIO_SECTIONS,
  type Portfolio,
  type PortfolioPatch,
  type PortfolioSection,
  type PortfolioTemplateId,
} from "./types";
import { portfolioView, type PortfolioView } from "./view";

// Every owner query is filtered by user_id, so nobody can see or change another account's page.

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
// Numbered tries for a suggested address ("maya-chen-2" ... "maya-chen-20") before a random tail.
const NUMBERED_TRIES = 20;

type Row = typeof portfolios.$inferSelect;

const KNOWN_SECTIONS = new Set<string>(PORTFOLIO_SECTIONS);

function sectionsOf(row: Pick<Row, "hiddenSections">): PortfolioSection[] {
  return row.hiddenSections.filter((key): key is PortfolioSection => KNOWN_SECTIONS.has(key));
}

function snapshotOf(row: Pick<Row, "id" | "snapshot" | "resumeId" | "createdAt">): Resume {
  const parsed = ResumeSchema.safeParse(row.snapshot);
  if (parsed.success) return parsed.data;
  // Writes are validated, so this means the schema moved on since. An empty page beats a broken one.
  log.warn("portfolio.snapshot_invalid", { portfolioId: row.id });
  return { ...emptyResume(row.createdAt), id: row.resumeId };
}

function toPortfolio(row: Row): Portfolio {
  const snapshot = snapshotOf(row);
  return {
    id: row.id,
    resumeId: row.resumeId,
    slug: row.slug,
    template: row.template,
    snapshot,
    versionAt: snapshot.updatedAt,
    content: parseStoredContent(row.content),
    github: parseStoredStats(row.github),
    showEmail: row.showEmail,
    showPhone: row.showPhone,
    hiddenSections: sectionsOf(row),
    sync: row.sync,
    published: row.published,
    allowIndexing: row.allowIndexing,
    views: row.views,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
  };
}

export async function getPortfolio(userId: string): Promise<Portfolio | null> {
  const db = await getDb();
  const [row] = await db.select().from(portfolios).where(eq(portfolios.userId, userId)).limit(1);
  return row ? toPortfolio(row) : null;
}

export async function portfolioSlugsOf(userId: string): Promise<string[]> {
  const db = await getDb();
  const [own, old] = await Promise.all([
    db.select({ slug: portfolios.slug }).from(portfolios).where(eq(portfolios.userId, userId)),
    // Through the portfolio, so both lookups ride an index (user_id, then portfolio_id).
    db
      .select({ slug: portfolioRedirects.slug })
      .from(portfolioRedirects)
      .innerJoin(portfolios, eq(portfolios.id, portfolioRedirects.portfolioId))
      .where(eq(portfolios.userId, userId)),
  ]);
  return [...own, ...old].map((row) => row.slug);
}

// Queues claims of one address across both tables until commit, so two accounts can't both take it.
async function lockSlug(tx: Tx, slug: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`portfolio-slug:${slug}`}))`);
}

/** Live or redirecting addresses count as taken; ownId is null for a portfolio not made yet. */
async function slugFree(tx: Tx, slug: string, ownId: string | null, now: number): Promise<boolean> {
  const [live] = await tx
    .select({ id: portfolios.id })
    .from(portfolios)
    .where(eq(portfolios.slug, slug))
    .limit(1);
  if (live && live.id !== ownId) return false;
  const [redirect] = await tx
    .select({
      portfolioId: portfolioRedirects.portfolioId,
      expiresAt: portfolioRedirects.expiresAt,
    })
    .from(portfolioRedirects)
    .where(eq(portfolioRedirects.slug, slug))
    .limit(1);
  if (!redirect || redirect.portfolioId === ownId) return true;
  if (redirect.expiresAt > now) return false;
  // Its time is up, so the address is free again.
  await tx.delete(portfolioRedirects).where(eq(portfolioRedirects.slug, slug));
  return true;
}

function randomTail(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 4);
}

async function claimSuggested(tx: Tx, name: string, now: number): Promise<string> {
  const base = suggestSlug(name);
  const tries = [
    base,
    ...Array.from({ length: NUMBERED_TRIES - 1 }, (_, i) => numberedSlug(base, i + 2)),
  ];
  for (const slug of tries) {
    await lockSlug(tx, slug);
    if (await slugFree(tx, slug, null, now)) return slug;
  }
  for (;;) {
    const slug = numberedSlug(base, randomTail());
    await lockSlug(tx, slug);
    if (await slugFree(tx, slug, null, now)) return slug;
  }
}

export type SlugCheck = { slug: string; available: boolean; message: string | null };

export async function checkSlug(userId: string, raw: string, now = Date.now()): Promise<SlugCheck> {
  const slug = normalizeSlug(raw);
  const problem = slugProblem(slug);
  if (problem) return { slug, available: false, message: SLUG_MESSAGES[problem] };
  const db = await getDb();
  const own = await db
    .select({ id: portfolios.id })
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);
  const free = await db.transaction((tx) => slugFree(tx, slug, own[0]?.id ?? null, now));
  return { slug, available: free, message: free ? null : SLUG_MESSAGES.taken };
}

export type CreatePortfolioInput = {
  resume: Resume;
  slug?: string;
  template?: PortfolioTemplateId;
};

export type SaveResult =
  | {
      status: "saved";
      portfolio: Portfolio;
      created: boolean;
      touched: string[];
    }
  | { status: "bad_slug"; message: string }
  | { status: "slug_taken" }
  // Portfolios are Pro and Max (a trial included); Free keeps its data but can't change it.
  | { status: "needs_portfolio_plan" }
  | { status: "not_found" }
  // The account was deleted after the request was signed in, so nothing may be written.
  | { status: "no_user" };

// An account that already has a portfolio gets it pointed at this resume, keeping address and
// settings.
export async function createPortfolio(
  userId: string,
  { resume, slug: wanted, template }: CreatePortfolioInput,
  now = Date.now(),
): Promise<SaveResult> {
  const snapshot = shareSnapshot(resume);
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [existing] = await tx
      .select({ id: portfolios.id })
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);
    if (existing) {
      const [row] = await tx
        .update(portfolios)
        .set({ resumeId: resume.id, snapshot, updatedAt: now })
        .where(eq(portfolios.id, existing.id))
        .returning();
      if (!row) throw new Error("portfolio update returned no row");
      return { status: "saved", portfolio: toPortfolio(row), created: false, touched: [row.slug] };
    }

    let slug: string;
    if (wanted !== undefined && wanted.trim() !== "") {
      slug = normalizeSlug(wanted);
      const problem = slugProblem(slug);
      if (problem) return { status: "bad_slug", message: SLUG_MESSAGES[problem] };
      await lockSlug(tx, slug);
      if (!(await slugFree(tx, slug, null, now))) return { status: "slug_taken" };
    } else {
      slug = await claimSuggested(tx, resume.basics.name, now);
    }

    const [row] = await tx
      .insert(portfolios)
      .values({
        id: crypto.randomUUID(),
        userId,
        resumeId: resume.id,
        slug,
        template: template ?? DEFAULT_PORTFOLIO_TEMPLATE,
        snapshot,
        ...DEFAULT_PORTFOLIO_SETTINGS,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    if (!row) throw new Error("portfolio insert returned no row");
    return { status: "saved", portfolio: toPortfolio(row), created: true, touched: [] };
  });
}

export type PortfolioOwner = { plan: PlanId };

export async function updatePortfolio(
  userId: string,
  patch: PortfolioPatch,
  owner: PortfolioOwner,
  now = Date.now(),
): Promise<SaveResult> {
  const { plan } = owner;
  if (!canBuildPortfolio(plan)) return { status: "needs_portfolio_plan" };
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [current] = await tx
      .select()
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);
    if (!current) return { status: "not_found" };

    const changes: Partial<typeof portfolios.$inferInsert> = { updatedAt: now };
    const touched = [current.slug];

    if (patch.slug !== undefined) {
      const slug = normalizeSlug(patch.slug);
      if (slug !== current.slug) {
        const problem = slugProblem(slug);
        if (problem) return { status: "bad_slug", message: SLUG_MESSAGES[problem] };
        await lockSlug(tx, slug);
        if (!(await slugFree(tx, slug, current.id, now))) return { status: "slug_taken" };
        // Coming back to an old address takes it out of the redirects.
        await tx.delete(portfolioRedirects).where(eq(portfolioRedirects.slug, slug));
        // An address that was never public has nobody to send on.
        if (current.publishedAt !== null) await keepRedirect(tx, current, now);
        changes.slug = slug;
        touched.push(slug);
      }
    }
    if (patch.resume) {
      changes.resumeId = patch.resume.id;
      changes.snapshot = shareSnapshot(patch.resume);
    }
    if (patch.template !== undefined) changes.template = patch.template;
    if (patch.showEmail !== undefined) changes.showEmail = patch.showEmail;
    if (patch.showPhone !== undefined) changes.showPhone = patch.showPhone;
    if (patch.hiddenSections !== undefined) changes.hiddenSections = patch.hiddenSections;
    if (patch.sync !== undefined) changes.sync = patch.sync;
    if (patch.allowIndexing !== undefined) changes.allowIndexing = patch.allowIndexing;
    if (patch.published !== undefined) {
      changes.published = patch.published;
      if (patch.published && !current.published) changes.publishedAt = now;
    }

    const [row] = await tx
      .update(portfolios)
      .set(changes)
      .where(eq(portfolios.id, current.id))
      .returning();
    if (!row) throw new Error("portfolio update returned no row");
    return { status: "saved", portfolio: toPortfolio(row), created: false, touched };
  });
}

// Only the newest few redirects are kept, so changing address repeatedly can't hoard names.
async function keepRedirect(tx: Tx, current: Row, now: number): Promise<void> {
  const expiresAt = now + PORTFOLIO_LIMITS.redirectDays * DAY_MS;
  await tx
    .insert(portfolioRedirects)
    .values({
      slug: current.slug,
      portfolioId: current.id,
      userId: current.userId,
      createdAt: now,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: portfolioRedirects.slug,
      set: { portfolioId: current.id, userId: current.userId, createdAt: now, expiresAt },
    });
  const mine = eq(portfolioRedirects.portfolioId, current.id);
  const kept = tx
    .select({ slug: portfolioRedirects.slug })
    .from(portfolioRedirects)
    .where(mine)
    .orderBy(desc(portfolioRedirects.createdAt), desc(portfolioRedirects.slug))
    .limit(PORTFOLIO_LIMITS.keptRedirects);
  await tx.delete(portfolioRedirects).where(and(mine, notInArray(portfolioRedirects.slug, kept)));
}

// Called with every cloud backup. Returns the page's address when its copy changed, else null.
export async function followResume(
  userId: string,
  resume: Resume,
  now = Date.now(),
): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .update(portfolios)
    .set({ snapshot: shareSnapshot(resume), updatedAt: now })
    .where(
      and(
        eq(portfolios.userId, userId),
        eq(portfolios.resumeId, resume.id),
        eq(portfolios.sync, true),
        // A late retry of an older version must not roll the page back.
        lt(sql`coalesce((${portfolios.snapshot} ->> 'updatedAt')::bigint, 0)`, resume.updatedAt),
      ),
    )
    .returning({ slug: portfolios.slug });
  return row?.slug ?? null;
}

export type PublicPortfolio = {
  id: string;
  ownerId: string;
  slug: string;
  template: PortfolioTemplateId;
  view: PortfolioView;
  // Built from `view`, so the same privacy choices hold.
  content: PortfolioContentView;
  allowIndexing: boolean;
  updatedAt: number;
};

export type PublicPortfolioResult =
  | { status: "ok"; portfolio: PublicPortfolio }
  // An old address: the page now lives at this slug.
  | { status: "redirect"; slug: string }
  | { status: "missing" };

// An owner no longer on Pro or Max is offline: kept, but answered as missing.
export async function findPublicPortfolio(
  slug: string,
  now = Date.now(),
): Promise<PublicPortfolioResult> {
  // A word reserved after someone took it as their address still opens their page.
  const problem = slugProblem(slug);
  if (problem !== null && problem !== "reserved") return { status: "missing" };
  const db = await getDb();
  const [row] = await db
    .select({ portfolio: portfolios, plan: users.plan })
    .from(portfolios)
    .innerJoin(users, eq(users.id, portfolios.userId))
    .where(and(eq(portfolios.slug, slug), eq(portfolios.published, true)))
    .limit(1);
  if (row && !ownerCanPublish(row)) return { status: "missing" };
  if (row) {
    const { portfolio } = row;
    const view = portfolioView(snapshotOf(portfolio), {
      showEmail: portfolio.showEmail,
      showPhone: portfolio.showPhone,
      hiddenSections: sectionsOf(portfolio),
    });
    return {
      status: "ok",
      portfolio: {
        id: portfolio.id,
        ownerId: portfolio.userId,
        slug: portfolio.slug,
        template: portfolio.template,
        view,
        content: contentView({
          view,
          content: parseStoredContent(portfolio.content),
          github: parseStoredStats(portfolio.github),
          now,
        }),
        allowIndexing: portfolio.allowIndexing,
        updatedAt: portfolio.updatedAt,
      },
    };
  }
  const [moved] = await db
    .select({ slug: portfolios.slug, plan: users.plan })
    .from(portfolioRedirects)
    .innerJoin(portfolios, eq(portfolios.id, portfolioRedirects.portfolioId))
    .innerJoin(users, eq(users.id, portfolios.userId))
    .where(
      and(
        eq(portfolioRedirects.slug, slug),
        gt(portfolioRedirects.expiresAt, now),
        eq(portfolios.published, true),
      ),
    )
    .limit(1);
  return moved && ownerCanPublish(moved)
    ? { status: "redirect", slug: moved.slug }
    : { status: "missing" };
}

function ownerCanPublish(owner: { plan: PlanId }): boolean {
  return canPublishPortfolio(owner.plan);
}

// Published, indexing allowed, and online (findPublicPortfolio would show it, not a 404).
export async function indexablePortfolios(
  limit: number,
): Promise<{ slug: string; updatedAt: number }[]> {
  const db = await getDb();
  const rows = await db
    .select({
      slug: portfolios.slug,
      updatedAt: portfolios.updatedAt,
      plan: users.plan,
    })
    .from(portfolios)
    .innerJoin(users, eq(users.id, portfolios.userId))
    .where(and(eq(portfolios.published, true), eq(portfolios.allowIndexing, true)))
    .orderBy(desc(portfolios.updatedAt), portfolios.slug);
  // The same address checks as loadPublicPortfolio and findPublicPortfolio, so no listed page 404s.
  const servable = (slug: string) => {
    const problem = slugProblem(slug);
    return normalizeSlug(slug) === slug && (problem === null || problem === "reserved");
  };
  return rows
    .filter((row) => ownerCanPublish(row) && servable(row.slug))
    .slice(0, limit)
    .map(({ slug, updatedAt }) => ({ slug, updatedAt }));
}

/** The owner comes along because their own visits don't count. */
export async function findViewTarget(
  slug: string,
): Promise<{ id: string; ownerId: string } | null> {
  if (slugProblem(slug) !== null) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: portfolios.id, ownerId: portfolios.userId })
    .from(portfolios)
    .where(and(eq(portfolios.slug, slug), eq(portfolios.published, true)))
    .limit(1);
  return row ?? null;
}

// Nothing about the visitor is kept: the only counter key is the page's id. True when it moved.
export async function countView(portfolioId: string, now = Date.now()): Promise<boolean> {
  const hourly = await rateLimit(
    `portfolio:views:${portfolioId}`,
    PORTFOLIO_LIMITS.viewsPerHour,
    HOUR_MS,
    now,
  );
  if (!hourly.allowed) return false;
  const db = await getDb();
  const updated = await db
    .update(portfolios)
    .set({ views: sql`least(${portfolios.views} + 1, ${PORTFOLIO_LIMITS.viewsMax})` })
    .where(and(eq(portfolios.id, portfolioId), eq(portfolios.published, true)))
    .returning({ id: portfolios.id });
  return updated.length > 0;
}
