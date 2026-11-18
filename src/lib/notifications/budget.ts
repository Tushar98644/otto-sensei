import { count, gt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { emailLog, notificationSettings } from "@/db/schema";
import { HOUR_MS } from "@/lib/time";

// Sign-in codes, follow-ups and trial notices go through the same Resend account (about 100 a day on its free tier), so optional emails stay well under it.

const OPTIONAL_EMAILS = {
  perDay: 25,
  // Shorter than a day, so yesterday's run at the same hour never counts against today's.
  windowMs: 20 * HOUR_MS,
  // Tips never take more than this share, so the weekly emails people asked for still go out.
  tipsShare: 0.5,
} as const;

type OptionalList = "jobs" | "tips";

// OPTIONAL_EMAILS_PER_DAY raises it on a paid Resend plan; 0 stops optional emails.
function optionalEmailsPerDay(): number {
  const raw = process.env.OPTIONAL_EMAILS_PER_DAY?.trim();
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isInteger(value) && value >= 0 ? value : OPTIONAL_EMAILS.perDay;
}

// Counted from what went out lately, so a repeated run can't add more.
export async function optionalEmailRoom(list: OptionalList, now: number): Promise<number> {
  const db = await getDb();
  const since = now - OPTIONAL_EMAILS.windowMs;
  const [[tips], [jobs]] = await Promise.all([
    db.select({ n: count() }).from(emailLog).where(gt(emailLog.createdAt, since)),
    db
      .select({ n: count() })
      .from(notificationSettings)
      .where(gt(notificationSettings.jobsEmailedAt, since)),
  ]);
  const tipsSent = tips?.n ?? 0;
  const total = optionalEmailsPerDay();
  const left = Math.max(0, total - tipsSent - (jobs?.n ?? 0));
  if (list === "jobs") return left;
  return Math.min(left, Math.max(0, Math.ceil(total * OPTIONAL_EMAILS.tipsShare) - tipsSent));
}
