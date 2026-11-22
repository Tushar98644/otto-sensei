import { isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { activeDays, userSettings } from "@/db/schema";
import { DAY_MS } from "@/lib/time";
import type { DashboardSection, EmailLanding } from "./landing";
import { trackDashboardView, trackEmailClick, trackReturn } from "./retention";

export type Activity = {
  section: DashboardSection;
  timeZone?: string;
  email?: EmailLanding;
};

const DAY_PARTS = { year: "numeric", month: "2-digit", day: "2-digit" } as const;

// The date where the person is, as YYYY-MM-DD; an unknown zone falls back to UTC.
export function calendarDay(now: number, timeZone?: string): string {
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat("en-US", { ...DAY_PARTS, timeZone: timeZone || "UTC" });
  } catch {
    format = new Intl.DateTimeFormat("en-US", { ...DAY_PARTS, timeZone: "UTC" });
  }
  const parts = Object.fromEntries(
    format.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export type ActiveDayMark = { previous: string | null };

// Null unless this is the account's first app page on that day; never moves the day backwards.
export async function markActiveDay(
  userId: string,
  day: string,
  now = Date.now(),
): Promise<ActiveDayMark | null> {
  const db = await getDb();
  const [row] = await db
    .insert(userSettings)
    .values({ userId, activeOn: day, updatedAt: now })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { activeOn: day },
      setWhere: or(isNull(userSettings.activeOn), lt(userSettings.activeOn, day)),
    })
    // A sub-select sees the table as it was before this statement: no day yet means the first one.
    .returning({
      previous: sql<
        string | null
      >`(select a.active_on::text from ${userSettings} a where a.user_id = ${userId})`,
    });
  return row ? { previous: row.previous } : null;
}

export async function recordActivity(
  userId: string,
  activity: Activity,
  now = Date.now(),
): Promise<void> {
  trackDashboardView(userId, activity.section);
  if (activity.email) trackEmailClick(userId, activity.email);
  const day = calendarDay(now, activity.timeZone);
  const mark = await markActiveDay(userId, day, now);
  if (!mark) return;
  // The weekly recap's days active: the date only.
  const db = await getDb();
  await db.insert(activeDays).values({ userId, day }).onConflictDoNothing();
  trackReturn(
    userId,
    activity.section,
    mark.previous === null ? null : daysBetween(mark.previous, day),
  );
}
