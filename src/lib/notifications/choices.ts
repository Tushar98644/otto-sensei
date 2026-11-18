import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { notificationSettings, users } from "@/db/schema";
import { setEmailReminders } from "./records";
import type { EmailChoices, EmailList } from "./types";

// No settings row means the defaults: the weekly jobs email off, tips and reminders on.
const DEFAULT_CHOICES: EmailChoices = { jobEmails: false, tipEmails: true, jobPromptClosed: false };

const CHOICE_COLUMNS = {
  jobEmails: notificationSettings.jobEmails,
  tipEmails: notificationSettings.tipEmails,
  promptClosedAt: notificationSettings.jobPromptClosedAt,
};

function toChoices(row: { jobEmails: boolean; tipEmails: boolean; promptClosedAt: number | null }) {
  return {
    jobEmails: row.jobEmails,
    tipEmails: row.tipEmails,
    jobPromptClosed: row.promptClosedAt !== null,
  };
}

export async function readEmailChoices(userId: string): Promise<EmailChoices | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, ...CHOICE_COLUMNS })
    .from(users)
    .leftJoin(notificationSettings, eq(notificationSettings.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return null;
  if (row.jobEmails === null || row.tipEmails === null) return DEFAULT_CHOICES;
  return toChoices({ ...row, jobEmails: row.jobEmails, tipEmails: row.tipEmails });
}

type EmailChoicesChange = Partial<Pick<EmailChoices, "jobEmails" | "tipEmails">> & {
  jobPromptClosed?: true;
};

// Choosing either way answers the Jobs tab's card too, so it never asks again.
export async function saveEmailChoices(
  userId: string,
  change: EmailChoicesChange,
  now = Date.now(),
): Promise<EmailChoices | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const answered = change.jobPromptClosed === true || change.jobEmails !== undefined;
    const set = {
      ...(change.jobEmails === undefined ? {} : { jobEmails: change.jobEmails }),
      ...(change.tipEmails === undefined ? {} : { tipEmails: change.tipEmails }),
      updatedAt: now,
    };
    const [row] = await tx
      .insert(notificationSettings)
      // A new row leaves the follow-up reminder choice unmade.
      .values({
        userId,
        ...set,
        remindersChosen: false,
        ...(answered ? { jobPromptClosedAt: now } : {}),
      })
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: {
          ...set,
          ...(answered
            ? {
                jobPromptClosedAt: sql`coalesce(${notificationSettings.jobPromptClosedAt}, ${now})`,
              }
            : {}),
        },
      })
      .returning(CHOICE_COLUMNS);
    return row ? toChoices(row) : null;
  });
}

// The one-click unsubscribe for each list; false when the account is gone.
export async function stopEmails(userId: string, list: EmailList): Promise<boolean> {
  if (list === "reminders") return (await setEmailReminders(userId, false)) !== null;
  const change = list === "jobs" ? { jobEmails: false } : { tipEmails: false };
  return (await saveEmailChoices(userId, change)) !== null;
}
