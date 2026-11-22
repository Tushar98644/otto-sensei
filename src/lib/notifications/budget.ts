import { count, gt } from "drizzle-orm";
import { getDb, type Db } from "@/db/client";
import { emailLog } from "@/db/schema";
import { HOUR_MS } from "@/lib/time";

// Sign-in codes and trial notices go through the same Resend account (about 100 a day on its free tier), so a one-time service notice stays well under it.

const OPTIONAL_EMAILS = {
  perDay: 25,
  // Shorter than a day, so yesterday's run at the same hour never counts against today's.
  windowMs: 20 * HOUR_MS,
} as const;

// OPTIONAL_EMAILS_PER_DAY raises it on a paid Resend plan; 0 stops optional emails.
function optionalEmailsPerDay(): number {
  const raw = process.env.OPTIONAL_EMAILS_PER_DAY?.trim();
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isInteger(value) && value >= 0 ? value : OPTIONAL_EMAILS.perDay;
}

// Counted from what went out lately, so a repeated run can't add more.
export async function optionalEmailRoom(now: number, database?: Db): Promise<number> {
  const db = database ?? (await getDb());
  const [sent] = await db
    .select({ n: count() })
    .from(emailLog)
    .where(gt(emailLog.createdAt, now - OPTIONAL_EMAILS.windowMs));
  return Math.max(0, optionalEmailsPerDay() - (sent?.n ?? 0));
}
