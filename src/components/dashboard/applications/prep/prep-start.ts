import type { Usage, UsagePeriod } from "@/config/plans";
import { fmt } from "@/i18n/format";
import { formatFor, type Format } from "@/i18n/intl";
import EN_APP from "@/i18n/messages/en/app";
import type { Messages } from "@/i18n/messages";
import { usageCopy } from "@/lib/usage-copy";

const EN_FORMAT = formatFor("en");

// What one prep costs from the letter allowance; English unless the reader's words are given.
export function prepAllowance(
  usage: Usage | null | undefined,
  period?: UsagePeriod | null,
  words: Messages["app"] = EN_APP,
  format: Format = EN_FORMAT,
): string | null {
  if (!usage || usage.limit <= 0) return null;
  const left = Math.max(0, usage.limit - usage.used);
  const copy = usageCopy(words.usage, format);
  const feature = words.features.letter;
  const pool = fmt(words.usage.pool, { count: format.number(usage.limit), feature });
  const values = { pool, period: copy.thisPeriod(period) };
  if (left === 0) return fmt(words.usage.usedAll, { ...values, reset: copy.resetSentence(period) });
  return fmt(words.usage.usesOne, { ...values, left: format.number(left) });
}

export type StartFacts = {
  // The link carried ?start=1, as "Move and prepare" does; a plain link or bookmark never spends allowance.
  asked: boolean;
  pro: boolean | null;
  usage: Usage | null | undefined;
  resumes: number;
  jobKnown: boolean;
};

// Prep only starts by itself when it was asked for and can run: Pro, room left and a job to read.
export function startsByItself({ asked, pro, usage, resumes, jobKnown }: StartFacts): boolean {
  if (!asked || pro !== true || !jobKnown || resumes === 0) return false;
  return !usage || usage.used < usage.limit;
}

// What Otto knows when the post can't be read: said as a fact, long enough for the request's minimum.
export function titleOnlyPost({ role, company }: { role: string; company: string }): string | null {
  const title = role.trim();
  if (!title) return null;
  const job = company.trim() ? `${title} at ${company.trim()}` : title;
  return `${job}.\n\nOnly the job title and company are known for this job: its full post couldn't be read.`;
}
