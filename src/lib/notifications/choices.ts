import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { notificationSettings, users } from "@/db/schema";
import { stopCheckinEmails } from "@/lib/career-log/records";
import { promptResting } from "./prompts";
import { setEmailReminders } from "./records";
import type { EmailChoices, EmailList } from "./types";

// No settings row means the defaults: the weekly jobs and views emails off, tips and reminders on.
const DEFAULT_CHOICES: EmailChoices = {
  jobEmails: false,
  tipEmails: true,
  viewEmails: false,
  jobPromptClosed: false,
  jobPromptSnoozed: false,
  viewPromptClosed: false,
  viewPromptSnoozed: false,
};

const CHOICE_COLUMNS = {
  jobEmails: notificationSettings.jobEmails,
  tipEmails: notificationSettings.tipEmails,
  viewEmails: notificationSettings.viewEmails,
  promptClosedAt: notificationSettings.jobPromptClosedAt,
  jobSnoozedAt: notificationSettings.jobPromptSnoozedAt,
  viewClosedAt: notificationSettings.viewPromptClosedAt,
  viewSnoozedAt: notificationSettings.viewPromptSnoozedAt,
};

type ChoiceRow = {
  jobEmails: boolean;
  tipEmails: boolean;
  viewEmails: boolean;
  promptClosedAt: number | null;
  jobSnoozedAt: number | null;
  viewClosedAt: number | null;
  viewSnoozedAt: number | null;
};

function toChoices(row: ChoiceRow, now: number): EmailChoices {
  return {
    jobEmails: row.jobEmails,
    tipEmails: row.tipEmails,
    viewEmails: row.viewEmails,
    jobPromptClosed: row.promptClosedAt !== null,
    jobPromptSnoozed: promptResting(row.jobSnoozedAt, now),
    viewPromptClosed: row.viewClosedAt !== null,
    viewPromptSnoozed: promptResting(row.viewSnoozedAt, now),
  };
}

export async function readEmailChoices(
  userId: string,
  now = Date.now(),
): Promise<EmailChoices | null> {
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, ...CHOICE_COLUMNS })
    .from(users)
    .leftJoin(notificationSettings, eq(notificationSettings.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return null;
  if (row.jobEmails === null || row.tipEmails === null || row.viewEmails === null) {
    return DEFAULT_CHOICES;
  }
  return toChoices(
    { ...row, jobEmails: row.jobEmails, tipEmails: row.tipEmails, viewEmails: row.viewEmails },
    now,
  );
}

type EmailChoicesChange = Partial<Pick<EmailChoices, "jobEmails" | "tipEmails" | "viewEmails">> & {
  jobPromptClosed?: true;
  jobPromptSnoozed?: true;
  viewPromptSnoozed?: true;
};

const closedOnce = (column: typeof notificationSettings.jobPromptClosedAt, now: number) =>
  sql`coalesce(${column}, ${now})`;

// Choosing either way answers that list's card too, so it never asks again; "Not now" only rests it.
export async function saveEmailChoices(
  userId: string,
  change: EmailChoicesChange,
  now = Date.now(),
): Promise<EmailChoices | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return null;
    const jobsAnswered = change.jobPromptClosed === true || change.jobEmails !== undefined;
    const viewsAnswered = change.viewEmails !== undefined;
    const set = {
      ...(change.jobEmails === undefined ? {} : { jobEmails: change.jobEmails }),
      ...(change.tipEmails === undefined ? {} : { tipEmails: change.tipEmails }),
      ...(change.viewEmails === undefined ? {} : { viewEmails: change.viewEmails }),
      // Views from before it was turned on were already in the bell: the first email starts now.
      ...(change.viewEmails === true ? { viewsEmailedAt: now } : {}),
      ...(change.jobPromptSnoozed ? { jobPromptSnoozedAt: now } : {}),
      ...(change.viewPromptSnoozed ? { viewPromptSnoozedAt: now } : {}),
      updatedAt: now,
    };
    const [row] = await tx
      .insert(notificationSettings)
      // A new row leaves the follow-up reminder choice unmade.
      .values({
        userId,
        ...set,
        remindersChosen: false,
        ...(jobsAnswered ? { jobPromptClosedAt: now } : {}),
        ...(viewsAnswered ? { viewPromptClosedAt: now } : {}),
      })
      .onConflictDoUpdate({
        target: notificationSettings.userId,
        set: {
          ...set,
          ...(jobsAnswered
            ? { jobPromptClosedAt: closedOnce(notificationSettings.jobPromptClosedAt, now) }
            : {}),
          ...(viewsAnswered
            ? { viewPromptClosedAt: closedOnce(notificationSettings.viewPromptClosedAt, now) }
            : {}),
        },
      })
      .returning(CHOICE_COLUMNS);
    return row ? toChoices(row, now) : null;
  });
}

const STOP: Record<Exclude<EmailList, "reminders" | "career">, EmailChoicesChange> = {
  jobs: { jobEmails: false },
  tips: { tipEmails: false },
  views: { viewEmails: false },
};

// The one-click unsubscribe for each list; false when the account is gone.
export async function stopEmails(userId: string, list: EmailList): Promise<boolean> {
  if (list === "reminders") return (await setEmailReminders(userId, false)) !== null;
  if (list === "career") return stopCheckinEmails(userId);
  return (await saveEmailChoices(userId, STOP[list])) !== null;
}
