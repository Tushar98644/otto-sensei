import { and, count, desc, eq, getTableColumns, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { getDb, type Db, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { applications, notifications, notificationSettings, users } from "@/db/schema";
import { FOLLOW_UP_DAYS, followUpState } from "@/lib/applications/follow-up";
import type { ApplicationStatus } from "@/lib/applications/status";
import { outcomeOpen } from "@/lib/interviews/outcome";
import { promptResting } from "./prompts";
import {
  isInAppPath,
  NOTIFICATION_LIMITS,
  type Notification,
  type NotificationKind,
  type ReminderSettings,
} from "./types";

// Every query is filtered by user_id, so a guessed id never reads or marks another account's rows.

type Row = typeof notifications.$inferSelect & {
  status: ApplicationStatus | null;
  followUpAt: number | null;
  interviewAt: number | null;
  interviewAskedFor: number | null;
  interviewAnsweredFor: number | null;
};

function toNotification(row: Row): Notification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    link: row.link !== null && isInAppPath(row.link) ? row.link : null,
    readAt: row.readAt,
    createdAt: row.createdAt,
    applicationId: row.status === null ? null : row.applicationId,
    followUpDue: false,
    outcomeOpen: false,
  };
}

// Rows come newest first; an older reminder about the same follow-up keeps its text but not its buttons.
function withFollowUps(rows: readonly Row[], now: number): Notification[] {
  const offered = new Set<string>();
  const asked = new Set<string>();
  return rows.map((row) => {
    const item = toNotification(row);
    const id = item.applicationId;
    if (row.kind === "interview_after") {
      if (id === null || asked.has(id) || row.status === null) return item;
      asked.add(id);
      return outcomeOpen({ ...row, status: row.status }) ? { ...item, outcomeOpen: true } : item;
    }
    if (
      row.kind !== "application_follow_up" ||
      id === null ||
      offered.has(id) ||
      row.status === null
    ) {
      return item;
    }
    if (followUpState({ status: row.status, followUpAt: row.followUpAt }, now) !== "due")
      return item;
    offered.add(id);
    return { ...item, followUpDue: true };
  });
}

async function unreadCount(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export type NotificationList = { notifications: Notification[]; unread: number };

export async function listNotifications(
  userId: string,
  limit: number = NOTIFICATION_LIMITS.listed,
  now = Date.now(),
): Promise<NotificationList> {
  const db = await getDb();
  return db.transaction(
    async (tx) => {
      const rows = await tx
        .select({
          ...getTableColumns(notifications),
          status: applications.status,
          followUpAt: applications.followUpAt,
          interviewAt: applications.interviewAt,
          interviewAskedFor: applications.interviewAskedFor,
          interviewAnsweredFor: applications.interviewAnsweredFor,
        })
        .from(notifications)
        .leftJoin(
          applications,
          and(
            eq(applications.id, notifications.applicationId),
            eq(applications.userId, notifications.userId),
          ),
        )
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(limit);
      return { notifications: withFollowUps(rows, now), unread: await unreadCount(tx, userId) };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export type MarkReadTarget = { ids: string[] } | { all: true };

export async function markNotificationsRead(
  userId: string,
  target: MarkReadTarget,
  now = Date.now(),
): Promise<number> {
  const db = await getDb();
  const unread = and(eq(notifications.userId, userId), isNull(notifications.readAt));
  const which = "all" in target ? unread : and(unread, inArray(notifications.id, target.ids));
  await db.update(notifications).set({ readAt: now }).where(which);
  return unreadCount(db, userId);
}

export type NewNotification = {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  applicationId?: string | null;
};

// The caller's transaction must already hold the user's row lock (lockUser).
export async function insertNotification(
  tx: Tx,
  notification: NewNotification,
  now = Date.now(),
): Promise<string> {
  if (notification.link !== null && !isInAppPath(notification.link)) {
    throw new Error("insertNotification: link must be an in-app path");
  }
  const id = crypto.randomUUID();
  await tx.insert(notifications).values({
    id,
    userId: notification.userId,
    kind: notification.kind,
    title: notification.title.slice(0, NOTIFICATION_LIMITS.title),
    body: notification.body.slice(0, NOTIFICATION_LIMITS.body),
    link: notification.link,
    applicationId: notification.applicationId ?? null,
    createdAt: now,
  });
  return id;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  emailReminders: false,
  followUpDays: FOLLOW_UP_DAYS.default,
};

async function settingsOf(db: Db, userId: string): Promise<ReminderSettings> {
  const [row] = await db
    .select({
      emailReminders: notificationSettings.emailReminders,
      followUpDays: notificationSettings.followUpDays,
    })
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);
  return row ?? DEFAULT_SETTINGS;
}

export async function emailRemindersOn(db: Db, userId: string): Promise<boolean> {
  return (await settingsOf(db, userId)).emailReminders;
}

export async function followUpDaysOf(db: Db, userId: string): Promise<number> {
  return (await settingsOf(db, userId)).followUpDays;
}

export function followUpDaysSql(userId: string): SQL<number> {
  return sql<number>`coalesce((select ${notificationSettings.followUpDays} from ${notificationSettings} where ${notificationSettings.userId} = ${userId}), ${FOLLOW_UP_DAYS.default})`;
}

export type StoredReminderSettings = ReminderSettings & { chosen: boolean; promptSnoozed: boolean };

export async function readReminderSettings(
  userId: string,
  now = Date.now(),
): Promise<StoredReminderSettings | null> {
  const db = await getDb();
  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!owner) return null;
  const [row] = await db
    .select({
      emailReminders: notificationSettings.emailReminders,
      followUpDays: notificationSettings.followUpDays,
      chosen: notificationSettings.remindersChosen,
      snoozedAt: notificationSettings.reminderPromptSnoozedAt,
    })
    .from(notificationSettings)
    .where(eq(notificationSettings.userId, userId))
    .limit(1);
  if (!row) return { ...DEFAULT_SETTINGS, chosen: false, promptSnoozed: false };
  const { snoozedAt, ...settings } = row;
  return { ...settings, promptSnoozed: promptResting(snoozedAt, now) };
}

// "Not now" on the reminders card: nothing is chosen, so the card can ask again after a rest.
export async function snoozeReminderPrompt(userId: string, now = Date.now()): Promise<boolean> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return false;
    await tx
      .insert(notificationSettings)
      .values({
        userId,
        ...DEFAULT_SETTINGS,
        remindersChosen: false,
        reminderPromptSnoozedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: { reminderPromptSnoozedAt: now, updatedAt: now },
      });
    return true;
  });
}

export async function readEmailReminders(userId: string): Promise<boolean | null> {
  return (await readReminderSettings(userId))?.emailReminders ?? null;
}

// Under the account's row lock so it can't race account deletion.
export async function saveReminderSettings(
  userId: string,
  change: Partial<ReminderSettings>,
  now = Date.now(),
): Promise<ReminderSettings | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const set = {
      ...(change.emailReminders === undefined ? {} : { emailReminders: change.emailReminders }),
      ...(change.followUpDays === undefined ? {} : { followUpDays: change.followUpDays }),
      remindersChosen: true,
      updatedAt: now,
    };
    const [row] = await tx
      .insert(notificationSettings)
      .values({ userId, ...DEFAULT_SETTINGS, ...set })
      .onConflictDoUpdate({ target: notificationSettings.userId, set })
      .returning({
        emailReminders: notificationSettings.emailReminders,
        followUpDays: notificationSettings.followUpDays,
      });
    return row ?? null;
  });
}

export async function setEmailReminders(
  userId: string,
  on: boolean,
  now = Date.now(),
): Promise<boolean | null> {
  return (await saveReminderSettings(userId, { emailReminders: on }, now))?.emailReminders ?? null;
}
