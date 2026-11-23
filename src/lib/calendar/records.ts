import { createHash, createHmac, randomUUID } from "node:crypto";
import { and, eq, gte, isNotNull, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, userSettings } from "@/db/schema";
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
      .select({ feedId: userSettings.calendarFeedId, tokenHash: userSettings.calendarTokenHash })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    if (row?.feedId && !renew) {
      const token = sign(secret, row.feedId);
      // A rotated secret makes a new link; the stored hash follows it so the link shown works.
      if (hashFeedToken(token) !== row.tokenHash) {
        await tx
          .update(userSettings)
          .set({ calendarTokenHash: hashFeedToken(token) })
          .where(eq(userSettings.userId, userId));
      }
      return feedLinks(token);
    }
    const feedId = randomUUID();
    const token = sign(secret, feedId);
    const values = {
      calendarFeedId: feedId,
      calendarTokenHash: hashFeedToken(token),
      calendarFeedAt: now,
    };
    await tx
      .insert(userSettings)
      .values({ userId, ...values, updatedAt: now })
      .onConflictDoUpdate({ target: userSettings.userId, set: values });
    return feedLinks(token);
  });
}

export async function feedOwner(token: string): Promise<string | null> {
  if (!TOKEN.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ userId: userSettings.userId })
    .from(userSettings)
    .where(eq(userSettings.calendarTokenHash, hashFeedToken(token)))
    .limit(1);
  return row?.userId ?? null;
}

export async function feedFor(userId: string, now = Date.now()): Promise<string> {
  const db = await getDb();
  const [profile] = await db
    .select({ timeZone: userSettings.timeZone })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
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
