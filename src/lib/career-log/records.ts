import { and, asc, count, desc, eq, gte, lte } from "drizzle-orm";
import { getDb, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { careerLogEntries, careerLogSettings, users } from "@/db/schema";
import { promptResting } from "@/lib/notifications/prompts";
import { normalizeEntry, type EntryChange } from "./entry";
import { localDate, nextCheckinOn, pauseUntil, safeTimeZone } from "./schedule";
import {
  CAREER_LOG_LIMITS,
  DEFAULT_CHECKIN_DAY,
  type CareerLogEntry,
  type CareerLogSettings,
  type CheckinDay,
  type Month,
} from "./types";

// Every query is filtered by user_id, so a guessed month never reads or changes another account's notes.

type EntryRow = typeof careerLogEntries.$inferSelect;
type SettingsRow = typeof careerLogSettings.$inferSelect;

function toEntry(row: EntryRow): CareerLogEntry {
  return {
    id: row.id,
    month: row.month,
    shipped: row.shipped,
    numbers: row.numbers,
    learned: row.learned,
    nothingNew: row.nothingNew,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const DEFAULT_SETTINGS: CareerLogSettings = {
  checkins: false,
  emails: true,
  day: DEFAULT_CHECKIN_DAY,
  timeZone: "UTC",
  nextCheckinOn: null,
  pausedUntil: null,
  job: { role: "", company: "" },
  promptClosed: false,
  promptSnoozed: false,
};

export function toSettings(row: SettingsRow | undefined, now: number): CareerLogSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    checkins: row.checkins,
    emails: row.emails,
    day: { week: row.week, weekday: row.weekday },
    timeZone: row.timeZone,
    nextCheckinOn: row.checkins ? row.nextCheckinOn : null,
    pausedUntil: row.pausedUntil,
    job: { role: row.jobRole, company: row.jobCompany },
    promptClosed: row.promptClosedAt !== null,
    promptSnoozed: promptResting(row.promptSnoozedAt, now),
  };
}

export async function listEntries(userId: string): Promise<CareerLogEntry[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(careerLogEntries)
    .where(eq(careerLogEntries.userId, userId))
    .orderBy(desc(careerLogEntries.month))
    .limit(CAREER_LOG_LIMITS.entries);
  return rows.map(toEntry);
}

export async function entriesBetween(
  userId: string,
  from: Month,
  to: Month,
): Promise<CareerLogEntry[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(careerLogEntries)
    .where(
      and(
        eq(careerLogEntries.userId, userId),
        gte(careerLogEntries.month, from),
        lte(careerLogEntries.month, to),
      ),
    )
    .orderBy(asc(careerLogEntries.month))
    .limit(CAREER_LOG_LIMITS.linesMonths);
  return rows.map(toEntry);
}

async function settingsRow(tx: Tx, userId: string): Promise<SettingsRow | undefined> {
  const [row] = await tx
    .select()
    .from(careerLogSettings)
    .where(eq(careerLogSettings.userId, userId))
    .limit(1);
  return row;
}

// Null when the account is gone.
export async function readSettings(
  userId: string,
  now = Date.now(),
): Promise<CareerLogSettings | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, settings: careerLogSettings })
    .from(users)
    .leftJoin(careerLogSettings, eq(careerLogSettings.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return null;
  return toSettings(row.settings ?? undefined, now);
}

export type SaveEntryResult =
  { status: "saved"; entry: CareerLogEntry | null } | { status: "full" } | { status: "gone" };

// An entry emptied of every word is removed, so a month someone started and cleared leaves nothing behind.
export async function saveEntry(
  userId: string,
  month: Month,
  change: EntryChange,
  now = Date.now(),
): Promise<SaveEntryResult> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return { status: "gone" };
    const [existing] = await tx
      .select()
      .from(careerLogEntries)
      .where(and(eq(careerLogEntries.userId, userId), eq(careerLogEntries.month, month)))
      .limit(1);
    const next = normalizeEntry(existing ? toEntry(existing) : null, change);
    if (next === null) {
      if (existing) await tx.delete(careerLogEntries).where(eq(careerLogEntries.id, existing.id));
      return { status: "saved", entry: null };
    }
    if (existing) {
      const [row] = await tx
        .update(careerLogEntries)
        .set({ ...next, updatedAt: now })
        .where(eq(careerLogEntries.id, existing.id))
        .returning();
      return { status: "saved", entry: row ? toEntry(row) : null };
    }
    const [held] = await tx
      .select({ n: count() })
      .from(careerLogEntries)
      .where(eq(careerLogEntries.userId, userId));
    if ((held?.n ?? 0) >= CAREER_LOG_LIMITS.entries) return { status: "full" };
    const [row] = await tx
      .insert(careerLogEntries)
      .values({ id: crypto.randomUUID(), userId, month, ...next, createdAt: now, updatedAt: now })
      .returning();
    return { status: "saved", entry: row ? toEntry(row) : null };
  });
}

export async function deleteEntry(userId: string, month: Month): Promise<void> {
  const db = await getDb();
  await db
    .delete(careerLogEntries)
    .where(and(eq(careerLogEntries.userId, userId), eq(careerLogEntries.month, month)));
}

export type SettingsChange = {
  checkins?: boolean;
  emails?: boolean;
  day?: CheckinDay;
  timeZone?: string;
  // 0 ends a pause.
  pauseMonths?: number;
  promptSnoozed?: true;
  job?: { role: string; company: string };
};

// Turning check-ins on or off, here or on the card, answers the card for good; "Not now" only rests it.
export async function saveSettings(
  userId: string,
  change: SettingsChange,
  now = Date.now(),
): Promise<CareerLogSettings | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const before = await settingsRow(tx, userId);
    const timeZone = safeTimeZone(change.timeZone ?? before?.timeZone);
    const day = change.day ?? { week: before?.week ?? 1, weekday: before?.weekday ?? 1 };
    const checkins = change.checkins ?? before?.checkins ?? false;
    const today = localDate(timeZone, now);
    const reschedule =
      change.checkins === true ||
      change.day !== undefined ||
      change.timeZone !== undefined ||
      (checkins && !before?.nextCheckinOn);
    const values = {
      checkins,
      emails: change.emails ?? before?.emails ?? true,
      week: day.week,
      weekday: day.weekday,
      timeZone,
      nextCheckinOn: reschedule ? nextCheckinOn(day, today) : (before?.nextCheckinOn ?? null),
      pausedUntil:
        change.pauseMonths === undefined
          ? (before?.pausedUntil ?? null)
          : change.pauseMonths === 0
            ? null
            : pauseUntil(today, change.pauseMonths),
      jobRole: change.job?.role ?? before?.jobRole ?? "",
      jobCompany: change.job?.company ?? before?.jobCompany ?? "",
      promptClosedAt:
        change.checkins === undefined
          ? (before?.promptClosedAt ?? null)
          : (before?.promptClosedAt ?? now),
      promptSnoozedAt: change.promptSnoozed ? now : (before?.promptSnoozedAt ?? null),
      updatedAt: now,
    };
    const [row] = await tx
      .insert(careerLogSettings)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: careerLogSettings.userId, set: values })
      .returning();
    return toSettings(row, now);
  });
}

// The one-click unsubscribe: the email stops, the bell keeps its monthly note.
export async function stopCheckinEmails(userId: string): Promise<boolean> {
  return (await saveSettings(userId, { emails: false })) !== null;
}
