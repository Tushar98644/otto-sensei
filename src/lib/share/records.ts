import { createHash } from "node:crypto";
import { and, count, desc, eq, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { shares, users } from "@/db/schema";
import { log } from "@/lib/log";
import { forPlan } from "@/lib/pdf/templates";
import { rateLimit } from "@/lib/rate-limit";
import { type Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { HOUR_MS } from "@/lib/time";
import { publicResume, shareSnapshot } from "./snapshot";
import { SHARE_LIMITS, SHARE_SLUG, type SharedLink } from "./types";

// Every owner query is filtered by user_id, so nobody can see or change another account's links.

const SLUG_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
// Bytes of 248 and up are dropped so every letter is equally likely (no modulo bias).
const SLUG_BYTE_CEILING = 248;

// 14 of 62 characters is ~83 random bits: guessing a live link isn't a plan.
export function newSlug(length: number = SHARE_LIMITS.slugLength): string {
  let slug = "";
  while (slug.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < SLUG_BYTE_CEILING) slug += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
      if (slug.length === length) break;
    }
  }
  return slug;
}

export const VIEW_LIMITS = {
  sameReaderWindowMs: 30 * 60 * 1000,
  perLinkPerHour: 300,
  max: 1_000_000,
} as const;

const linkColumns = {
  id: shares.id,
  resumeId: shares.resumeId,
  slug: shares.slug,
  name: sql<string | null>`${shares.snapshot} -> 'basics' ->> 'name'`,
  versionAt: sql<string | number | null>`${shares.snapshot} ->> 'updatedAt'`,
  showContact: shares.showContact,
  allowIndexing: shares.allowIndexing,
  views: shares.views,
  lastViewedAt: shares.lastViewedAt,
  createdAt: shares.createdAt,
  updatedAt: shares.updatedAt,
};

type LinkRow = {
  id: string;
  resumeId: string;
  slug: string;
  name: string | null;
  versionAt: string | number | null;
  showContact: boolean;
  allowIndexing: boolean;
  views: number;
  lastViewedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

function toLink(row: LinkRow): SharedLink {
  const versionAt = Number(row.versionAt);
  return {
    id: row.id,
    resumeId: row.resumeId,
    slug: row.slug,
    name: row.name ?? "",
    versionAt: Number.isFinite(versionAt) ? versionAt : row.updatedAt,
    showContact: row.showContact,
    allowIndexing: row.allowIndexing,
    views: row.views,
    lastViewedAt: row.lastViewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const live = (userId: string) => and(eq(shares.userId, userId), isNull(shares.revokedAt));

export async function listShares(userId: string): Promise<SharedLink[]> {
  const db = await getDb();
  const rows = await db
    .select(linkColumns)
    .from(shares)
    .where(live(userId))
    .orderBy(desc(shares.createdAt), desc(shares.id))
    .limit(SHARE_LIMITS.live);
  return rows.map(toLink);
}

export type SaveShareInput = { resume: Resume; showContact: boolean; allowIndexing: boolean };

export type SaveShareResult =
  | { status: "saved"; link: SharedLink; created: boolean }
  | { status: "limit_reached" }
  | { status: "no_user" };

// Under the account's row lock, so two quick clicks can't make two links for one resume.
export async function saveShare(
  userId: string,
  { resume, showContact, allowIndexing }: SaveShareInput,
  now = Date.now(),
): Promise<SaveShareResult> {
  const snapshot = shareSnapshot(resume);
  const db = await getDb();
  return db.transaction(async (tx): Promise<SaveShareResult> => {
    if (!(await lockUser(tx, userId))) return { status: "no_user" };
    const [existing] = await tx
      .select({ id: shares.id })
      .from(shares)
      .where(and(live(userId), eq(shares.resumeId, resume.id)))
      .limit(1);
    if (existing) {
      const [row] = await tx
        .update(shares)
        .set({ snapshot, showContact, allowIndexing, updatedAt: now })
        .where(eq(shares.id, existing.id))
        .returning(linkColumns);
      if (!row) throw new Error("share update returned no row");
      return { status: "saved", link: toLink(row), created: false };
    }
    const [{ total } = { total: 0 }] = await tx
      .select({ total: count() })
      .from(shares)
      .where(live(userId));
    if (total >= SHARE_LIMITS.live) return { status: "limit_reached" };
    const [row] = await tx
      .insert(shares)
      .values({
        id: crypto.randomUUID(),
        userId,
        resumeId: resume.id,
        slug: newSlug(),
        snapshot,
        showContact,
        allowIndexing,
        createdAt: now,
        updatedAt: now,
      })
      .returning(linkColumns);
    if (!row) throw new Error("share insert returned no row");
    return { status: "saved", link: toLink(row), created: true };
  });
}

export type ShareOptions = { showContact?: boolean; allowIndexing?: boolean };

export async function updateShareOptions(
  userId: string,
  id: string,
  options: ShareOptions,
  now = Date.now(),
): Promise<SharedLink | null> {
  const db = await getDb();
  const [row] = await db
    .update(shares)
    .set({ ...options, updatedAt: now })
    .where(and(live(userId), eq(shares.id, id)))
    .returning(linkColumns);
  return row ? toLink(row) : null;
}

export async function revokeShare(userId: string, id: string, now = Date.now()): Promise<boolean> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(shares)
      .set({ revokedAt: now, snapshot: null, updatedAt: now })
      .where(and(live(userId), eq(shares.id, id)))
      .returning({ id: shares.id });
    if (!row) return false;
    const revoked = and(eq(shares.userId, userId), isNotNull(shares.revokedAt));
    const kept = tx
      .select({ id: shares.id })
      .from(shares)
      .where(revoked)
      .orderBy(desc(shares.revokedAt), desc(shares.id))
      .limit(SHARE_LIMITS.keptRevoked);
    await tx.delete(shares).where(and(revoked, notInArray(shares.id, kept)));
    return true;
  });
}

export type PublicShare = {
  id: string;
  ownerId: string;
  resume: Resume;
  allowIndexing: boolean;
};

export async function findPublicShare(slug: string): Promise<PublicShare | null> {
  if (!SHARE_SLUG.test(slug)) return null;
  const db = await getDb();
  const [row] = await db
    .select({
      id: shares.id,
      ownerId: shares.userId,
      ownerPlan: users.plan,
      snapshot: shares.snapshot,
      showContact: shares.showContact,
      allowIndexing: shares.allowIndexing,
    })
    .from(shares)
    .innerJoin(users, eq(users.id, shares.userId))
    .where(and(eq(shares.slug, slug), isNull(shares.revokedAt)))
    .limit(1);
  if (!row?.snapshot) return null;
  const parsed = ResumeSchema.safeParse(row.snapshot);
  if (!parsed.success) {
    log.warn("share.snapshot_invalid", { shareId: row.id });
    return null;
  }
  return {
    id: row.id,
    ownerId: row.ownerId,
    resume: publicResume(forPlan(parsed.data, row.ownerPlan), row.showContact),
    allowIndexing: row.allowIndexing,
  };
}

// One reader (network plus browser), keeping neither in the clear.
export function readerKey(ip: string, userAgent: string): string {
  return createHash("sha256").update(`${ip}\n${userAgent}`).digest("base64url").slice(0, 22);
}

export async function recordView(
  shareId: string,
  reader: string,
  now = Date.now(),
): Promise<boolean> {
  const seen = await rateLimit(
    `share:reader:${shareId}:${reader}`,
    1,
    VIEW_LIMITS.sameReaderWindowMs,
    now,
  );
  if (!seen.allowed) return false;
  const hourly = await rateLimit(
    `share:views:${shareId}`,
    VIEW_LIMITS.perLinkPerHour,
    HOUR_MS,
    now,
  );
  if (!hourly.allowed) return false;
  const db = await getDb();
  const updated = await db
    .update(shares)
    .set({ views: sql`least(${shares.views} + 1, ${VIEW_LIMITS.max})`, lastViewedAt: now })
    .where(and(eq(shares.id, shareId), isNull(shares.revokedAt)))
    .returning({ id: shares.id });
  return updated.length > 0;
}
