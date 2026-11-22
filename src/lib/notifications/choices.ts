import { getDb } from "@/db/client";
import { lockUser } from "@/db/locks";
import { userSettings } from "@/db/schema";
import { stopCheckinEmails } from "@/lib/career-log/records";
import { setEmailReminders } from "./records";
import type { EmailList } from "./types";

// The lists of emails no longer sent keep their choice, so links in emails already sent still work and an opt-out is never lost.
const OLD_LISTS = {
  jobs: { jobEmails: false },
  tips: { tipEmails: false },
  views: { viewEmails: false },
} as const;

async function stopOldList(
  userId: string,
  list: keyof typeof OLD_LISTS,
  now = Date.now(),
): Promise<boolean> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    if (!(await lockUser(tx, userId))) return false;
    const set = { ...OLD_LISTS[list], updatedAt: now };
    await tx
      .insert(userSettings)
      .values({ userId, ...set })
      .onConflictDoUpdate({ target: userSettings.userId, set });
    return true;
  });
}

// The one-click unsubscribe for each list; false when the account is gone.
export async function stopEmails(userId: string, list: EmailList): Promise<boolean> {
  if (list === "reminders") return (await setEmailReminders(userId, false)) !== null;
  if (list === "career") return stopCheckinEmails(userId);
  return stopOldList(userId, list);
}
