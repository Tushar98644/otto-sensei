import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getDb, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { portfolios, users } from "@/db/schema";
import type { PlanId } from "@/config/plans";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/rate-limit";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { parseStoredStats } from "@/lib/github/stats";
import { findResumeShare } from "@/lib/share/records";
import { shareSnapshot } from "@/lib/share/snapshot";
import { DAY_MS, HOUR_MS } from "@/lib/time";
import type { PortfolioContentView } from "./content";
import { parseStoredContent } from "./content-validation";
import { contentView } from "./content-view";
import { canBuildPortfolio, canPublishPortfolio } from "./plan";
import { resumeHrefFor } from "./resume-link";
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

const NUMBERED_TRIES = 20;

type Row = typeof portfolios.$inferSelect;

const KNOWN_SECTIONS = new Set<string>(PORTFOLIO_SECTIONS);

function sectionsOf(row: Pick<Row, "hiddenSections">): PortfolioSection[] {
  return row.hiddenSections.filter((key): key is PortfolioSection => KNOWN_SECTIONS.has(key));
}

function snapshotOf(row: Pick<Row, "id" | "snapshot" | "resumeId" | "createdAt">): Resume {
  const parsed = ResumeSchema.safeParse(row.snapshot);
  if (parsed.success) return parsed.data;
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

type PageState = { published: boolean; updatedAt: number };

export async function getPageState(userId: string): Promise<PageState | null> {
  const db = await getDb();
  const [row] = await db
    .select({ published: portfolios.published, updatedAt: portfolios.updatedAt })
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);
  return row ?? null;
}

// A page already at a reserved address keeps working: the list only stops new pages taking one.
function servableSlug(slug: string): boolean {
  const problem = slugProblem(slug);
  return problem === null || problem === "reserved";
}

export async function portfolioSlugsOf(userId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ slug: portfolios.slug, oldSlugs: portfolios.oldSlugs })
    .from(portfolios)
    .where(eq(portfolios.userId, userId));
  return rows.flatMap((row) => [row.slug, ...Object.keys(row.oldSlugs ?? {})]);
}

// An old address a page still answers, held from everyone else until it expires.
const holdsOldSlug = (slug: string) => sql`${portfolios.oldSlugs} ? ${slug}`;

const dropOldSlug = (slug: string) => sql`${portfolios.oldSlugs} - ${slug}::text`;

// Queues claims of one address, live or old, until commit, so two accounts can't both take it.
async function lockSlug(tx: Tx, slug: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`portfolio-slug:${slug}`}))`);
}

async function slugFree(tx: Tx, slug: string, ownId: string | null, now: number): Promise<boolean> {
  const [live] = await tx
    .select({ id: portfolios.id })
    .from(portfolios)
    .where(eq(portfolios.slug, slug))
    .limit(1);
  if (live && live.id !== ownId) return false;
  const [redirect] = await tx
    .select({
      portfolioId: portfolios.id,
      expiresAt: sql<number>`(${portfolios.oldSlugs} -> ${slug} ->> 'until')::bigint`,
    })
    .from(portfolios)
    .where(holdsOldSlug(slug))
    .limit(1);
  if (!redirect || redirect.portfolioId === ownId) return true;
  if (Number(redirect.expiresAt) > now) return false;
  await tx
    .update(portfolios)
    .set({ oldSlugs: dropOldSlug(slug) })
    .where(eq(portfolios.id, redirect.portfolioId));
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
  | { status: "needs_portfolio_plan" }
  | { status: "not_found" }
  | { status: "no_user" }
  | { status: "changed" };

// `version` is the updatedAt the caller checked the page at (null: no page yet); undefined skips it.
export function pageMoved(
  version: number | null | undefined,
  row: { updatedAt: number } | undefined,
): boolean {
  return version !== undefined && (row?.updatedAt ?? null) !== version;
}

export async function createPortfolio(
  userId: string,
  { resume, slug: wanted, template }: CreatePortfolioInput,
  now = Date.now(),
  version?: number | null,
): Promise<SaveResult> {
  const snapshot = shareSnapshot(resume);
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [existing] = await tx
      .select({ id: portfolios.id, updatedAt: portfolios.updatedAt })
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .limit(1);
    if (pageMoved(version, existing)) return { status: "changed" };
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
  version?: number | null,
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
    if (pageMoved(version, current)) return { status: "changed" };

    const changes: Partial<typeof portfolios.$inferInsert> = { updatedAt: now };
    const touched = [current.slug];

    if (patch.slug !== undefined) {
      const slug = normalizeSlug(patch.slug);
      if (slug !== current.slug) {
        const problem = slugProblem(slug);
        if (problem) return { status: "bad_slug", message: SLUG_MESSAGES[problem] };
        await lockSlug(tx, slug);
        if (!(await slugFree(tx, slug, current.id, now))) return { status: "slug_taken" };
        // Taking back one of its own old addresses ends that redirect.
        await tx
          .update(portfolios)
          .set({ oldSlugs: dropOldSlug(slug) })
          .where(and(eq(portfolios.id, current.id), holdsOldSlug(slug)));
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

// The address it leaves answers for redirectDays; only the newest keptRedirects are kept.
async function keepRedirect(tx: Tx, current: Row, now: number): Promise<void> {
  const left = {
    [current.slug]: { at: now, until: now + PORTFOLIO_LIMITS.redirectDays * DAY_MS },
  };
  await tx
    .update(portfolios)
    .set({
      oldSlugs: sql`(select jsonb_object_agg(key, value) from (
        select key, value from jsonb_each(coalesce(${portfolios.oldSlugs}, '{}') || ${JSON.stringify(left)}::jsonb)
        order by (value ->> 'at')::bigint desc, key desc
        limit ${PORTFOLIO_LIMITS.keptRedirects}
      ) kept)`,
    })
    .where(eq(portfolios.id, current.id));
}

// The stored snapshot is as saved, unchecked: only compared with the next one.
export type Follower = { published: boolean; updatedAt: number; snapshot: unknown };

export async function followerOf(userId: string, resumeId: string): Promise<Follower | null> {
  const db = await getDb();
  const [row] = await db
    .select({
      published: portfolios.published,
      updatedAt: portfolios.updatedAt,
      snapshot: portfolios.snapshot,
    })
    .from(portfolios)
    .where(
      and(
        eq(portfolios.userId, userId),
        eq(portfolios.resumeId, resumeId),
        eq(portfolios.sync, true),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function followResume(
  userId: string,
  resume: Resume,
  now = Date.now(),
  version?: number,
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
        version === undefined ? undefined : eq(portfolios.updatedAt, version),
      ),
    )
    .returning({ slug: portfolios.slug });
  return row?.slug ?? null;
}

// For a save that changed nothing public: the copy is marked current, so an older save still on its way can't land.
export async function markFollowed(
  userId: string,
  resume: Resume,
  version: number,
): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .update(portfolios)
    .set({
      snapshot: sql`jsonb_set(${portfolios.snapshot}, '{updatedAt}', ${JSON.stringify(resume.updatedAt)}::jsonb)`,
    })
    .where(
      and(
        eq(portfolios.userId, userId),
        eq(portfolios.resumeId, resume.id),
        eq(portfolios.sync, true),
        lt(sql`coalesce((${portfolios.snapshot} ->> 'updatedAt')::bigint, 0)`, resume.updatedAt),
        eq(portfolios.updatedAt, version),
      ),
    )
    .returning({ id: portfolios.id });
  return rows.length > 0;
}

export type PublicPortfolio = {
  id: string;
  ownerId: string;
  slug: string;
  template: PortfolioTemplateId;
  view: PortfolioView;
  content: PortfolioContentView;
  allowIndexing: boolean;
  updatedAt: number;
  resumeHref: string | null;
};

export type PublicPortfolioResult =
  | { status: "ok"; portfolio: PublicPortfolio }
  | { status: "redirect"; slug: string }
  | { status: "missing" };

export async function findPublicPortfolio(
  slug: string,
  now = Date.now(),
): Promise<PublicPortfolioResult> {
  if (!servableSlug(slug)) return { status: "missing" };
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
    const share = await findResumeShare(portfolio.userId, portfolio.resumeId);
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
        resumeHref: resumeHrefFor(share, portfolio),
      },
    };
  }
  const [moved] = await db
    .select({ slug: portfolios.slug, plan: users.plan })
    .from(portfolios)
    .innerJoin(users, eq(users.id, portfolios.userId))
    .where(
      and(
        holdsOldSlug(slug),
        sql`(${portfolios.oldSlugs} -> ${slug} ->> 'until')::bigint > ${now}`,
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
  return rows
    .filter(
      (row) =>
        ownerCanPublish(row) && normalizeSlug(row.slug) === row.slug && servableSlug(row.slug),
    )
    .slice(0, limit)
    .map(({ slug, updatedAt }) => ({ slug, updatedAt }));
}

export async function findViewTarget(
  slug: string,
): Promise<{ id: string; ownerId: string } | null> {
  if (!servableSlug(slug)) return null;
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

// Old addresses past their time go from pages nobody changes again, in batches.
export async function dropExpiredRedirects(now: number, limit: number): Promise<number> {
  const db = await getDb();
  const expired = sql`exists (select 1 from jsonb_each(${portfolios.oldSlugs}) as o(slug, kept) where (kept ->> 'until')::bigint <= ${now})`;
  const stale = db.select({ id: portfolios.id }).from(portfolios).where(expired).limit(limit);
  const trimmed = await db
    .update(portfolios)
    .set({
      oldSlugs: sql`(select jsonb_object_agg(slug, kept) from jsonb_each(${portfolios.oldSlugs}) as o(slug, kept) where (kept ->> 'until')::bigint > ${now})`,
    })
    .where(sql`${portfolios.id} in ${stale}`)
    .returning({ id: portfolios.id });
  return trimmed.length;
}
