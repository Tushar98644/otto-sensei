import { createHash, createHmac, randomUUID } from "node:crypto";
import { and, eq, gte, isNotNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, calendarFeeds, workProfiles } from "@/db/schema";
import { cronSecret } from "@/lib/cron/auth";
import { appUrl } from "@/lib/env";
import { readStatus } from "@/lib/applications/status";
import { DAY_MS } from "@/lib/time";
import { calendarFeed, FEED, type FeedApplication } from "./feed";
import type { FeedLinks } from "./types";

// The link is signed over a random feed id: the database alone never holds a working link, and a new id retires the old one.

const FEED_PATH = "/api/calendar";
const TOKEN = /^[A-Za-z0-9_-]{43}$/;

function sign(secret: string, feedId: string): string {
  return createHmac("sha256", secret).update(`calendar-feed:v1:${feedId}`).digest("base64url");
}

function hashFeedToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function feedLinks(token: string, base = appUrl()): FeedLinks {
  const https = new URL(`${FEED_PATH}/${token}.ics`, base).toString();
  const webcal = https.replace(/^https?:/, "webcal:");
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
  };
}

// The account's link, made on first ask; renew swaps in a new one. Null without a signing secret or an account.
export async function ensureFeed(
  userId: string,
  { renew = false, now = Date.now() }: { renew?: boolean; now?: number } = {},
): Promise<FeedLinks | null> {
  const secret = cronSecret();
  if (!secret) return null;
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const [row] = await tx
      .select({ feedId: calendarFeeds.feedId, tokenHash: calendarFeeds.tokenHash })
      .from(calendarFeeds)
      .where(eq(calendarFeeds.userId, userId))
      .limit(1);
    if (row && !renew) {
      const token = sign(secret, row.feedId);
      // A rotated secret makes a new link; the stored hash follows it so the link shown works.
      if (hashFeedToken(token) !== row.tokenHash) {
        await tx
          .update(calendarFeeds)
          .set({ tokenHash: hashFeedToken(token) })
          .where(eq(calendarFeeds.userId, userId));
      }
      return feedLinks(token);
    }
    const feedId = randomUUID();
    const token = sign(secret, feedId);
    const values = { feedId, tokenHash: hashFeedToken(token), createdAt: now };
    await tx
      .insert(calendarFeeds)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: calendarFeeds.userId, set: values });
    return feedLinks(token);
  });
}

export async function feedOwner(token: string): Promise<string | null> {
  if (!TOKEN.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ userId: calendarFeeds.userId })
    .from(calendarFeeds)
    .where(eq(calendarFeeds.tokenHash, hashFeedToken(token)))
    .limit(1);
  return row?.userId ?? null;
}

export async function feedFor(userId: string, now = Date.now()): Promise<string> {
  const db = await getDb();
  const [profile] = await db
    .select({ timeZone: workProfiles.timeZone })
    .from(workProfiles)
    .where(eq(workProfiles.userId, userId))
    .limit(1);
  const rows = await db
    .select({
      applicationId: applications.id,
      company: applications.company,
      role: applications.role,
      status: applications.status,
      statusChangedAt: applications.statusChangedAt,
      interviewAt: applications.interviewAt,
      interviewTime: applications.interviewTime,
      interviewZone: applications.interviewZone,
      followUpAt: applications.followUpAt,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .where(
      and(
        eq(applications.userId, userId),
        or(
          and(
            isNotNull(applications.interviewAt),
            gte(applications.interviewAt, now - FEED.interviewDays * DAY_MS),
          ),
          and(
            isNotNull(applications.followUpAt),
            gte(applications.followUpAt, now - FEED.followUpDays * DAY_MS),
          ),
        ),
      ),
    )
    .orderBy(applications.appliedAt)
    .limit(FEED.maxEvents);
  const items: FeedApplication[] = rows.map((row) => ({
    ...row,
    status: readStatus(row.status) ?? "applied",
  }));
  return calendarFeed(items, { origin: appUrl(), timeZone: profile?.timeZone || null, now });
}
