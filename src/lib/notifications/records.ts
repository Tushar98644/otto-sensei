import { and, count, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { getDb, type Db, type Tx } from "@/db/client";
import { lockUser } from "@/db/locks";
import { notifications, notificationSettings, users } from "@/db/schema";
import { FOLLOW_UP_DAYS } from "@/lib/applications/follow-up";
import {
  isInAppPath,
  NOTIFICATION_LIMITS,
  type Notification,
  type NotificationKind,
  type ReminderSettings,
} from "./types";

// Server-only. A user's notifications. Every query is filtered by user_id, so a guessed id can
// never read or mark another account's rows.

type Row = typeof notifications.$inferSelect;

function toNotification(row: Row): Notification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    link: row.link !== null && isInAppPath(row.link) ? row.link : null,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

// A transaction is a Db too, so this reads inside one when given it.
async function unreadCount(db: Db, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export type NotificationList = { notifications: Notification[]; unread: number };

/** The newest notifications and the unread count, read from one snapshot so they agree. */
export async function listNotifications(
  userId: string,
  limit: number = NOTIFICATION_LIMITS.listed,
): Promise<NotificationList> {
  const db = await getDb();
  return db.transaction(
    async (tx) => {
      const rows = await tx
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt), desc(notifications.id))
        .limit(limit);
      return { notifications: rows.map(toNotification), unread: await unreadCount(tx, userId) };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export type MarkReadTarget = { ids: string[] } | { all: true };

/** Marks the given unread notifications (or all of them) read. Returns how many stay unread. */
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
};

/** Inside the caller's transaction, which must already hold the user's row lock (lockUser). */
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
    createdAt: now,
  });
  return id;
}

// No row means the defaults: no email (people opt in, never out) and FOLLOW_UP_DAYS.default.
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

/** Whether reminder emails are on: only once the account turned them on. */
export async function emailRemindersOn(db: Db, userId: string): Promise<boolean> {
  return (await settingsOf(db, userId)).emailReminders;
}

/** Days from applying to the first follow-up reminder, for new applications. */
export async function followUpDaysOf(db: Db, userId: string): Promise<number> {
  return (await settingsOf(db, userId)).followUpDays;
}

/** The same, as SQL for an UPDATE that sets many rows' dates in one statement. */
export function followUpDaysSql(userId: string): SQL<number> {
  return sql<number>`coalesce((select ${notificationSettings.followUpDays} from ${notificationSettings} where ${notificationSettings.userId} = ${userId}), ${FOLLOW_UP_DAYS.default})`;
}

/** The account's reminder settings, or null when the account doesn't exist. */
export async function readReminderSettings(userId: string): Promise<ReminderSettings | null> {
  const db = await getDb();
  const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  return owner ? settingsOf(db, userId) : null;
}

/** The account's reminder email switch, or null when the account doesn't exist. */
export async function readEmailReminders(userId: string): Promise<boolean | null> {
  return (await readReminderSettings(userId))?.emailReminders ?? null;
}

/**
 * Changes the given settings in one upsert (the rest keep their stored or default value), under
 * the account's row lock so it can't race an account deletion. Returns what is stored now, or
 * null when there's no account.
 */
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

/** Turns reminder emails on or off. Returns the stored value, or null when there's no account. */
export async function setEmailReminders(
  userId: string,
  on: boolean,
  now = Date.now(),
): Promise<boolean | null> {
  return (await saveReminderSettings(userId, { emailReminders: on }, now))?.emailReminders ?? null;
}
